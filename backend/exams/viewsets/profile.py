from __future__ import annotations

from django.contrib.auth import get_user_model, login, logout
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..serializers import (
    LoginSerializer,
    ProfileInfoSerializer,
    ProfileProgressSerializer,
    ProfileStreamUpdateSerializer,
    ProfileUpdateSerializer,
    RegistrationSerializer,
    StudentProfileSerializer,
)
from ..services.profile_service import (
    apply_profile_update,
    attach_profile_to_user,
    authenticate_user,
    build_profile_payload,
    build_progress_payload,
    get_or_create_profile_by_email,
    register_user,
)
from .common import CsrfExemptSessionAuthentication


@extend_schema_view(
    me=extend_schema(responses=ProfileInfoSerializer),
    logout=extend_schema(responses={204: None}),
    stream=extend_schema(
        request=ProfileStreamUpdateSerializer,
        responses=StudentProfileSerializer,
    ),
    update_profile=extend_schema(
        request=ProfileUpdateSerializer,
        responses=ProfileInfoSerializer,
    ),
    register=extend_schema(
        request=RegistrationSerializer,
        responses={201: ProfileInfoSerializer},
    ),
    login=extend_schema(
        request=LoginSerializer,
        responses=ProfileInfoSerializer,
    ),
    progress=extend_schema(responses=ProfileProgressSerializer),
)
class ProfileViewSet(viewsets.ViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ProfileInfoSerializer

    def get_serializer_class(self):
        if self.action == "stream":
            return StudentProfileSerializer
        if self.action == "register":
            return RegistrationSerializer
        if self.action == "login":
            return LoginSerializer
        if self.action == "update_profile":
            return ProfileUpdateSerializer
        return self.serializer_class

    @action(detail=False, methods=["get"])
    def me(self, request):
        return Response(build_profile_payload(request))

    @action(
        detail=False,
        methods=["post"],
        authentication_classes=[CsrfExemptSessionAuthentication],
    )
    def logout(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def stream(self, request):
        email = (
            (request.data.get("email") or request.data.get("student_email") or "")
            .strip()
            .lower()
        )
        if not email:
            return Response(
                {"detail": "Email required to update stream."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = get_or_create_profile_by_email(email)
        if not profile.allow_stream_change:
            return Response(
                {"detail": "Stream change is locked for this student."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = StudentProfileSerializer(
            profile, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="update")
    def update_profile(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            profile = apply_profile_update(user, request.data)
        except ValueError:
            return Response(
                {"detail": "Invalid date_of_birth format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(build_profile_payload(request, profile=profile))

    @action(detail=False, methods=["post"])
    def register(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]
        name = serializer.validated_data.get("name", "").strip()

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_model = get_user_model()
        existing = user_model.objects.filter(email__iexact=email).first()
        if existing:
            return Response(
                {"detail": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, profile = register_user(email, password, name)
        login(request, user)
        return Response(
            {
                "is_teacher": bool(user.is_staff or user.is_superuser),
                "is_authenticated": True,
                "username": user.get_username(),
                "display_name": (
                    user.get_full_name() or user.get_username() or ""
                ).strip(),
                "stream": profile.stream,
                "level": profile.level,
                "allow_stream_change": profile.allow_stream_change,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        user = authenticate_user(request, identifier, password)
        if user is None:
            return Response(
                {"detail": "Invalid username/email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        profile = attach_profile_to_user(user)
        return Response(
            {
                "is_teacher": bool(user.is_staff or user.is_superuser),
                "is_authenticated": True,
                "username": user.get_username(),
                "display_name": (
                    user.get_full_name() or user.get_username() or ""
                ).strip(),
                "stream": profile.stream,
                "level": profile.level,
                "allow_stream_change": profile.allow_stream_change,
            }
        )

    @action(detail=False, methods=["get"])
    def progress(self, request):
        raw_email = (request.query_params.get("email") or "") or (
            request.query_params.get("student_email") or ""
        )
        email = (raw_email or "").strip().lower()
        if not email and request.user and request.user.is_authenticated:
            email = (request.user.email or "").strip().lower()

        if not email:
            return Response(
                {"detail": "Email is required to fetch progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(build_progress_payload(request))
