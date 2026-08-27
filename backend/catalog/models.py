from django.conf import settings
from django.db import models
from django.utils import timezone


class BookingStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    CANCELLED = "cancelled", "Cancelled"


class Session(models.Model):
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessions"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    cover_url = models.URLField(blank=True)
    starts_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    capacity = models.PositiveIntegerField()
    price_cents = models.PositiveIntegerField(default=0)

    # Denormalised count of ACTIVE bookings. It exists so the database can
    # enforce "never oversubscribed" as a CHECK constraint instead of trusting
    # application code to count correctly. Only mutated under a row lock.
    seats_taken = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("starts_at",)
        constraints = [
            models.CheckConstraint(
                check=models.Q(capacity__gte=1), name="session_capacity_positive"
            ),
            models.CheckConstraint(
                check=models.Q(seats_taken__lte=models.F("capacity")),
                name="session_not_oversubscribed",
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def seats_remaining(self):
        return max(self.capacity - self.seats_taken, 0)

    @property
    def has_started(self):
        return self.starts_at <= timezone.now()


class Booking(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="bookings"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings"
    )
    status = models.CharField(
        max_length=16, choices=BookingStatus.choices, default=BookingStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            # A user may re-book after cancelling, but can hold at most one
            # ACTIVE booking per session. Partial unique index, not app logic.
            models.UniqueConstraint(
                fields=["session", "user"],
                condition=models.Q(status=BookingStatus.ACTIVE),
                name="uniq_active_booking_per_user_session",
            )
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.session_id} ({self.status})"
