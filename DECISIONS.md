# Engineering decisions

Decisions the brief left open, plus the reasoning and the cost of each choice.
Decisions the brief forced (Django/DRF, PostgreSQL, OAuth + JWT, Docker
Compose) are not listed.

---

## 1. Where the "never oversubscribed" invariant lives

**Ambiguity.** The brief requires that concurrent bookings can never exceed
capacity, but not where the guarantee is enforced. Django gives at least four
plausible places: the serializer, a `SELECT ... FOR UPDATE` row lock, an
optimistic conditional `UPDATE`, or a database constraint.

**Options considered.**

| Option | Why it is tempting | Why it fails or costs |
|---|---|---|
| Check `Booking.objects.count() < capacity` in the view | Simplest to write | Classic check-then-act: both requests read 0/1 before either writes. Broken under any real concurrency. |
| `SELECT ... FOR UPDATE` on the session row | Serialises all bookings for one session; trivially correct | Writers on the same session queue up (fine: contention is per-session, not global) |
| Optimistic `UPDATE ... WHERE seats_taken < capacity` and check rowcount | No lock wait | Correct, but the caller must distinguish "lost the race" from "not found", and any multi-statement work (create booking + increment) still needs a transaction |
| `CHECK (seats_taken <= capacity)` alone | Database is the ultimate authority | Rejects the write with an `IntegrityError`, i.e. a 500 unless every caller wraps it — bad UX as the *primary* mechanism |

**Choice.** Defence in depth, with clearly separated roles:

- **Database (`catalog/models.py`)**
  - `CHECK (seats_taken <= capacity)` — `session_not_oversubscribed`
  - `CHECK (capacity >= 1)` — `session_capacity_positive`
  - partial unique index on `(session, user) WHERE status = 'active'` —
    `uniq_active_booking_per_user_session`
- **Application, inside one transaction (`catalog/services.py`)**
  - `SELECT ... FOR UPDATE` on the session row, then capacity check, then
    booking insert, then `seats_taken = seats_taken + 1` guarded by
    `WHERE seats_taken < capacity`.

The row lock produces the *good* behaviour (a clean 409 with a specific code),
and the constraints are the backstop that makes a bad state unrepresentable if
someone later adds a second code path — a management command, an admin action,
a bulk import — that forgets the lock. The redundant `WHERE seats_taken <
capacity` on the increment is unreachable while the lock is held; it is a
tripwire so a refactor that drops the lock fails loudly instead of silently
overselling.

**Trade-off.** `seats_taken` is denormalised: it duplicates
`COUNT(bookings WHERE active)`. That is a real risk of drift, accepted
deliberately, because a `CHECK` constraint cannot reference an aggregate over
another table — without the column the database cannot enforce capacity at all,
only application code can. Drift is contained by routing every mutation through
`services.py` and by asserting count-vs-counter agreement in the tests.

**Why a frontend `remainingSeats` check is not enough.** It is a cache of a
value that another user is concurrently changing, and it lives on the wrong
side of the trust boundary:

1. **It is always stale.** `seats_remaining` was true when the page was
   rendered. Between render and click, someone else can take the seat. The
   button being enabled proves nothing about the present.
2. **The gap is unavoidable.** Even a check performed one millisecond before
   the request is a check-then-act across the network; the decision and the
   write are not atomic, and no amount of client polling closes that window.
3. **The client is not trusted.** `curl`, a replayed request, a modified
   bundle, or a script skips the UI entirely. Anything not enforced server-side
   is not enforced.
4. **Two honest clients still collide.** Both may legitimately read
   `remainingSeats: 1`. Only a serialisation point *behind* both of them — the
   database row lock — can pick a winner.

The frontend check is kept, but strictly as UX: it prevents a pointless request
and shows "Sold out" early. The server treats every request as if the client
never checked, and the UI treats a 409 as a normal outcome (show the message,
refetch the session) rather than an error state.

---

## 2. Denormalised `seats_taken` instead of counting bookings per request

**Problem.** Given the decision above, capacity could still be evaluated as
`SELECT COUNT(*) FROM booking WHERE session_id = ? AND status = 'active'`
under the same row lock. That is correct too, and it has no drift risk.

**Options.** (a) Count on every read and write. (b) Keep a counter column.

**Choice.** Counter column. The catalog list is the hottest path in the app and
renders `seats_remaining` for every card; counting would mean an aggregate join
per listing, and more importantly a `COUNT` cannot participate in a `CHECK`
constraint, which is what makes the invariant enforceable by PostgreSQL rather
than by convention.

