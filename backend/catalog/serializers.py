from django.utils import timezone
from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Booking, Session


class SessionSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    seats_remaining = serializers.IntegerField(read_only=True)
    has_started = serializers.BooleanField(read_only=True)
    my_booking = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = (
            "id",
            "creator",
            "title",
            "description",
            "cover_url",
            "starts_at",
            "duration_minutes",
            "capacity",
            "price_cents",
            "seats_taken",
            "seats_remaining",
            "has_started",
            "my_booking",
            "created_at",
        )
        read_only_fields = ("id", "creator", "seats_taken", "created_at")

    def get_my_booking(self, obj):
        """The requesting user's active booking, if the view prefetched it."""
        bookings = getattr(obj, "viewer_bookings", None)
        if not bookings:
            return None
        booking = bookings[0]
        return {"id": booking.id, "created_at": booking.created_at}

    def validate_starts_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Sessions must start in the future.")
        return value

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        instance = self.instance
        if instance and value < instance.seats_taken:
            raise serializers.ValidationError(
                "Capacity cannot drop below the number of seats already booked "
                f"({instance.seats_taken})."
            )
        return value


class BookingSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    is_past = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ("id", "session", "status", "created_at", "cancelled_at", "is_past")

    def get_is_past(self, obj):
        return obj.session.starts_at <= timezone.now()


class BookingCreateSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
