# BookSync — Sessions Marketplace

A marketplace where people sign in with GitHub, browse and book live sessions,
and creators publish and manage their own. Django + DRF + PostgreSQL behind an
Nginx reverse proxy, a React SPA built to the supplied design system, all under
one Docker Compose command.

The interesting part is the booking path: a session with one seat left, hit by
several requests at once, confirms exactly one booking. How that is enforced —
and why a frontend seat check cannot do it — is in
[DECISIONS.md](DECISIONS.md), with the experiments that back it in
[DEBUGGING.md](DEBUGGING.md).

---

## Run it

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env      # works as-is for local review
docker compose up --build
```

Then open **http://localhost:8080**.

Everything is served from that one origin: `/` is the SPA, `/api/` is Django,
`/admin/` is Django admin.

Optional, for a populated UI — two creators, five sessions, a spread of
bookings:

```bash
python scripts/seed_demo.py         # stdlib only, safe to re-run
```

### Signing in

`.env.example` ships with `DEV_FAKE_OAUTH=True` so the app is usable
immediately: the sign-in page has a **dev sign-in** field — type any handle and
you are signed in as that user, through the same code path (user creation, JWT
issuance, role checks) the real provider uses. After seeding, sign in as
`elena-rostova` or `marcus-chen` for the creator experience, or
`aiko-tanaka` for a user with bookings.

To use the real GitHub flow instead:

1. Create an OAuth app at <https://github.com/settings/developers> with
   **Authorization callback URL** `http://localhost:8080/auth/callback`.
2. Put `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env`, set
   `DEV_FAKE_OAUTH=False`, and `docker compose up -d --build backend`.

With no client id configured, `GET /api/auth/github/login-url/` returns
`503 oauth_unconfigured` and the login page says so rather than bouncing you to
a broken GitHub page.

### Becoming a creator