**Trade-off.** Two sources of truth that can diverge if a booking is ever
created or cancelled outside `services.py`. Mitigations: all mutations funnel
through two functions; the tests assert that the counter and the actual active
booking count agree after a race; cancellation decrements under the same lock
and in the same order. If this grew further I would add a periodic
reconciliation job that recomputes counters and alerts on mismatch, rather than
trusting the invariant to hold forever.

---

## 3. Cancellation frees the seat, and re-booking is allowed

**Ambiguity.** The brief says "prevent the same user from *actively* booking
the same session twice" and asks for active/past bookings, which implies
cancellation exists — but does not say whether a cancelled seat returns to the
pool, or whether a user who cancelled may book again.

**Options.**

- Hard-delete the booking row on cancel. Simple, but destroys history: "past
  bookings" then cannot show what was cancelled, and there is no audit trail.
- Keep the row, block re-booking forever (unique on `(session, user)`).
  Punishes a misclick permanently.
- Keep the row with a status, free the seat, allow re-booking while seats
  remain.

**Choice.** The third. `Booking` is append-mostly: cancelling sets
`status='cancelled'` and `cancelled_at`, and decrements `seats_taken` under the
session lock. The uniqueness constraint is therefore *partial* — unique on
`(session, user)` only `WHERE status = 'active'` — which is exactly the
invariant the brief states, no more.

**Trade-off.** A partial unique index is PostgreSQL-specific (Django emits it
as a conditional `UniqueConstraint`); this schema would need rework on MySQL.
Given PostgreSQL is mandated, spending that portability to get the constraint
enforced by the database rather than by a `.exists()` check is worth it. The
cost is that `bookings` accumulates cancelled rows, and a "seats sold" report
must remember to filter on status.

---

## 4. Role upgrades are self-service, and enforced only server-side

**Ambiguity.** The brief requires User and Creator roles and backend
enforcement, but says nothing about how anyone *becomes* a Creator. There is no
admin flow, no verification, and no payments in scope.

**Options.** Seed creators via fixtures/admin only (realistic, but a reviewer
cannot create a session without opening Django admin); ask for the role during
OAuth sign-up (an extra onboarding screen that adds no engineering signal); or
let a user switch role from their profile.

**Choice.** Self-service from the profile page: `PATCH /api/auth/me/` accepts
`role`. The important part is that this changes *nothing* about enforcement.
`IsCreatorOrReadOnly` re-reads `request.user.role` from the database on every
write, and `IsSessionOwner` compares `obj.creator_id` per object. The UI hides
creator links, but `tests/test_authorization.py` asserts the API refuses a
plain user's `POST /api/sessions/` (403) and a rival creator's
`PATCH`/`DELETE` of someone else's session (403), independent of the UI. Role
is never read from the JWT payload, so a stale token cannot carry stale
authority.

**Trade-off.** Anyone can self-promote, which would be wrong in production —
there it would be an application review, a Stripe onboarding, or an admin
grant. Downgrading is blocked while the user still owns sessions, so the
orphaned-session case cannot be reached. The role check is one extra DB read
per write request (already loaded by JWT authentication, so effectively free).

---

## 5. GitHub OAuth, with a fenced dev sign-in for reviewers

**Problem.** The reviewer must be able to run `docker compose up --build` and
see the app work. A real OAuth flow requires *them* to register a GitHub OAuth
app and paste a client secret before anything is clickable, and shipping my own
secret in the repo is not an option.

**Options.** Require real credentials (blocks a cold review); ship a seeded
password login (adds a second, weaker auth path that contradicts "OAuth only");
or add an explicitly fenced fake-provider branch.

**Choice.** The real GitHub flow is the default path and is fully implemented:
`GET /api/auth/github/login-url/` (the client id and secret never leave the
backend) → GitHub → `/auth/callback` in the SPA → `POST
/api/auth/github/callback/` exchanges the code server-side and returns our own
JWT pair. Separately, when `DEV_FAKE_OAUTH=True`, a code of the form
`dev:<handle>` short-circuits the provider call and creates/returns that user.

The fence is deliberate: it is a single environment flag, it is off in
`.env.example` semantics (documented as local-only), it only triggers on a
`dev:` prefix, and everything after the branch — user creation, JWT issuance,
role checks — is the identical code path the real provider uses.

**Trade-off.** A backdoor in the auth system is a genuine risk; if the flag
were ever true in production, anyone could mint a token for any handle. That is
why it is one grep away (`DEV_FAKE_OAUTH`), defaults to `False` in
`settings.py`, and is loudly commented at both definition and use. In a real
deployment I would delete the branch and use a seeded staging OAuth app
instead.

---

