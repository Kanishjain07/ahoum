from django.contrib import admin

from .models import Booking, Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("title", "creator", "starts_at", "capacity", "seats_taken")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "user", "status", "created_at")
