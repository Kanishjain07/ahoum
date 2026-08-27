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
    """Profile edit. Role is locked once chosen on registration/welcome."""

    class Meta:
        model = User
        fields = ("display_name", "bio", "role")

    def validate_role(self, value):
        if value != self.instance.role:
            if self.instance.role_chosen:
                raise serializers.ValidationError(
                    "Account role is permanently set upon account creation."
                )
            if self.instance.sessions.exists() and value == Role.USER:
                raise serializers.ValidationError(
                    "Cannot drop creator role while you still own sessions."
                )
        return value

    def update(self, instance, validated_data):
        if "role" in validated_data:
            instance.role_chosen = True
        return super().update(instance, validated_data)
