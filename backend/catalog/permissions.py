from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import Role


class IsCreatorOrReadOnly(BasePermission):
    """Anyone may read the catalog; only creators may write to it."""

    message = "Only creators can perform this action."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.CREATOR
        )


class IsSessionOwner(BasePermission):
    """Object-level: a creator may only modify sessions they own."""

    message = "You can only modify your own sessions."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.creator_id == request.user.id
