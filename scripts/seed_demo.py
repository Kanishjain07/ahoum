#!/usr/bin/env python3
"""Populate a local stack with demo creators, sessions and bookings.

    python scripts/seed_demo.py --base http://localhost:8080

Requires DEV_FAKE_OAUTH=True: it signs in through the dev sign-in path, so no
Google or GitHub OAuth app is needed. Safe to re-run — it reuses the same demo handles and
skips sessions whose titles already exist.
"""

import argparse
import json
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

CREATORS = [
    {
        "handle": "elena-rostova",
        "name": "Elena Rostova",
        "bio": "Growth lead. A decade of scaling digital products from zero to millions of users.",
    },
    {
        "handle": "marcus-chen",
        "name": "Marcus Chen",
        "bio": "Staff engineer. Writes about distributed systems and the databases underneath them.",
    },
]

SESSIONS = [
    {
        "creator": 0,
        "title": "Advanced Strategies for Digital Growth",
        "description": (
            "A hands-on workshop on scaling an online presence: algorithmic shifts across "
            "the major platforms, lead-generation pipelines that stay personal, and the "
            "metrics that actually predict retention.\n\n"
            "You will leave with a 30-day implementation plan for your own product."
        ),
        "days": 6,
        "hour": 10,
        "duration_minutes": 150,
        "capacity": 40,
        "price_cents": 14900,
    },
    {
        "creator": 0,
        "title": "Positioning Workshop for Solo Founders",
        "description": "Small-group session on finding the sentence that sells your product.",
        "days": 9,
        "hour": 16,
        "duration_minutes": 90,
        "capacity": 12,
        "price_cents": 4500,
    },
    {
        "creator": 1,
        "title": "Postgres Concurrency in Practice",
        "description": (
            "Row locks, isolation levels and the check-then-act bugs they hide. We build an "
            "overselling booking system, prove it broken under load, then fix it three "
            "different ways and compare the trade-offs."
        ),
        "days": 3,
        "hour": 18,
        "duration_minutes": 120,
        "capacity": 30,
        "price_cents": 0,
    },
    {
        "creator": 1,
        "title": "Debugging Distributed Systems",
        "description": "Tracing, structured logs and how to read a flame graph under pressure.",
        "days": 12,
        "hour": 14,
        "duration_minutes": 60,
        "capacity": 25,
        "price_cents": 6000,
    },
    {
        "creator": 0,
        "title": "One-on-One Portfolio Review",
        "description": "A single seat: bring your work, leave with a prioritised list of fixes.",
        "days": 2,
        "hour": 11,
        "duration_minutes": 45,
        "capacity": 1,
        "price_cents": 12000,
    },
]

ATTENDEES = ["sarah-jenkins", "priya-nair", "tom-becker", "aiko-tanaka"]


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
        return error.code, json.loads(error.read() or b"{}")


def sign_in(base, handle, role=None):
    payload = {"code": f"dev:{handle}"}
    if role:
        payload["role"] = role
    status, body = call(base, "/auth/google/callback/", payload)
    if status != 200:
        raise SystemExit(f"dev sign-in failed ({status}): {body}. Is DEV_FAKE_OAUTH=True?")
    return body["access"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8080")
    args = parser.parse_args()
    base = args.base

    _, existing = call(base, "/sessions/?when=upcoming")
    known_titles = {item["title"] for item in existing.get("results", [])}

    tokens = []
    for creator in CREATORS:
        token = sign_in(base, creator["handle"], role="creator")
        call(
            base,
            "/auth/me/",
            {"role": "creator", "display_name": creator["name"], "bio": creator["bio"]},
            token,
            method="PATCH",
        )
        tokens.append(token)
        print(f"creator ready: {creator['name']}")

    created = []
    now = datetime.now(timezone.utc)
    for spec in SESSIONS:
        if spec["title"] in known_titles:
            print(f"skip (exists): {spec['title']}")
            continue
        starts_at = (now + timedelta(days=spec["days"])).replace(
            hour=spec["hour"], minute=0, second=0, microsecond=0
        )
        status, session = call(
            base,
            "/sessions/",
            {
                "title": spec["title"],
                "description": spec["description"],
                "starts_at": starts_at.isoformat(),
                "duration_minutes": spec["duration_minutes"],
                "capacity": spec["capacity"],
                "price_cents": spec["price_cents"],
            },
            tokens[spec["creator"]],
        )
        if status != 201:
            print(f"  failed ({status}): {session}")
            continue
        created.append(session)
        print(f"created: {session['title']}")

    # A few bookings so seat counters and rosters are not all zero.
    for index, handle in enumerate(ATTENDEES):
        token = sign_in(base, handle, role="user")
        call(base, "/auth/me/", {"display_name": handle.replace("-", " ").title()}, token, method="PATCH")
        for session in created[: index + 1]:
            status, _ = call(base, "/bookings/", {"session_id": session["id"]}, token)
            if status == 201:
                print(f"booked: {handle} -> {session['title']}")

    print("\nDone. Sign in from the UI with any handle, e.g. 'elena-rostova' (creator).")


if __name__ == "__main__":
    main()
