from rest_framework import serializers

from .models import Role, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "role_chosen",
            "display_name",
            "bio",
            "avatar_url",
            "oauth_provider",
        )
        read_only_fields = (
            "id",
            "username",
            "email",
            "role",
            "role_chosen",
            "avatar_url",
            "oauth_provider",
        )


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Profile edit. `role` is write-able but only upgrades user -> creator."""

    class Meta:
        model = User
        fields = ("display_name", "bio", "role")

    def update(self, instance, validated_data):
        if "role" in validated_data:
            instance.role_chosen = True
        return super().update(instance, validated_data)

    def validate_role(self, value):
        if value == self.instance.role:
            return value
        if value == Role.CREATOR:
            return value
        if self.instance.sessions.exists():
            raise serializers.ValidationError(
                "Cannot drop creator role while you still own sessions."
            )
        return value
