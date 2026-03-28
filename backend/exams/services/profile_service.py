from __future__ import annotations

import datetime
from typing import Any, Dict, Optional

from django.contrib.auth import authenticate, get_user_model
from exams.models import StudentProfile, Submission, Test


def get_or_create_profile_by_email(email: str) -> StudentProfile:
    profile, _ = StudentProfile.objects.get_or_create(
        email=email,
        defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
    )
    return profile


def build_profile_payload(request, profile: Optional[StudentProfile] = None):
    user = request.user
    is_authenticated = bool(user and user.is_authenticated)
    is_teacher = bool(is_authenticated and (user.is_staff or user.is_superuser))
    display_name = ""
    username = ""
    student_email = (request.query_params.get("student_email") or "").strip().lower()
    profile_email = student_email or getattr(user, "email", "") or ""
    profile_obj: Optional[StudentProfile] = profile
    if profile_email and profile_obj is None:
        profile_obj = get_or_create_profile_by_email(profile_email)
        if is_authenticated and not profile_obj.user:
            profile_obj.user = user
            profile_obj.save(update_fields=["user"])
    if is_authenticated:
        username = user.get_username()
        display_name = (user.get_full_name() or username or "").strip()
        if profile_obj is None and user.email:
            profile_obj = get_or_create_profile_by_email(user.email)
    return {
        "is_teacher": is_teacher,
        "is_authenticated": is_authenticated,
        "username": username,
        "display_name": display_name,
        "stream": profile_obj.stream if profile_obj else Test.Stream.BOKMAAL,
        "level": profile_obj.level if profile_obj else Test.Level.A1,
        "allow_stream_change": (
            profile_obj.allow_stream_change if profile_obj else True
        ),
        "first_name": profile_obj.first_name if profile_obj else "",
        "last_name": profile_obj.last_name if profile_obj else "",
        "middle_name": profile_obj.middle_name if profile_obj else "",
        "date_of_birth": (
            profile_obj.date_of_birth.isoformat()
            if profile_obj and profile_obj.date_of_birth
            else None
        ),
        "learning_language": profile_obj.learning_language if profile_obj else "",
        "native_language": profile_obj.native_language if profile_obj else "",
        "vocab_favorites": profile_obj.vocab_favorites if profile_obj else [],
        "expression_favorites": (
            profile_obj.expression_favorites if profile_obj else []
        ),
    }


def apply_profile_update(user, data: dict):
    profile = None
    name = (data.get("name") or "").strip()
    if name:
        first, *rest = name.split(" ", 1)
        user.first_name = first
        if rest:
            user.last_name = rest[0]
        user.save(update_fields=["first_name", "last_name"])

    if user.email:
        profile = get_or_create_profile_by_email(user.email)
        for field in [
            "last_name",
            "first_name",
            "middle_name",
            "learning_language",
            "native_language",
        ]:
            if field in data:
                setattr(profile, field, (data.get(field) or "").strip())

        if "vocab_favorites" in data:
            raw_vocab = data.get("vocab_favorites") or []
            if not isinstance(raw_vocab, (list, tuple)):
                raw_vocab = []
            profile.vocab_favorites = [
                str(raw).strip() for raw in raw_vocab if str(raw or "").strip()
            ]

        if "expression_favorites" in data:
            raw_expr = data.get("expression_favorites") or []
            if not isinstance(raw_expr, (list, tuple)):
                raw_expr = []
            cleaned_expr: list[int] = []
            for raw in raw_expr:
                try:
                    cleaned_expr.append(int(raw))
                except (TypeError, ValueError):
                    continue
            profile.expression_favorites = cleaned_expr

        if "date_of_birth" in data:
            dob_raw = (data.get("date_of_birth") or "").strip()
            if dob_raw:
                profile.date_of_birth = datetime.date.fromisoformat(dob_raw)
            else:
                profile.date_of_birth = None
        profile.save()

    return profile


def register_user(email: str, password: str, name: str):
    user = get_user_model().objects.create_user(
        username=email,
        email=email,
        password=password,
    )
    if name:
        first, *rest = name.split(" ", 1)
        user.first_name = first
        if rest:
            user.last_name = rest[0]
        user.save(update_fields=["first_name", "last_name"])

    profile, created = StudentProfile.objects.get_or_create(
        email=email,
        defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
    )
    if not created and not profile.user:
        profile.user = user
        profile.save(update_fields=["user"])
    return user, profile


def authenticate_user(request, identifier: str, password: str):
    user_model = get_user_model()
    user = authenticate(request, username=identifier, password=password)
    if user is None:
        user_by_email = None
        if "@" in identifier:
            user_by_email = user_model.objects.filter(email__iexact=identifier).first()
        else:
            user_by_email = user_model.objects.filter(
                username__iexact=identifier
            ).first()
        if user_by_email is not None:
            user = authenticate(
                request,
                username=user_by_email.get_username(),
                password=password,
            )
    return user


def attach_profile_to_user(user):
    profile = get_or_create_profile_by_email((user.email or "").strip().lower())
    if profile.user_id != user.id:
        profile.user = user
        profile.save(update_fields=["user"])
    return profile


def build_progress_payload(request):
    raw_email = (request.query_params.get("email") or "") or (
        request.query_params.get("student_email") or ""
    )
    email = (raw_email or "").strip().lower()
    user = request.user
    if not email and user and user.is_authenticated:
        email = (user.email or "").strip().lower()

    submissions = Submission.objects.filter(email=email).select_related("test")
    submissions = submissions.order_by("-created_at")

    by_level_map: Dict[str, Dict[str, Any]] = {}
    for submission in submissions:
        level = submission.test.level
        entry = by_level_map.setdefault(
            level, {"level": level, "tests": 0, "total_percent": 0.0}
        )
        entry["tests"] += 1
        entry["total_percent"] += submission.percent

    by_level = []
    for level, entry in by_level_map.items():
        tests_count = entry["tests"]
        avg_percent = (
            round(entry["total_percent"] / tests_count, 2) if tests_count else 0.0
        )
        by_level.append(
            {"level": level, "tests": tests_count, "avg_percent": avg_percent}
        )
    by_level.sort(key=lambda item: item["level"])

    last_submission = submissions.first()
    last_payload: Optional[Dict[str, Any]] = None
    if last_submission is not None:
        last_payload = {
            "test_title": last_submission.test.title,
            "level": last_submission.test.level,
            "stream": last_submission.test.stream,
            "percent": last_submission.percent,
            "created_at": last_submission.created_at,
        }

    return {
        "email": email,
        "tests_taken": submissions.count(),
        "last_submission": last_payload,
        "by_level": by_level,
    }