New accounts are `user`. Open **Account settings** and switch the role to
Creator to get the dashboard. This is self-service by design in this build (see
DECISIONS.md #4) and it changes nothing about enforcement: the API re-checks the
role from the database on every write.

---

## Tests

```bash
docker compose exec backend python manage.py test tests
```

25 tests, no extra dependencies (Django's own runner — see DEBUGGING.md #2).

| File | Covers |
|---|---|
| `tests/test_booking_concurrency.py` | the race: 8 threads / 1 seat, 12 threads / 3 seats, and one user double-clicking |
| `tests/test_booking_rules.py` | double booking, already-started session, own session, cancel-and-rebook, the DB CHECK backstop, the 409 shape, per-viewer booking state |
| `tests/test_authorization.py` | missing / malformed / expired token, User vs Creator endpoints, cross-creator edit and delete, roster visibility, role downgrade |

### Proving booking correctness over real HTTP

The unit tests race the service layer in threads. This script races the
**running stack** — through Nginx, across 3 Gunicorn workers, over real
sockets:

```bash
python scripts/race_check.py --seats 1 --clients 8
```

```
session 1 created with capacity 1

8 simultaneous booking attempts for 1 seat(s)
    1 x 201 created
    7 x 409 session_full

seats_taken reported by API: 1
201 responses:               1

RESULT: PASS - capacity respected
```

It exits non-zero if the count is ever wrong. `--seats 3 --clients 15` gives
`3 x 201`, `12 x 409`. Only stdlib needed; requires `DEV_FAKE_OAUTH=True`.

---

## Architecture

```
browser ──▶ proxy (nginx :8080)
              ├── /api/, /admin/, /static/ ──▶ backend  (gunicorn, Django 5 + DRF)
              └── /                        ──▶ frontend (nginx serving the Vite build)
                                                   │
                                              backend ──▶ db (postgres:16, volume "pgdata")
```

Four containers, as required. Only the proxy publishes a host port; backend,
frontend and db talk over the compose network, so the database is not reachable
from the host at all.

**Backend** (`backend/`)

- `config/` — settings, URLs, and `exceptions.py`, which flattens every DRF
  error to `{"detail", "code"}` so the SPA has one renderer and can branch on
  machine-readable codes (`session_full`, `already_booked`, `token_not_valid`).
- `accounts/` — custom `User` (role, display name, bio, OAuth identity),
  GitHub code exchange in `oauth.py`, JWT issuance, `GET/PATCH /api/auth/me/`.
- `catalog/` — `Session` and `Booking` models with the capacity and uniqueness
  constraints, `services.py` (the only place bookings are mutated),
  `permissions.py` (`IsCreatorOrReadOnly`, `IsSessionOwner`), viewsets.

**Auth flow.** SPA → `GET /api/auth/github/login-url/` (client id and secret
never leave the backend) → GitHub → `/auth/callback` in the SPA →
`POST /api/auth/github/callback/` exchanges the code server-side and returns
our own access + refresh JWTs. The SPA stores them, sends
`Authorization: Bearer …`, and refreshes on `token_not_valid` with a
single-flight guard (refresh rotation is on, so parallel refreshes would log
the user out).

**Authorization is entirely server-side.** The UI hides creator links, but
`IsCreatorOrReadOnly` re-reads the role from the database per write and
`IsSessionOwner` compares `creator_id` per object. Role is never read from the
JWT payload, so a token issued before a role change carries no stale authority.
`tests/test_authorization.py` asserts each of these against the API directly.

### API

| Method | Path | Auth |
|---|---|---|
| GET | `/api/healthz/` | public |
| GET | `/api/auth/github/login-url/` | public |
| POST | `/api/auth/github/callback/` | public — returns `{access, refresh, user}` |
| POST | `/api/auth/refresh/` | refresh token |
| GET/PATCH | `/api/auth/me/` | user |
| GET | `/api/sessions/` | public — `?when=upcoming\|past`, `?mine=1`, `?q=` |
| GET | `/api/sessions/{id}/` | public — includes `my_booking` for the signed-in viewer |
| POST/PATCH/DELETE | `/api/sessions/{id}/` | creator, own sessions only |
| GET | `/api/sessions/{id}/bookings/` | owning creator only |
| GET | `/api/bookings/` | user — `?scope=active\|past` |
| POST | `/api/bookings/` | user — `{session_id}`; 409 on conflict |
| POST | `/api/bookings/{id}/cancel/` | owner of the booking |

### Data persistence

PostgreSQL data lives in the named Docker volume `pgdata`, mounted at
`/var/lib/postgresql/data`. It belongs to the volume, not to any container's
writable layer, so rebuilding or restarting the app containers — or the db
container itself — leaves the data intact:

```bash
docker compose down && docker compose up -d   # session count unchanged
```

Only `docker compose down -v` (or `docker volume rm ahoum_pgdata`) destroys it.
Migrations run automatically on backend start, before Gunicorn binds.

---

## Design system

The frontend implements the supplied Stitch export in
`stitch_session_management_portal/`. Its tokens are transcribed under their own
names into `frontend/tailwind.config.js` — colours (`primary #00685f`,
the `surface-container-*` tonal ramp, `on-*` pairs), the ten-step type scale
(`text-headline-lg`, `text-body-md`, `text-label-sm`…), the 4px spacing rhythm
(`p-md`, `gap-gutter`, `px-margin_desktop`), three elevation levels and the
shape scale — so a class in the export means the same thing in this codebase.
Typeface: Plus Jakarta Sans.

| Design screen | Implemented as |
|---|---|
| `landing_sign_in` | `pages/Login.jsx` — split brand panel + auth card |
| `oauth_callback_state` | `pages/AuthCallback.jsx` — loading and failure cards |
| `session_catalog` | `pages/Catalog.jsx` — filter pills, cover art, availability badges |
| `session_detail_page` | `pages/SessionDetail.jsx` — two-column with sticky booking sidebar |
| `booking_confirmation_feedback` | confirmation modal + bottom-right error toast (`components/Toast.jsx`) |
| `my_bookings` | `pages/MyBookings.jsx` — Active/Past tabs |
| `creator_dashboard` | `pages/CreatorDashboard.jsx` — stat cards + session table with seat meters |
| `session_bookings_view` | `pages/SessionAttendees.jsx` — attendee roster with search |
| `create_edit_session_form` | `pages/SessionForm.jsx` — floating-label form |
| `profile_page` | `pages/Profile.jsx` — bento layout + role switcher |
| `403_401_error_state` | `AccessDenied` in `App.jsx`, reused for 403 and 404 |
| `empty_states_catalog_bookings` | `EmptyState` in `components/ui.jsx` |

Two deliberate departures, both argued in DECISIONS.md #7 and #8: elements with
no data behind them (ratings, itineraries, waitlists, notifications) are
dropped rather than faked, and the Material Symbols webfont is replaced with
inline SVG icons so a failed font load cannot render `calendar_today` as text.

Every screen was verified by screenshot in headless Chrome against seeded data,
at 1440px and 390px.

---

## Known limitations

- **Role upgrade is self-service.** Anyone can become a creator from their
  profile. Real onboarding (review, payouts, admin grant) is out of scope;
  enforcement of what a creator may do is not (DECISIONS.md #4).
- **`DEV_FAKE_OAUTH` is a real backdoor.** It exists so this can be reviewed
  without registering an OAuth app. `False` by default in `settings.py`; it
  must never be `True` anywhere real.
- **`seats_taken` is denormalised.** Protected by a CHECK constraint and a
  single mutation path, but it duplicates `COUNT(active bookings)` and could
  drift if a future code path bypasses `services.py`. No reconciliation job
  yet.
- **Refresh tokens live in `localStorage`**, which is XSS-reachable. A
  httpOnly, SameSite refresh cookie would be better; it needs CSRF handling
  that a client-side-only SPA brief did not call for.
- **No blacklist on sign-out.** Signing out drops the tokens client-side; the
  access token stays valid until it expires (default 30 minutes).
- **Deleting a session cascades its bookings** and does not notify attendees.
  Nothing warns the creator beyond a browser `confirm()`.
- **No payments**, despite `price_cents`. Booking a paid session is free.
- **Cover images are URLs, not uploads** — no storage, no validation beyond
  `URLField`, and a broken link falls back to the generated gradient.
- **Pagination is offset-based**, catalog filters (Seats left / Free) are
  applied client-side within the current page, and there is no timezone
  selector — times render in the browser's local zone.
- **No frontend tests.** All automated testing is backend; the SPA was verified
  by screenshot and by `curl` against the built container.

## With another day

1. **Reconciliation + observability for `seats_taken`.** A management command
   that recomputes counters from bookings and reports mismatches, run in CI
   against a seeded database, so the denormalisation cannot drift silently.
2. **Move the refresh token to an httpOnly cookie** and add sign-out token
   blacklisting, closing the two auth gaps above.
3. **A waitlist.** The 409 path currently ends in a dead end; the natural
   product answer to "sold out" is to queue, and it reuses the same lock —
   promotion on cancellation happens inside `cancel_booking`.
4. **CI**: GitHub Actions running the suite plus `scripts/race_check.py`
   against a compose stack, so the concurrency guarantee is re-proven on every
   push rather than once on my machine.
5. **Frontend tests** (Vitest + Testing Library) for the booking error states,
   and a Playwright pass over the OAuth-cancel and expired-token flows.
6. **Server-side filtering and pagination** for the catalog, plus creator
   profile pages and a lightweight poll to keep seat counts fresh.
