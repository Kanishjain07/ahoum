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

BookSync cleanly supports both **Single Sign-On (Google & GitHub OAuth)** and **Username/Email + Password Authentication**.

- **Password Registration & Login**: Users can register with a username, optional email, password, and chosen role directly on the sign-up page (`POST /api/auth/register/`) or sign in via `POST /api/auth/login/`.
- **Google & GitHub OAuth**: The auth card features dedicated Google and GitHub SSO buttons.
  - To use real OAuth flows, set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env`, and run `docker compose up -d --build backend`.
  - Redirect URIs for local OAuth:
    - Google: `http://localhost:8080/auth/callback/google`
    - GitHub: `http://localhost:8080/auth/callback/github`
- **Dev Sign-In**: `.env.example` ships with `DEV_FAKE_OAUTH=True` for instant local review without OAuth credentials.

### Account Roles

Roles are chosen upon account creation (**User / Learner** or **Host / Creator**):
- **User / Learner**: Can browse the catalog, view session details, and book seats.
- **Host / Creator**: Gets access to session management and the Creator Dashboard (`/creator`).
- **Role Locking**: Once chosen upon registration/welcome (`role_chosen = True`), account roles are **permanently locked** and cannot be changed from profile settings. The backend API enforces role permissions on every request.

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
  Google & GitHub code exchange in `oauth.py`, password login & registration views, JWT issuance, `GET/PATCH /api/auth/me/`.
- `catalog/` — `Session` and `Booking` models with the capacity and uniqueness
  constraints, `services.py` (the only place bookings are mutated),
  `permissions.py` (`IsCreatorOrReadOnly`, `IsSessionOwner`), viewsets.

**Auth flow.** SPA → Google/GitHub SSO or Username/Password → `POST /api/auth/register/` or `POST /api/auth/login/` or `POST /api/auth/callback/` exchanges credentials server-side and returns our own access + refresh JWTs. The SPA stores them, sends `Authorization: Bearer …`, and refreshes on `token_not_valid` with a single-flight guard.

**Authorization is entirely server-side.** The UI hides creator links, but `IsCreatorOrReadOnly` re-reads the role from the database per write and `IsSessionOwner` compares `creator_id` per object. Role is never read from the JWT payload, so a token issued before a role change carries no stale authority.

### API

| Method | Path | Auth |
|---|---|---|
| GET | `/api/healthz/` | public |
| POST | `/api/auth/register/` | public — Username/Email + Password registration |
| POST | `/api/auth/login/` | public — Username/Email + Password login |
| GET | `/api/auth/providers/` | public — returns configured OAuth providers |
| POST | `/api/auth/callback/` | public — exchanges OAuth code for `{access, refresh, user}` |
| POST | `/api/auth/refresh/` | refresh token |
| GET/PATCH | `/api/auth/me/` | user — profile updates (role is immutable once chosen) |
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

## Design System & UI

The frontend features a sleek, human-crafted design with solid typography, clean glassmorphic components, and fluid responsiveness:

- **Hero & Headlines**: Solid typography (`text-emerald-400`) without artificial gradient text or ambient blur orbs.
- **Top Navigation Bar**: Floating translucent header with pill navigation tabs, subtle search input, and profile account menu.
- **Auth Shell**: Centered glassmorphic modal over a full-viewport cinematic background video stream.
- **Role Chooser**: High-contrast role cards for both light and dark backgrounds with permanent role locking.

| Design screen | Implemented as |
|---|---|
| `landing_sign_in` | `pages/Login.jsx` & `pages/Signup.jsx` — centered glass auth card with Google/GitHub SSO + Password auth |
| `oauth_callback_state` | `pages/AuthCallback.jsx` — loading and failure cards |
| `session_catalog` | `pages/Catalog.jsx` — full-bleed video hero, filter pills, cover art, solid typography |
| `session_detail_page` | `pages/SessionDetail.jsx` — two-column with sticky booking sidebar |
| `booking_confirmation_feedback` | confirmation modal + bottom-right error toast (`components/Toast.jsx`) |
| `my_bookings` | `pages/MyBookings.jsx` — Active/Past tabs |
| `creator_dashboard` | `pages/CreatorDashboard.jsx` — stat cards + session table with seat meters |
| `session_bookings_view` | `pages/SessionAttendees.jsx` — attendee roster with search |
| `create_edit_session_form` | `pages/SessionForm.jsx` — floating-label form |
| `profile_page` | `pages/Profile.jsx` — profile settings with locked role badge |
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

- **Role selection is locked upon account creation.** Users choose their role (**User / Learner** or **Host / Creator**) during sign-up or initial onboarding. Once set (`role_chosen = True`), roles are permanently locked by `ProfileUpdateSerializer` to maintain strict role isolation.
- **`DEV_FAKE_OAUTH` is a fenced dev sign-in.** It exists so this can be reviewed immediately without setting up OAuth credentials. `False` by default in `settings.py`; it must stay `False` in any production environment.
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
