"""Authorization and auth-error cases enforced by the backend."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role

from .factories import make_creator, make_session, make_user

FUTURE = (timezone.now() + timedelta(days=3)).isoformat()


def payload(**overrides):
    body = {
        "title": "Morning Focus Hour",
        "description": "Quiet, timed work block.",
        "starts_at": FUTURE,
        "duration_minutes": 60,
        "capacity": 10,
        "price_cents": 0,
    }
    body.update(overrides)
    return body


class AuthErrorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("plain-user")

    def test_missing_token_is_401(self):
        response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "not_authenticated")

    def test_garbage_token_is_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, 401)
        self.assertIn("token", response.data["detail"].lower())

    def test_expired_token_is_401_not_403(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(from_time=timezone.now() - timedelta(hours=2), lifetime=timedelta(minutes=1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/api/bookings/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "token_not_valid")

    def test_valid_token_still_works(self):
        token = AccessToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get("/api/bookings/").status_code, 200)


class RoleEnforcementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user("plain-user")
        self.creator = make_creator("owner")
        self.rival = make_creator("rival")

    def test_catalog_is_public(self):
        make_session(self.creator, capacity=5)
        response = self.client.get("/api/sessions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_plain_user_cannot_create_a_session(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/sessions/", payload(), format="json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "permission_denied")

    def test_anonymous_cannot_create_a_session(self):
        response = self.client.post("/api/sessions/", payload(), format="json")
        self.assertEqual(response.status_code, 401)

    def test_creator_can_create_a_session(self):
        self.client.force_authenticate(self.creator)
        response = self.client.post("/api/sessions/", payload(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["creator"]["id"], self.creator.id)
        self.assertEqual(response.data["seats_remaining"], 10)

    def test_creator_cannot_edit_another_creators_session(self):
        session = make_session(self.creator, capacity=5)
        self.client.force_authenticate(self.rival)

        patched = self.client.patch(
            f"/api/sessions/{session.id}/", {"title": "Hijacked"}, format="json"
        )
        deleted = self.client.delete(f"/api/sessions/{session.id}/")

        self.assertEqual(patched.status_code, 403)
        self.assertEqual(deleted.status_code, 403)
        session.refresh_from_db()
        self.assertEqual(session.title, "Deep Work Sprint")

    def test_creator_cannot_reassign_a_session_to_someone_else(self):
        session = make_session(self.creator, capacity=5)
        self.client.force_authenticate(self.creator)
        response = self.client.patch(
            f"/api/sessions/{session.id}/",
            {"creator": self.rival.id, "title": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.creator_id, self.creator.id)

    def test_roster_is_visible_only_to_the_owning_creator(self):
        session = make_session(self.creator, capacity=5)
        self.client.force_authenticate(self.rival)
        self.assertEqual(
            self.client.get(f"/api/sessions/{session.id}/bookings/").status_code, 403
        )
        self.client.force_authenticate(self.creator)
        self.assertEqual(
            self.client.get(f"/api/sessions/{session.id}/bookings/").status_code, 200
        )

    def test_profile_update_can_upgrade_to_creator(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            "/api/auth/me/",
            {"display_name": "Ada", "bio": "builder", "role": Role.CREATOR},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, Role.CREATOR)
        self.assertEqual(self.user.display_name, "Ada")

    def test_creator_with_sessions_cannot_downgrade(self):
        make_session(self.creator, capacity=5)
        self.client.force_authenticate(self.creator)
        response = self.client.patch(
            "/api/auth/me/", {"role": Role.USER}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_session_must_start_in_the_future(self):
        self.client.force_authenticate(self.creator)
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        response = self.client.post(
            "/api/sessions/", payload(starts_at=past), format="json"
        )
        self.assertEqual(response.status_code, 400)


class OAuthSignUpTests(TestCase):
    """The sign-up screen picks a role; the API decides whether to honour it."""

    def setUp(self):
        self.client = APIClient()

    def dev_sign_in(self, handle, provider="google", **extra):
        return self.client.post(
            f"/api/auth/{provider}/callback/",
            {"code": f"dev:{handle}", **extra},
            format="json",
        )

    def test_providers_endpoint_lists_both(self):
        response = self.client.get("/api/auth/providers/")
        self.assertEqual(response.status_code, 200)
        keys = [item["key"] for item in response.data["providers"]]
        self.assertEqual(sorted(keys), ["github", "google"])

    def test_unknown_provider_is_rejected(self):
        self.assertEqual(self.client.get("/api/auth/facebook/login-url/").status_code, 400)
        self.assertEqual(
            self.client.post(
                "/api/auth/facebook/callback/", {"code": "dev:x"}, format="json"
            ).status_code,
            400,
        )

    def test_role_chosen_at_signup_is_applied(self):
        response = self.dev_sign_in("new-creator", role=Role.CREATOR)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["created"])
        self.assertEqual(response.data["user"]["role"], Role.CREATOR)
        self.assertTrue(response.data["user"]["role_chosen"])

    def test_role_is_ignored_when_the_account_already_exists(self):
        first = self.dev_sign_in("returning", role=Role.USER)
        self.assertTrue(first.data["created"])

        # A crafted sign-in must not silently promote an existing account.
        again = self.dev_sign_in("returning", role=Role.CREATOR)
        self.assertFalse(again.data["created"])
        self.assertEqual(again.data["user"]["role"], Role.USER)

    def test_signing_up_without_a_role_leaves_onboarding_pending(self):
        response = self.dev_sign_in("undecided")
        self.assertEqual(response.data["user"]["role"], Role.USER)
        self.assertFalse(response.data["user"]["role_chosen"])

    def test_unknown_role_is_rejected(self):
        self.assertEqual(self.dev_sign_in("weird", role="admin").status_code, 400)

    def test_same_handle_on_two_providers_is_two_accounts(self):
        google = self.dev_sign_in("samename", provider="google")
        github = self.dev_sign_in("samename", provider="github")
        self.assertTrue(google.data["created"])
        self.assertTrue(github.data["created"])
        self.assertNotEqual(google.data["user"]["id"], github.data["user"]["id"])
        # Usernames are de-duplicated rather than colliding.
        self.assertNotEqual(
            google.data["user"]["username"], github.data["user"]["username"]
        )

    def test_choosing_a_role_later_marks_onboarding_complete(self):
        self.dev_sign_in("late-decider")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.dev_sign_in('late-decider').data['access']}"
        )
        response = self.client.patch(
            "/api/auth/me/", {"role": Role.CREATOR}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["role_chosen"])
