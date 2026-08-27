from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    USER = "user", "User"
    CREATOR = "creator", "Creator"


class User(AbstractUser):
    """OAuth-only user.

    `username` is kept (AbstractUser requires it) but is derived from the
    provider login; passwords are never set, so password login is impossible.
    """

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    # False until the person actually picks a role (at sign-up, or later in
    # settings). Drives the onboarding step instead of guessing from `role`,
    # which always has a default.
    role_chosen = models.BooleanField(default=False)
    display_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)

    oauth_provider = models.CharField(max_length=32, blank=True)
    oauth_subject = models.CharField(max_length=128, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["oauth_provider", "oauth_subject"],
                name="uniq_oauth_identity",
                condition=~models.Q(oauth_subject=""),
            )
        ]

    @property
    def is_creator(self):
        return self.role == Role.CREATOR

    def __str__(self):
        return self.display_name or self.username
