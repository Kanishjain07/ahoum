from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def healthz(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/healthz/", healthz),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("catalog.urls")),
]
