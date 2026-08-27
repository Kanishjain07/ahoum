import secrets

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import oauth
from .models import Role, User
from .serializers import ProfileUpdateSerializer, UserSerializer


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def providers(request):
    """What the sign-in page should offer, and what is actually usable."""
    return Response(
        {
            "providers": [
                {
                    "key": provider.key,
                    "label": provider.label,
                    "configured": provider.is_configured,
                }
                for provider in oauth.PROVIDERS.values()
            ],
            "dev_sign_in": settings.DEV_FAKE_OAUTH,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def login_url(request, provider):
    """The frontend never sees the client id/secret; it just follows this."""
    provider = oauth.get_provider(provider)
    if not provider.is_configured:
        # Better a clear 503 than bouncing the user to a provider error page
        # with an empty client_id.
        return Response(
            {
                "detail": f"{provider.label} OAuth is not configured on the server.",
                "code": "oauth_unconfigured",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    state = secrets.token_urlsafe(16)
    return Response({"url": provider.authorize_url(state), "state": state})


def unique_username(base):
    candidate = (base or "user")[:140]
    suffix = 0
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{base[:135]}-{suffix}"
    return candidate


class OAuthCallbackView(APIView):
    """Exchange a provider's authorization code for our own JWT pair."""

    permission_classes = [AllowAny]

    def post(self, request, provider):
        provider = oauth.get_provider(provider)
        code = request.data.get("code")
        if not code:
            raise ValidationError({"detail": "Missing authorization code."})

        requested_role = request.data.get("role")
        if requested_role and requested_role not in Role.values:
            raise ValidationError({"detail": f"Unknown role: {requested_role}."})

        if settings.DEV_FAKE_OAUTH and code.startswith("dev:"):
            handle = code[4:].strip() or "devuser"
            profile = {
                "subject": f"dev-{handle}",
                "username": handle,
                "email": f"{handle}@example.dev",
                "name": handle.replace("-", " ").title(),
                "avatar_url": "",
            }
        else:
            profile = provider.exchange_code(code)

        if not profile.get("subject"):
            raise ValidationError({"detail": "OAuth provider returned no account id."})

        with transaction.atomic():
            user, created = User.objects.get_or_create(
                oauth_provider=provider.key,
                oauth_subject=profile["subject"],
                defaults={
                    "username": unique_username(profile["username"]),
                    "email": profile["email"],
                    "display_name": profile["name"],
                    "avatar_url": profile["avatar_url"],
                },
            )
            if created:
                # The role picked on the sign-up screen is honoured only while
                # creating the account. Sending it later must not silently
                # promote an existing user - that goes through PATCH /me/.
                if requested_role:
                    user.role = requested_role
                    user.role_chosen = True
                    user.save(update_fields=["role", "role_chosen"])
            else:
                # Keep provider-owned fields fresh, leave user-owned ones alone.
                user.email = profile["email"] or user.email
                user.avatar_url = profile["avatar_url"] or user.avatar_url
                user.save(update_fields=["email", "avatar_url"])

        data = issue_tokens(user)
        data["created"] = created
        data["provider"] = provider.key
        return Response(data, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)
