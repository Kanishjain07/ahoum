#!/usr/bin/env python3
"""End-to-end proof that the running stack cannot oversell a session.

Unlike the unit tests (which call the service layer in threads), this drives
the real HTTP API through Nginx + Gunicorn, so it also exercises the worker
processes and connection pool.

    python scripts/race_check.py --base http://localhost:8080 --seats 1 --clients 8

Requires DEV_FAKE_OAUTH=True on the backend (it mints test logins).
"""

import argparse
import json
import threading
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone


def call(base, path, payload=None, token=None, method=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        f"{base}/api{path}", data=data, method=method or ("POST" if data else "GET")
    )
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as error:
        body = error.read()
        return error.code, json.loads(body or b"{}")


def sign_in(base, handle, role=None):
    payload = {"code": f"dev:{handle}"}
    if role:
        payload["role"] = role
    status, body = call(base, "/auth/google/callback/", payload)
    if status != 200:
        raise SystemExit(
            f"dev sign-in failed ({status}): {body}. Is DEV_FAKE_OAUTH=True?"
        )
    return body["access"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8080")
    parser.add_argument("--seats", type=int, default=1)
    parser.add_argument("--clients", type=int, default=8)
    args = parser.parse_args()

    stamp = datetime.now(timezone.utc).strftime("%H%M%S%f")

    host_token = sign_in(args.base, f"race-host-{stamp}", role="creator")
    call(args.base, "/auth/me/", {"role": "creator"}, host_token, method="PATCH")

    starts_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    status, session = call(
        args.base,
        "/sessions/",
        {
            "title": f"Race test {stamp}",
            "description": "Created by scripts/race_check.py",
            "starts_at": starts_at,
            "duration_minutes": 30,
            "capacity": args.seats,
            "price_cents": 0,
        },
        host_token,
    )
    if status != 201:
        raise SystemExit(f"could not create session ({status}): {session}")
    session_id = session["id"]
    print(f"session {session_id} created with capacity {args.seats}")

    tokens = [sign_in(args.base, f"racer-{stamp}-{i}") for i in range(args.clients)]

    barrier = threading.Barrier(args.clients)
    results = []
    lock = threading.Lock()

    def attempt(token):
        barrier.wait(timeout=30)
        status, body = call(args.base, "/bookings/", {"session_id": session_id}, token)
        with lock:
            results.append((status, body.get("code")))

    threads = [threading.Thread(target=attempt, args=(t,)) for t in tokens]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    tally = Counter(f"{status} {code or 'created'}" for status, code in results)
    _, final = call(args.base, f"/sessions/{session_id}/", token=host_token)
    confirmed = sum(1 for status, _ in results if status == 201)

    print(f"\n{args.clients} simultaneous booking attempts for {args.seats} seat(s)")
    for outcome, count in sorted(tally.items()):
        print(f"  {count:>3} x {outcome}")
    print(f"\nseats_taken reported by API: {final['seats_taken']}")
    print(f"201 responses:               {confirmed}")

    ok = confirmed == args.seats == final["seats_taken"]
    print("\nRESULT:", "PASS - capacity respected" if ok else "FAIL - oversold!")
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
