from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.PasswordLoginView.as_view(), name="password-login"),
    path("providers/", views.providers, name="providers"),
    path("<str:provider>/login-url/", views.login_url, name="login-url"),
    path(
        "<str:provider>/callback/",
        views.OAuthCallbackView.as_view(),
        name="oauth-callback",
    ),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
]
