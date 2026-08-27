# AI prompt log

**Tool used:** Claude Code , model Claude Opus 5, in a single working

---

## 1. Scaffold the whole system from the brief

**Prompt.** The assignment brief, verbatim, as the opening message.

**What the model produced.** The full skeleton: Django project with `accounts`
and `catalog` apps, DRF viewsets, SimpleJWT wiring, a GitHub OAuth
code-exchange, a React/Vite SPA, `docker-compose.yml` with db/backend/frontend/
proxy, and the booking service with `select_for_update`.

**What I kept.** The overall layout, and the decision to put every booking
mutation in `catalog/services.py` instead of in the viewset.

**What I changed.**

- Renamed the sessions app to `catalog`. An app called `sessions` collides with
  `django.contrib.sessions` in `INSTALLED_APPS` and in imports — a mess that is
  cheap to avoid at minute one and expensive later.
- Rejected the initial "check `count()` then create" booking logic (see #2).
- Rejected `pytest` + `pytest-django` as a test dependency once the pin turned
  out to be hallucinated (see "What AI got wrong" #1).

**How I verified.** `docker compose build && docker compose up -d`, then
`curl localhost:8080/api/healthz/` and the frontend root; both 200.

---

## 2. Booking correctness under concurrency

**Prompt.** "Two users race for the last seat. Where exactly does the
serialisation happen, and what does the database enforce on its own if the
application logic is wrong?"

**What the model produced.** `select_for_update()` on the session row plus a
partial unique index on `(session, user) WHERE status='active'`.

**What I kept.** Both, and the `Conflict` exception subclasses with stable
codes so the client can tell `session_full` from `already_booked`.

**What I added myself.** Neither of those makes overselling *unrepresentable*
in the database, which is what I actually wanted — a row lock is a convention
that any future code path can forget. So I added the denormalised `seats_taken`
column with `CHECK (seats_taken <= capacity)`, plus the redundant
`WHERE seats_taken < capacity` guard on the increment as a tripwire. The
reasoning and the drift trade-off are written up in DECISIONS.md #1 and #2.

**How I verified.** Wrote `tests/test_booking_concurrency.py` (8 threads on a
1-seat session, released together by a `threading.Barrier`), then deliberately
broke the implementation to confirm the test can fail — see DEBUGGING.md #1.
Then `scripts/race_check.py` to prove the same thing over real HTTP through
Nginx and 3 Gunicorn workers: `1 x 201`, `7 x 409 session_full`.

---

## 3. Making the app reviewable without my GitHub OAuth secret

**Prompt.** "A reviewer runs `docker compose up --build` with no GitHub OAuth
app registered. What do they see, and how do I make the app usable without
weakening the real auth path?"

**What the model produced.** A `DEV_FAKE_OAUTH` flag that short-circuits the
provider call for codes prefixed `dev:`.

**What I kept.** The approach, because everything after the branch — user
lookup/creation, JWT issuance, role enforcement — is the same code the real
provider path runs, so the fake login exercises the real system.

**What I changed.** The model's first version returned an authorize URL with an
empty `client_id`, which bounces the user to a GitHub error page. I made
`/api/auth/github/login-url/` return `503 oauth_unconfigured` when no client id
is set, and had the login page render a specific message pointing at the dev
sign-in. I also tightened the comments at both the flag definition and its use,
because a login backdoor deserves to be one `grep` away.

**How I verified.** `curl localhost:8080/api/auth/github/login-url/` → `503
{"detail": "GitHub OAuth is not configured on the server.", "code":
"oauth_unconfigured"}`.

---

## 4. Authorization test cases

**Prompt.** "Write tests for: expired token, garbage token, a User calling a
Creator endpoint, a Creator editing another Creator's session. Assert the
status code *and* the error code, not just that it is not 200."

**What the model produced.** `tests/test_authorization.py`, using
`AccessToken.for_user()` with `set_exp()` in the past to forge an expired token
rather than sleeping out a real expiry.

**What I kept.** All of it — the expired-token technique is better than what I
would have written (no `time.sleep`, no settings override).

**What I added.** Two cases it did not think of:
`test_creator_cannot_reassign_a_session_to_someone_else` (proving `creator` is
read-only on the serializer, so ownership cannot be transferred by a crafted
`PATCH`), and `test_roster_is_visible_only_to_the_owning_creator`.

**How I verified.** `manage.py test tests` → 24 passed, including a run with
`-v 2` to confirm each authorization test hits the endpoint it claims to
(`Forbidden: /api/sessions/3/`, `Unauthorized: /api/sessions/`).

---

## 5. Token refresh in the SPA

**Prompt.** "The access token expires after 30 minutes. What happens if three
API calls 401 at the same moment, given refresh rotation is on?"

**What the model produced.** A single-flight refresh in
`frontend/src/lib/api.js`: concurrent 401s share one in-flight refresh promise
and then retry once.

**What I kept.** The single-flight design — with `ROTATE_REFRESH_TOKENS=True`,
three parallel refreshes mean two of them present an already-rotated token and
log the user out for no reason.

**What I changed.** Narrowed the retry to `code === 'token_not_valid'`. The
first version retried on any 401, which would loop on genuinely unauthenticated
requests.

**How I verified.** Reasoned through it against the backend contract and
confirmed the backend emits `token_not_valid` for expired tokens
(`test_expired_token_is_401_not_403` asserts exactly that code).

---

## 6. Rebuilding the UI against the supplied Stitch design

**Prompt.** The design export (twelve `code.html` screens plus a `DESIGN.md`
token sheet) with: "Implement the frontend according to this design."

**What the model produced.** The design tokens transcribed into
`frontend/tailwind.config.js` under their own names (colours, the ten-step type
scale, the 4px spacing rhythm, the three elevation levels, the shape scale), a
small component layer (`Button`, `Badge`, `Card`, `Banner`, `Field`,
`EmptyState`, `Toast`, `Avatar`, `Cover`), and all twelve screens rebuilt on
top of it.

**What I kept.** The token transcription — it is mechanical, and having the
design's own names in the config means a class in the export means the same
thing in this codebase.

**What I changed.**

- **Rejected the Material Symbols webfont** the export uses for icons. A
  ligature font that fails to load renders its source text, so the UI would
  read "calendar_today schedule group". Replaced with hand-drawn inline SVG
  (DECISIONS.md #8).
- **Refused to fake the data the design implies.** The first pass rendered
  4.9★ ratings, a fixed itinerary, "Zoom link provided" and Draft/Published
  badges — all invented. I dropped every element with no data source and mapped
  the rest to real state (DECISIONS.md #7). The topic pills became All / Seats
  left / Free, which the API can actually honour.
- **Added `Session.cover_url`** rather than either hard-coding stock photos or
  dropping cover art: an optional field with a deterministic gradient fallback
  keyed by session id.

**How I verified.** Screenshotted every route in headless Chrome over the
DevTools Protocol against a seeded stack (`scripts/seed_demo.py`), at 1440px
and at 390px. That is how #5 below was found.

---

## What AI got wrong / what I corrected

### 1. A confidently invented dependency version (`pytest-django==8.0.0`)

The generated `requirements.txt` pinned `pytest-django==8.0.0`. That release
does not exist — the package is on 4.x. The pin looked entirely plausible next
to `pytest==8.2.2`, which is real; the model appears to have copied the major
version across from the neighbouring line.

It failed only inside `docker compose build`, because the local virtualenv I
used for `makemigrations` never installed the test extras:

```
ERROR: Could not find a version that satisfies the requirement pytest-django==8.0.0
```

I did not just fix the number. All the tests are plain Django `TestCase` /
`TransactionTestCase` classes, so pytest was buying nothing — the concurrency
tests specifically need `TransactionTestCase`, which is Django's, not pytest's.
I removed both packages and standardised on `python manage.py test tests`.
Verified by a clean rebuild and a full green run. Full write-up in
DEBUGGING.md #2.

### 2. A comment that stated a concurrency guarantee the code did not provide

The model wrapped `Booking.objects.create()` in a nested `transaction.atomic()`
with the comment *"an IntegrityError would otherwise poison the outer
transaction and turn a 409 into a 500."* That is real Django behaviour and it
reads authoritative — but it is not true of *this* code path, which re-raises
immediately, so the outer block simply rolls back.

I tested it instead of believing it: deleted the nested block, copied the file
into the running container, ran `test_double_booking_is_rejected` — still
passed, still returned `already_booked`.

I kept the savepoint (it is nearly free, and it protects the day someone adds a
query after the `except`) but rewrote the comment to say what is actually true
and point at the experiment. An inaccurate comment about transaction semantics
is worse than none: the next person changes surrounding code trusting a
guarantee that was never there. DEBUGGING.md #3.

### 3. A green test that proved less than it appeared to

The first full run was 24/24 green, including the race test. I did not trust a
race test that had never been seen to fail, so I removed
`select_for_update()` and re-ran — **and it still passed**, because the
conditional `UPDATE ... WHERE seats_taken < capacity` was silently carrying the
invariant on its own.

The model had written a test that asserts the invariant; I had assumed it
demonstrated the *mechanism*. Only after removing two layers (lock *and*
conditional update) did it fail — with `IntegrityError` from the CHECK
constraint, which is itself the useful result: naive application code cannot
oversell this schema, it can only 500. That experiment is why DECISIONS.md #1
can describe each layer's actual job rather than asserting a design.
DEBUGGING.md #1.

### 4. A UI state that the API could not support

The rebuilt session page rendered a live "Book this session" button to a user
who already held an active booking for it — a click that could only return
`409 already_booked`. Neither the model nor the tests flagged it, because the
API *was* correct: it rejected the duplicate exactly as designed. The defect
was that the session payload carried no per-viewer state at all, so the client
could not know.

I found it by screenshotting the authenticated routes with seeded data rather
than trusting a green suite, then fixed the contract instead of the component:
a `my_booking` field fed by a `Prefetch(..., to_attr=...)` scoped to the
requesting user — one extra query per page, not one per card, which is what the
obvious `.filter().first()` in the serializer method would have cost. Covered
by a new test for all four cases. DEBUGGING.md #6.

### 5. Implicit ordering assumed to survive `annotate()`

The catalog viewset relied on `Session.Meta.ordering` and then appended
`.annotate(Count(...))`. Django reports a grouped queryset as unordered, so DRF
warned about unstable pagination — and with equal `starts_at` values the paging
really is unstable. Fixed with an explicit `.order_by(order, "id")` including a
tiebreak. DEBUGGING.md #4.

---

## Where AI helped most, and where it needed the most supervision

**Most useful:** boilerplate with a well-known shape — DRF viewset/serializer
wiring, the SimpleJWT configuration, the multi-stage frontend Dockerfile, the
Nginx proxy config, and the threading harness for the race test. All of it was
faster to review than to write.

**Needed the most supervision:** anything where correct-looking output and
correct output diverge — dependency pins, comments asserting concurrency
semantics, and tests whose green result is not evidence for the claim being
made. The pattern across all four corrections above is the same: the model is
reliable at producing the *shape* of a correct answer and unreliable at the
facts inside it, so every load-bearing claim in this repo has a command next to
it that I actually ran.

---

## 8. Password Auth, Permanent Role Locking, Human Typography & Floating Navbar

**User prompts.**
- *"add id password in this"* & *"this thing i need The auth card now cleanly focuses on Google/GitHub Single Sign-on and Username/Email + Password Authentication."*
- *"see i need one as a user and as a client i dont wanr rgar user switch to ceator"*
- *"because of gradient and all it look like ai genreted and also chNGE TEXT"*
- *"change nav bar to more asthetic"* & *"why this gap you created change navbar thing arrange like that so when i seee it look good"*

**Key changes.**
- **Backend & Frontend Password Auth**: Added `RegisterView` (`POST /api/auth/register/`) and `PasswordLoginView` (`POST /api/auth/login/`) in `accounts/views.py` and `PasswordRegister` / `PasswordLogin` in `auth.jsx`.
- **Permanent Role Locking**: Updated `ProfileUpdateSerializer` in `serializers.py` so account roles (`User / Learner` vs `Host / Creator`) are set during registration/onboarding and permanently locked (`role_chosen = True`). Removed role switcher from `Profile.jsx`.
- **Human Typography & Solid Aesthetic**: Replaced gradient text titles and ambient blur orbs with solid, human-crafted typography (`text-emerald-400`). Updated copy across hero banner and search fields.
- **Floating Glass Top Navigation Bar**: Redesigned `TopNav` into a floating translucent bar with pill tabs, subtle search input, and profile account menu. Removed double top margin padding (`pt-[72px]`) to align page content directly below the navbar.

**Verification.**
- Rebuilt backend and frontend Docker containers (`docker compose up -d --build`).
- Verified zero errors on `npm run build` and clean container execution.
