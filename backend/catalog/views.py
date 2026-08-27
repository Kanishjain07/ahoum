from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Booking, BookingStatus, Session
from .permissions import IsCreatorOrReadOnly, IsSessionOwner
from .serializers import BookingCreateSerializer, BookingSerializer, SessionSerializer
from .services import book_session, cancel_booking


class SessionViewSet(viewsets.ModelViewSet):
    """Public catalog + creator-owned writes."""

    serializer_class = SessionSerializer
    permission_classes = [IsCreatorOrReadOnly, IsSessionOwner]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        qs = Session.objects.select_related("creator")
        params = self.request.query_params

        if self.request.user.is_authenticated:
            # Lets the UI render "you are booked" without a second round trip,
            # and without one query per card.
            qs = qs.prefetch_related(
                Prefetch(
                    "bookings",
                    queryset=Booking.objects.filter(
                        user=self.request.user, status=BookingStatus.ACTIVE
                    ),
                    to_attr="viewer_bookings",
                )
            )

        if params.get("mine") == "1":
            if not self.request.user.is_authenticated:
                return qs.none()
            qs = qs.filter(creator=self.request.user)

        when = params.get("when", "upcoming" if self.action == "list" else "")
        if when == "upcoming":
            qs = qs.filter(starts_at__gt=timezone.now())
        elif when == "past":
            qs = qs.filter(starts_at__lte=timezone.now())

        search = params.get("q")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        # Explicit ordering after annotate(): the GROUP BY makes Django
        # report the queryset as unordered, which makes DRF pagination warn
        # (and, with equal start times, actually unstable).
        order = "-starts_at" if when == "past" else "starts_at"
        return qs.annotate(
            active_bookings=Count(
                "bookings", filter=Q(bookings__status=BookingStatus.ACTIVE)
            )
        ).order_by(order, "id")

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def bookings(self, request, pk=None):
        """Attendee roster, visible to the owning creator only."""
        session = self.get_object()
        if session.creator_id != request.user.id:
            return Response(
                {
                    "detail": "You can only view bookings for your own sessions.",
                    "code": "permission_denied",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        roster = session.bookings.select_related("user").filter(
            status=BookingStatus.ACTIVE
        )
        return Response(
            [
                {
                    "id": booking.id,
                    "created_at": booking.created_at,
                    "user": {
                        "id": booking.user_id,
                        "display_name": booking.user.display_name
                        or booking.user.username,
                    },
                }
                for booking in roster
            ]
        )


class BookingViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Booking.objects.select_related("session", "session__creator").filter(
            user=self.request.user
        )
        scope = self.request.query_params.get("scope")
        now = timezone.now()
        if scope == "active":
            qs = qs.filter(status=BookingStatus.ACTIVE, session__starts_at__gt=now)
        elif scope == "past":
            qs = qs.filter(
                Q(status=BookingStatus.CANCELLED) | Q(session__starts_at__lte=now)
            )
        return qs

    def create(self, request, *args, **kwargs):
        payload = BookingCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        booking = book_session(
            user=request.user, session_id=payload.validated_data["session_id"]
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = cancel_booking(user=request.user, booking_id=pk)
        return Response(BookingSerializer(booking).data)
