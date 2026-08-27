"""Proves the capacity invariant holds when requests collide.

Uses TransactionTestCase (not TestCase): the threads need real, committed
transactions on separate connections, which a wrapping test transaction would
make impossible.
"""

import threading

from django.db import connections
from django.test import TransactionTestCase

from catalog.models import Booking, BookingStatus, Session
from catalog.services import book_session

from .factories import make_creator, make_session, make_user


def _book_concurrently(session, users):
    """Fire one booking per user at (as close as possible to) the same instant."""
    start = threading.Barrier(len(users))
    outcomes = []
    lock = threading.Lock()

    def worker(user):
        try:
            start.wait(timeout=10)
            book_session(user=user, session_id=session.id)
            result = ("ok", None)
        except Exception as exc:  # noqa: BLE001 - we assert on the code below
            result = ("error", getattr(exc, "default_code", type(exc).__name__))
        finally:
            # Each thread opened its own connection; leaking them wedges teardown.
            connections.close_all()
        with lock:
            outcomes.append(result)

    threads = [threading.Thread(target=worker, args=(user,)) for user in users]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    return outcomes


class BookingRaceTests(TransactionTestCase):
    def test_last_seat_is_sold_exactly_once(self):
        creator = make_creator()
        session = make_session(creator, capacity=1)
        users = [make_user(f"racer{i}") for i in range(8)]

        outcomes = _book_concurrently(session, users)

        confirmed = [outcome for outcome in outcomes if outcome[0] == "ok"]
        rejected = [outcome for outcome in outcomes if outcome[0] == "error"]

        self.assertEqual(len(confirmed), 1, outcomes)
        self.assertTrue(all(code == "session_full" for _, code in rejected), outcomes)

        session.refresh_from_db()
        self.assertEqual(session.seats_taken, 1)
        self.assertEqual(
            Booking.objects.filter(
                session=session, status=BookingStatus.ACTIVE
            ).count(),
            1,
        )

    def test_capacity_of_three_never_oversells(self):
        creator = make_creator()
        session = make_session(creator, capacity=3)
        users = [make_user(f"rusher{i}") for i in range(12)]

        outcomes = _book_concurrently(session, users)

        self.assertEqual(len([o for o in outcomes if o[0] == "ok"]), 3, outcomes)
        session.refresh_from_db()
        self.assertEqual(session.seats_taken, 3)
        self.assertLessEqual(session.seats_taken, session.capacity)

    def test_same_user_racing_itself_gets_one_booking(self):
        """Double-click / retry storm from a single user."""
        creator = make_creator()
        session = make_session(creator, capacity=5)
        user = make_user("doubleclicker")

        outcomes = _book_concurrently(session, [user] * 6)

        self.assertEqual(len([o for o in outcomes if o[0] == "ok"]), 1, outcomes)
        self.assertEqual(
            Booking.objects.filter(user=user, status=BookingStatus.ACTIVE).count(), 1
        )
        session = Session.objects.get(pk=session.pk)
        self.assertEqual(session.seats_taken, 1)
