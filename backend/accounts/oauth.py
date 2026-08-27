"""OAuth providers.

Each provider knows two things: how to build its authorization URL, and how to
turn an authorization code into a normalised profile:

    {"subject", "username", "email", "name", "avatar_url"}

Everything that touches our own user table lives in views.py, so adding a
provider means adding a class here and one entry in PROVIDERS.
"""

from urllib.parse import urlencode

import requests
from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError

TIMEOUT = 10


class OAuthProviderError(APIException):
    status_code = 502
    default_detail = "The OAuth provider could not be reached."
    default_code = "oauth_provider_error"


class UnknownProvider(ValidationError):
    default_detail = "Unsupported OAuth provider."
    default_code = "unknown_provider"


class OAuthProvider:
    key = ""
    label = ""
    authorize_endpoint = ""
    token_endpoint = ""
    scope = ""
    extra_authorize_params = {}

    @property
    def client_id(self):
        return getattr(settings, f"{self.key.upper()}_CLIENT_ID", "")

    @property
    def client_secret(self):
        return getattr(settings, f"{self.key.upper()}_CLIENT_SECRET", "")

    @property
    def is_configured(self):
        return bool(self.client_id and self.client_secret)

    def redirect_uri(self):
        """One callback route per provider — Google requires an exact match."""
        return f"{settings.OAUTH_REDIRECT_BASE.rstrip('/')}/{self.key}"

    def authorize_url(self, state):
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri(),
            "scope": self.scope,
            "state": state,
            "response_type": "code",
            **self.extra_authorize_params,
        }
        return f"{self.authorize_endpoint}?{urlencode(params)}"

    def _post_for_token(self, code):
        try:
            response = requests.post(
                self.token_endpoint,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri(),
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
                timeout=TIMEOUT,
            )
        except requests.RequestException as exc:
            raise OAuthProviderError() from exc

        payload = response.json() if response.content else {}
        token = payload.get("access_token")
        if not token:
            # Both providers can answer 200 with an error body for a replayed
            # or expired code, so status alone is not enough.
            raise ValidationError(
                {
                    "detail": payload.get("error_description")
                    or payload.get("error")
                    or "Invalid authorization code."
                }
            )
        return token

    def exchange_code(self, code):
        raise NotImplementedError


class GitHubProvider(OAuthProvider):
    key = "github"
    label = "GitHub"
    authorize_endpoint = "https://github.com/login/oauth/authorize"
    token_endpoint = "https://github.com/login/oauth/access_token"
    scope = "read:user user:email"

    USER_URL = "https://api.github.com/user"
    EMAILS_URL = "https://api.github.com/user/emails"

    def exchange_code(self, code):
        token = self._post_for_token(code)
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }
        try:
            profile = requests.get(self.USER_URL, headers=headers, timeout=TIMEOUT).json()
            email = profile.get("email")
            if not email:
                # A GitHub user with a private email needs the second call.
                emails = requests.get(
                    self.EMAILS_URL, headers=headers, timeout=TIMEOUT
                ).json()
                email = next(
                    (
                        entry["email"]
                        for entry in emails
                        if entry.get("primary") and entry.get("verified")
                    ),
                    "",
                )
        except requests.RequestException as exc:
            raise OAuthProviderError() from exc

        return {
            "subject": str(profile.get("id", "")),
            "username": profile.get("login", ""),
            "email": email or "",
            "name": profile.get("name") or profile.get("login", ""),
            "avatar_url": profile.get("avatar_url", ""),
        }


class GoogleProvider(OAuthProvider):
    key = "google"
    label = "Google"
    authorize_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    token_endpoint = "https://oauth2.googleapis.com/token"
    scope = "openid email profile"
    # `select_account` so a signed-in Google user can still choose an account;
    # without it the flow silently reuses whichever session the browser has.
    extra_authorize_params = {"prompt": "select_account", "access_type": "online"}

    USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

    def exchange_code(self, code):
        token = self._post_for_token(code)
        try:
            profile = requests.get(
                self.USERINFO_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=TIMEOUT,
            ).json()
        except requests.RequestException as exc:
            raise OAuthProviderError() from exc

        email = profile.get("email", "")
        return {
            "subject": str(profile.get("sub", "")),
            # Google has no handle; derive one from the email local part and
            # let the caller de-duplicate it.
            "username": (email.split("@")[0] if email else "") or "user",
            "email": email if profile.get("email_verified", True) else "",
            "name": profile.get("name") or email.split("@")[0],
            "avatar_url": profile.get("picture", ""),
        }


PROVIDERS = {
    provider.key: provider() for provider in (GoogleProvider, GitHubProvider)
}


def get_provider(key):
    try:
        return PROVIDERS[key]
    except KeyError:
        raise UnknownProvider(
            {"detail": f"Unsupported OAuth provider: {key}."}
        ) from None
