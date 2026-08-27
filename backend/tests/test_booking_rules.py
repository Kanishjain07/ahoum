from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Booking, BookingStatus, Session
from catalog.services import book_session, cancel_booking

from .factories import make_creator, make_session, make_user


class BookingRuleTests(TestCase):
    def setUp(self):
        self.creator = make_creator()
        self.user = make_user("attendee")

    def test_double_booking_is_rejected(self):
        session = make_session(self.creator, capacity=5)
        book_session(user=self.user, session_id=session.id)

        with self.assertRaises(Exception) as ctx:
            book_session(user=self.user, session_id=session.id)
        self.assertEqual(ctx.exception.default_code, "already_booked")

        session.refresh_from_db()
        self.assertEqual(session.seats_taken, 1)

    def test_cannot_book_a_session_that_already_started(self):
        session = make_session(self.creator, capacity=5)
        # Bypass serializer validation: a session goes stale by the clock moving,
        # not by anyone submitting a past date.
        Session.objects.filter(pk=session.pk).update(
            starts_at=timezone.now() - timedelta(minutes=1)
        )

        with self.assertRaises(Exception) as ctx:
            book_session(user=self.user, session_id=session.id)
        self.assertEqual(ctx.exception.default_code, "session_started")
        self.assertEqual(Booking.objects.count(), 0)

    def test_creator_cannot_book_own_session(self):
        session = make_session(self.creator, capacity=5)
        with self.assertRaises(Exception) as ctx:
            book_session(user=self.creator, session_id=session.id)
        self.assertEqual(ctx.exception.default_code, "own_session")

    def test_cancelling_frees_the_seat_and_allows_rebooking(self):
        session = make_session(self.creator, capacity=1)
        booking = book_session(user=self.user, session_id=session.id)

        cancel_booking(user=self.user, booking_id=booking.id)
        session.refresh_from_db()
        self.assertEqual(session.seats_taken, 0)

        other = make_user("second-attendee")
        book_session(user=other, session_id=session.id)
        session.refresh_from_db()
        self.assertEqual(session.seats_taken, 1)

        # The same user may re-book after cancelling: the unique index is
        # partial on status=active.
        cancel_booking(user=other, booking_id=Booking.objects.get(user=other).id)
        book_session(user=self.user, session_id=session.id)
        self.assertEqual(
            Booking.objects.filter(user=self.user).count(), 2
        )

    def test_database_refuses_an_oversubscribed_row(self):
        """Backstop: even a buggy service layer cannot write capacity < seats_taken."""
        session = make_session(self.creator, capacity=2)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Session.objects.filter(pk=session.pk).update(seats_taken=3)

    def test_booking_endpoint_returns_409_when_full(self):
        session = make_session(self.creator, capacity=1)
        book_session(user=self.user, session_id=session.id)

        latecomer = make_user("latecomer")
        client = APIClient()
        client.force_authenticate(latecomer)
        response = client.post(
            "/api/bookings/", {"session_id": session.id}, format="json"
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "session_full")

    def test_my_bookings_split_into_active_and_past(self):
        upcoming = make_session(self.creator, capacity=5, title="Upcoming")
        finished = make_session(self.creator, capacity=5, title="Finished")
        book_session(user=self.user, session_id=upcoming.id)
        book_session(user=self.user, session_id=finished.id)
        Session.objects.filter(pk=finished.pk).update(
            starts_at=timezone.now() - timedelta(hours=2)
        )

        client = APIClient()
        client.force_authenticate(self.user)

        active = client.get("/api/bookings/?scope=active").data["results"]
        past = client.get("/api/bookings/?scope=past").data["results"]

        self.assertEqual([b["session"]["title"] for b in active], ["Upcoming"])
        self.assertEqual([b["session"]["title"] for b in past], ["Finished"])
        self.assertTrue(
            all(b["status"] == BookingStatus.ACTIVE for b in active + past)
        )

    def test_session_payload_exposes_the_viewers_own_booking(self):
        """Drives the "you are booked" state in the UI, prefetched per request."""
        session = make_session(self.creator, capacity=5)
        client = APIClient()

        anonymous = client.get(f"/api/sessions/{session.id}/")
        self.assertIsNone(anonymous.data["my_booking"])

        client.force_authenticate(self.user)
        before = client.get(f"/api/sessions/{session.id}/")
        self.assertIsNone(before.data["my_booking"])

        booking = book_session(user=self.user, session_id=session.id)
        after = client.get(f"/api/sessions/{session.id}/")
        self.assertEqual(after.data["my_booking"]["id"], booking.id)

        # Another user must not see it.
        client.force_authenticate(make_user("someone-else"))
        self.assertIsNone(client.get(f"/api/sessions/{session.id}/").data["my_booking"])

        # Cancelling clears it again.
        client.force_authenticate(self.user)
        cancel_booking(user=self.user, booking_id=booking.id)
        self.assertIsNone(client.get(f"/api/sessions/{session.id}/").data["my_booking"])