## 6. Uniform error envelope from a custom DRF exception handler

**Problem.** DRF emits at least three error shapes: `{"detail": "..."}` for
permissions/auth, `{"field": ["message"]}` for serializer validation, and
occasionally a bare list. The frontend needs one renderer and, for booking, a
*machine-readable* reason to distinguish "sold out" from "already booked" from
"already started" — all of which are 409.

**Options.** Handle every shape in the client; return HTTP status only; or
normalise server-side.

**Choice.** `config/exceptions.py` flattens everything to
`{"detail": str, "code": str}`, and the booking conflicts are distinct
`APIException` subclasses with stable codes (`session_full`, `already_booked`,
`session_started`, `own_session`). The client renders `detail` and branches on
`code` — notably `token_not_valid`, which is what triggers the single-flight
refresh in `frontend/src/lib/api.js`.

**Trade-off.** Field-level validation detail is collapsed into one string
(`"capacity: Capacity must be at least 1."`), so a large form cannot highlight
several fields at once. Acceptable for forms this size; if the app grew I would
keep the flat `detail` for display and add an optional `errors` object
alongside it rather than reverting to raw DRF shapes.

---

## 7. Implementing the supplied design without inventing data

**Problem.** The Stitch export
(`stitch_session_management_portal/`) specifies twelve screens for a product
called **BookSync**. Several of them show data this system does not have:
topic categories (Design / Code / Business), star ratings with review counts, a
per-session itinerary, a waitlist with queue positions, notifications, Stripe
checkout, and "Draft vs Published" states.

**Options.**

- **Build the UI exactly as drawn**, filling the gaps with hard-coded strings.
  Highest visual fidelity, but the screens would lie: a 4.9★ rating nobody
  computed, a "Draft" badge that means nothing.
- **Drop every element without a data source.** Honest, but throws away
  structure the design got right — the stats row, the availability badges, the
  attendee roster.
- **Map each element to the nearest real thing, and drop the rest.**

**Choice.** The third, applied element by element:

| Design element | Decision |
|---|---|
| Topic pills (Design / Code / …) | Replaced with filters the API can honour: All / Seats left / Free — same pill component, real behaviour |
| Cover images on cards and hero | Added `Session.cover_url` (optional) with a deterministic gradient fallback keyed by session id, so every card has art without an external service |
| Creator avatars | Real: `avatar_url` comes from the OAuth profile; initials fallback |
| Ratings, itinerary, "Zoom link provided" | Dropped — no data, and inventing it would misrepresent the product |
| Waitlist, "Admit to session", "Message all" | Dropped — no such feature; the roster shows real confirmed bookings |
| "Draft / Published" status | Mapped to states that exist: Open / Full / Started |
| Revenue (MTD) stat | Computed as booked value (`seats_taken × price`) from the creator's own sessions |
| Notifications bell | Dropped — no notification backend |
| Google sign-in button | Dropped — the backend implements GitHub; the dev sign-in occupies the design's "or continue with email" slot |

**Trade-off.** The result is not a pixel-for-pixel reproduction of every
screen: three of the twelve show features that do not exist here. What is
reproduced exactly is the design *system* — the colour tokens, the type scale,
the 4px spacing rhythm, the elevation levels, the shape language and the
component behaviours (floating labels, pill badges, bottom-right toasts,
tonal cards), all transcribed into `frontend/tailwind.config.js` under the
design's own token names. A future screen built from those tokens lands in the
same visual language without re-deriving it.

---

## 8. Inline SVG icons instead of the Material Symbols webfont

**Problem.** The export renders every icon as a Material Symbols ligature
(`<span class="material-symbols-outlined">calendar_today</span>`) loaded from
Google Fonts. That has a specific failure mode: if the font does not load —
offline review, blocked CDN, slow first paint — the browser renders the
ligature's *source text*, so the UI reads "calendar_today schedule group"
instead of showing icons.

**Options.** Ship the webfont as the design does; self-host the font
(~200KB for glyphs we barely use, plus a build step); or draw the ~20 icons
actually needed as inline SVG.

**Choice.** An `Icon` component with hand-drawn 24px outlined strokes
(`frontend/src/components/Icon.jsx`). No network dependency, no flash of
literal text, no unused glyphs, and they inherit `currentColor` so the tonal
palette applies to them for free.

**Trade-off.** These are not Material's exact paths, so an icon here can differ
in detail from the mockup, and adding a new icon means drawing it rather than
typing its name. Plus Jakarta Sans *is* still loaded from Google Fonts, but a
missing typeface degrades to the system sans stack — a visual downgrade, not a
broken interface, which is the difference that decided this.
