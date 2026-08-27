"""Booking transactions.

Everything that can violate a booking invariant goes through here, so there is
exactly one place where the locking order and the checks are defined.
"""

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound

from .models import Booking, BookingStatus, Session


class Conflict(APIException):
    status_code = 409
    default_detail = "Conflict."
    default_code = "conflict"


class SessionFull(Conflict):
    default_detail = "This session is fully booked."
    default_code = "session_full"


class AlreadyBooked(Conflict):
    default_detail = "You already have an active booking for this session."
    default_code = "already_booked"


class SessionStarted(Conflict):
    default_detail = "This session has already started."
    default_code = "session_started"


class OwnSession(Conflict):
    default_detail = "You cannot book your own session."
    default_code = "own_session"


@transaction.atomic
def book_session(*, user, session_id):
    """Create one active booking, or raise a Conflict.

    SELECT ... FOR UPDATE serialises every booking attempt on the same session,
    so the capacity read and the seat increment happen atomically. Two
    simultaneous requests for the last seat queue up: the loser sees
    seats_taken == capacity and gets SessionFull.
    """
    try:
        session = Session.objects.select_for_update().get(pk=session_id)
    except Session.DoesNotExist:
        raise NotFound("Session not found.")

    if session.creator_id == user.id:
        raise OwnSession()
    if session.starts_at <= timezone.now():
        raise SessionStarted()
    if session.seats_taken >= session.capacity:
        raise SessionFull()

    try:
        # Savepoint. Today we re-raise immediately, so the outer atomic block
        # would roll back cleanly anyway (verified - see DEBUGGING.md #3).
        # It stays because it is what makes the enclosing transaction still
        # usable if this branch ever needs to do work after the catch, and
        # because that failure mode is a silent 500 rather than a test error.
        with transaction.atomic():
            booking = Booking.objects.create(
                session=session, user=user, status=BookingStatus.ACTIVE
            )
    except IntegrityError:
        raise AlreadyBooked()

    updated = Session.objects.filter(
        pk=session.pk, seats_taken__lt=F("capacity")
    ).update(seats_taken=F("seats_taken") + 1)
    if not updated:
        # Unreachable while the row lock is held; kept as a tripwire so a
        # future refactor that drops the lock fails loudly instead of silently
        # overselling.
        raise SessionFull()

    booking.refresh_from_db()
    return booking


@transaction.atomic
def cancel_booking(*, user, booking_id):
    try:
        booking = Booking.objects.select_related("session").get(
            pk=booking_id, user=user
        )
    except Booking.DoesNotExist:
        raise NotFound("Booking not found.")

    if booking.status != BookingStatus.ACTIVE:
        return booking

    # Lock the session before touching the counter, same order as book_session.
    Session.objects.select_for_update().get(pk=booking.session_id)

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = timezone.now()
    booking.save(update_fields=["status", "cancelled_at"])

    Session.objects.filter(pk=booking.session_id, seats_taken__gt=0).update(
        seats_taken=F("seats_taken") - 1
    )
    return booking
