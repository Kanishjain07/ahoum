# Debugging log

Real problems and wrong assumptions hit while building this, in the order they
surfaced. Every entry ends with the command that proved the fix.

---

## 1. The concurrency test passed against a deliberately broken implementation

**Symptom.** The full suite went green on the first run, including
`test_last_seat_is_sold_exactly_once`. A race test that has never failed is not
evidence of anything, so before trusting it I removed the row lock —
`Session.objects.select_for_update().get(...)` → `Session.objects.get(...)` —
copied the broken file into the running container and re-ran. **It still
passed.** 8 threads, 1 seat, 1 confirmed booking.

**Diagnosis.** The test was not isolating the mechanism I thought it was. The
booking path has three independent guards, and removing one left two:

1. `SELECT ... FOR UPDATE` on the session row (removed for the experiment)
2. the conditional increment `UPDATE ... SET seats_taken = seats_taken + 1
   WHERE seats_taken < capacity`, whose rowcount is checked
3. the `CHECK (seats_taken <= capacity)` constraint in PostgreSQL

Without the lock, all eight threads read `seats_taken = 0` and all eight tried
to increment — but seven of those `UPDATE`s matched zero rows because of
guard 2, so seven callers raised `SessionFull` and rolled back. Correct
outcome, different mechanism.

**Root cause.** Not a bug in the app — a bug in my verification. I had written
a test that asserts *the invariant*, then assumed a green run told me *which
layer* was upholding it. Layered defences make single-mechanism ablation a
weak experiment.

**Fix / verification.** I removed two layers instead of one — no lock *and* an
unconditional increment, i.e. the naive check-then-act version most
implementations ship — and re-ran:

```
AssertionError: False is not true :
[('ok', None), ('error', 'IntegrityError'), ('error', 'IntegrityError'), ...]
```

The test failed, which is the proof I wanted. It also showed something
useful: even fully naive application code did **not** oversell, because
PostgreSQL rejected the eighth increment with the `session_not_oversubscribed`
CHECK. The failure mode without correct application logic is not a corrupted
booking count — it is an unhandled `IntegrityError`, i.e. a 500 shown to a user
whose only crime was clicking at the same moment as someone else. That is
exactly the division of labour argued in DECISIONS.md #1: the constraint keeps
the data honest, the lock keeps the *experience* honest. Real code restored,
`manage.py test tests` → 24 passed.

---

## 2. `pytest-django==8.0.0` does not exist, and it only broke inside Docker

**Symptom.** `docker compose build` failed at the pip layer:

```
ERROR: Could not find a version that satisfies the requirement pytest-django==8.0.0
(from versions: ..., 4.13.0, 4.14.0)
ERROR: No matching distribution found for pytest-django==8.0.0
```

**Diagnosis.** The pin was invented — `pytest-django` is on the 4.x line, not
8.x. It survived local work because my throwaway virtualenv (used only to run
`makemigrations`) never installed the test extras; the container installs
`requirements.txt` in full, so the image build was the first thing to ever
resolve that line.

**Root cause.** An unverified version pin, plus a local environment that did
not install the same dependency set as the image. The second half is the more
interesting one: "works locally" meant less than I assumed.

**Fix.** I dropped pytest entirely rather than correcting the pin. Every test
in this repo is a `django.test.TestCase` / `TransactionTestCase`, so
`python manage.py test tests` runs them with zero extra dependencies, and the
concurrency tests specifically need `TransactionTestCase` semantics that come
from Django, not from pytest. Two fewer dependencies for no lost capability.

**Verification.** `docker compose build` → both images built;
`docker compose exec backend python manage.py test tests` → `Ran 24 tests ...
OK`.

---

## 3. Failed assumption: the inner savepoint around `Booking.objects.create()`

**Assumption.** I wrapped the insert in a nested `transaction.atomic()` and
commented that without it an `IntegrityError` from the partial unique index
"poisons the outer transaction and turns a 409 into a 500" — the standard
Django gotcha.

**Test.** Rather than trust the comment, I deleted the nested block, copied the
file into the container, and ran `test_double_booking_is_rejected`. It
**passed**: the double booking still produced `already_booked`, and
`seats_taken` was still 1.

**Root cause of the wrong belief.** The "broken transaction" rule bites when
you *keep issuing queries* in the same atomic block after catching the
`IntegrityError`. This code catches it and immediately raises `AlreadyBooked`,
so the outer atomic block unwinds and rolls back before another statement is
ever sent. The savepoint was insurance against a failure mode this code path
does not currently reach.

**Resolution.** I kept the savepoint — the cost is one `SAVEPOINT`/`RELEASE`
pair on a path that is already taking a row lock, and the failure it guards
against (someone later adding a query after the `except`) is a silent 500 in
production rather than a red test — but I rewrote the comment so it states
what is actually true instead of repeating folklore. A misleading comment about
concurrency is worse than no comment.

**Verification.** Full suite re-run after restoring the file: 24 passed.

---

## 4. `UnorderedObjectListWarning` on the public catalog

**Symptom.** Visible in verbose test output on `test_catalog_is_public`:

```
UnorderedObjectListWarning: Pagination may yield inconsistent results with an
unordered object_list: <class 'catalog.models.Session'> QuerySet.
```

Confusing, because `Session.Meta.ordering = ("starts_at",)` is set.

**Diagnosis.** `SessionViewSet.get_queryset()` ends with
`.annotate(active_bookings=Count(...))`. The aggregate adds a `GROUP BY`, and
Django reports `QuerySet.ordered` as `False` for a grouped query whose ordering
comes only from `Meta.ordering` — so DRF's paginator warns.

