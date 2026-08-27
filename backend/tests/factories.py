from datetime import timedelta

from django.utils import timezone

from accounts.models import Role, User
from catalog.models import Session


def make_user(handle, role=Role.USER):
    return User.objects.create(
        username=handle,
        email=f"{handle}@example.dev",
        display_name=handle.title(),
        role=role,
        oauth_provider="github",
        oauth_subject=f"sub-{handle}",
    )


def make_creator(handle="creator"):
    return make_user(handle, role=Role.CREATOR)


def make_session(creator, *, capacity=1, starts_in=timedelta(days=1), **kwargs):
    return Session.objects.create(
        creator=creator,
        title=kwargs.pop("title", "Deep Work Sprint"),
        description=kwargs.pop("description", "Focused co-working block."),
        starts_at=timezone.now() + starts_in,
        capacity=capacity,
        **kwargs,
    )
