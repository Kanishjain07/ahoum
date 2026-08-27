from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
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