**Root cause.** Relying on implicit model-level ordering in a queryset that is
transformed after the fact. Beyond the warning this is a genuine paging bug
waiting to happen: two sessions with identical `starts_at` have no tiebreak, so
the same row can appear on page 1 and page 2, or on neither.

**Fix.** Order explicitly at the end of `get_queryset()`, with `id` as a
tiebreak, and pick the direction from the `when` filter so past sessions still
read most-recent-first:

```python
order = "-starts_at" if when == "past" else "starts_at"
return qs.annotate(...).order_by(order, "id")
```

**Verification.** `manage.py test tests -v 2` — warning gone, 24 tests pass;
`GET /api/sessions/` still returns upcoming-soonest-first.

---

## 5. Docker Desktop was not running, and Compose said something else

**Symptom.** `docker compose build` failed with
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`
after printing `Image ahoum-backend Building`, which reads like a build failure
rather than a daemon failure.

**Diagnosis / fix.** `docker --version` answers from the CLI binary alone and
had reported fine, so the daemon looked healthy. `docker info` is the check
that actually round-trips to the engine. Started Docker Desktop, polled `docker
info` until it succeeded, then built.

**Verification.** `docker compose up -d` → four containers up, `db` healthy;
`curl localhost:8080/api/healthz/` → `{"status": "ok"}`.

---

## 6. The session page offered a booking the API was guaranteed to reject

**Symptom.** While rebuilding the UI against the supplied design, I drove
headless Chrome over CDP to screenshot the authenticated screens with seeded
data. On `/sessions/4`, signed in as a user who *already had an active booking
for that session*, the sidebar still rendered a live **"Book this session"**
button. Clicking it could only ever produce `409 already_booked`.

**Diagnosis.** The bug was in the API contract, not the component. The session
payload described the session (`seats_remaining`, `has_started`, `capacity`)
but contained nothing about *the requesting user's* relationship to it, so the
frontend had no way to distinguish "bookable" from "already yours". Every
screen that needed that fact would have had to fetch `/api/bookings/` and join
client-side — and the catalog, with 20 cards, could not reasonably do that at
all.

**Root cause.** A missing dimension in the serializer: session state was
modelled as global, when part of it is per-viewer.

**Fix.** `SessionSerializer.my_booking`, populated from a prefetch scoped to
the requesting user:

```python
qs = qs.prefetch_related(
    Prefetch(
        "bookings",
        queryset=Booking.objects.filter(user=self.request.user,
                                        status=BookingStatus.ACTIVE),
        to_attr="viewer_bookings",
    )
)
```

The naive fix — a `.filter(...).first()` inside the serializer method — costs
one query per card. `Prefetch(..., to_attr=...)` costs exactly one extra query
for the whole page, and it is only added for authenticated requests, so the
public catalog is unchanged. The UI now renders a confirmed state with a cancel
action, and the catalog marks booked sessions with a badge.

**Verification.** New test
`test_session_payload_exposes_the_viewers_own_booking` covers all four cases —
anonymous sees `null`, the booker sees the booking id, a different user sees
`null`, and cancelling clears it. Suite: 25 passed. Re-screenshotted the same
route: the sidebar now shows "Your seat is confirmed / Booked on …" with
**Cancel booking**.

**What this really fixed.** The visual check was the only thing that caught it:
every test passed before and after, because the tests asserted the *API* was
right about conflicts — and it was. It was the client that was asking a
question the API could not answer.

---

## 7. Navbar layout whitespace gap and unsaved `.env` environment variables

**Symptom.**
1. Clicking "Continue with Google" returned `google sign-in is not configured on this server` even after environment configuration.
2. A large whitespace top margin gap (~140px) appeared above the page content below the sticky navbar.

**Diagnosis & Root Cause.**
1. Unsaved `.env` edits: Docker Compose reads `.env` directly from disk. Edits in IDE tabs must be saved to disk (`Ctrl + S`) before rebuilding the container (`docker compose up -d --build backend`).
2. Layout gap: `<main>` had `pt-[72px]` while `<header>` was styled as `sticky top-0`, creating a duplicate top padding gap.

**Fix & Verification.**
1. Saved `.env` to disk and verified provider configuration endpoints via `GET /api/auth/providers/`.
2. Updated `<main>` in `Layout.jsx` to `pt-6` with tight spacing below the sticky header.
3. Verified clean alignment on `http://localhost:8080` across desktop and mobile viewports.

---

## Verification summary

| Check | Command | Result |
|---|---|---|
| Unit + auth + booking tests | `docker compose exec backend python manage.py test tests` | 33 passed |
| Race, service layer, 8 threads / 1 seat | included above | 1 confirmed, 7 × `session_full` |
| Race, live HTTP through Nginx + Gunicorn | `python scripts/race_check.py --seats 1 --clients 8` | `1 x 201`, `7 x 409 session_full`, PASS |
| Race, live HTTP, 15 clients / 3 seats | `python scripts/race_check.py --seats 3 --clients 15` | `3 x 201`, `12 x 409`, PASS |
| Data survives container restart | `docker compose down && docker compose up -d` | session count 2 → 2 |
| SPA deep-link routing | `curl -o /dev/null -w '%{http_code}' localhost:8080/sessions/1` | 200 |
| OAuth & Password Auth | `POST /api/auth/login/` & `GET /api/auth/providers/` | 200 OK |
| Every screen renders with real data | Chrome against seeded data | auth, catalog, detail, bookings, dashboard, profile — desktop 1440px and mobile 390px |
