from __future__ import annotations

import datetime
from typing import Any, Dict, Optional

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import models, transaction
from rest_framework import mixins, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Answer,
    Assignment,
    Exercise,
    Expression,
    GlossaryTerm,
    Homework,
    Material,
    Option,
    Question,
    Reading,
    StudentProfile,
    Submission,
    Test,
    VerbEntry,
)
from .serializers import (
    AnswerInputSerializer,
    AnswerSerializer,
    AssignmentSerializer,
    ExerciseSerializer,
    ExpressionSerializer,
    GlossaryTermSerializer,
    HomeworkSerializer,
    LoginSerializer,
    MaterialSerializer,
    ReadingSerializer,
    RegistrationSerializer,
    StudentProfileSerializer,
    SubmissionSerializer,
    TestDetailSerializer,
    TestListSerializer,
    VerbEntrySerializer,
)


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return


class TestViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = TestListSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        base_qs = Test.objects.filter(is_published=True).prefetch_related(
            "questions__options"
        )
        stream = (self.request.query_params.get("stream") or "").strip().lower()
        level = (self.request.query_params.get("level") or "").strip().upper()
        if stream:
            base_qs = base_qs.filter(stream=stream)
        if level:
            base_qs = base_qs.filter(level=level)
        email = self.request.query_params.get("student_email", "").strip().lower()
        if not email:
            return base_qs.filter(is_restricted=False).order_by("level", "title")

        allowed_ids = Assignment.objects.filter(student_email=email).values_list(
            "test_id", flat=True
        )
        return base_qs.filter(
            models.Q(is_restricted=False) | models.Q(id__in=allowed_ids)
        ).order_by("level", "title")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TestDetailSerializer
        return super().get_serializer_class()

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, **kwargs):
        test = self.get_object()
        email = (request.data.get("email") or "").strip().lower()
        if test.is_restricted and email:
            has_assignment = Assignment.objects.filter(
                test=test, student_email=email
            ).exists()
            if not has_assignment:
                return Response(
                    {"detail": "This test is restricted. Ask your teacher for access."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif test.is_restricted and not email:
            return Response(
                {"detail": "Student email required for this test."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        answers_payload = request.data.get("answers", [])
        serializer = AnswerInputSerializer(data=answers_payload, many=True)
        serializer.is_valid(raise_exception=True)
        validated_answers = serializer.validated_data

        submission = Submission.objects.create(
            test=test,
            name=request.data.get("name", "").strip(),
            email=email,
            total_questions=test.questions.count(),
            locale=(request.data.get("locale") or "en")[:5],
        )

        score = 0
        answers_to_create = []
        answers_lookup: Dict[int, Dict[str, Any]] = {
            payload["question"]: payload for payload in validated_answers
        }

        for question in test.questions.all():
            payload = answers_lookup.get(question.id)
            selected_option: Optional[Option] = None
            text_response: str = (payload or {}).get("text_response") or ""
            is_correct = False

            if question.question_type == Question.QuestionType.SINGLE_CHOICE:
                option_id = (payload or {}).get("selected_option")
                if option_id:
                    try:
                        selected_option = question.options.get(id=option_id)
                        is_correct = selected_option.is_correct
                    except Option.DoesNotExist:
                        selected_option = None
                        is_correct = False
            else:
                # Fill-in answers are compared with the correct option text if it exists
                correct_texts = [
                    option.text.strip().casefold()
                    for option in question.options.filter(is_correct=True)
                ]
                normalized_response = text_response.strip().casefold()
                is_correct = (
                    normalized_response in correct_texts if correct_texts else False
                )

            if is_correct:
                score += 1

            answers_to_create.append(
                Answer(
                    submission=submission,
                    question=question,
                    selected_option=selected_option,
                    text_response=text_response,
                    is_correct=is_correct,
                )
            )

        Answer.objects.bulk_create(answers_to_create)
        submission.score = score
        submission.save(update_fields=["score"])

        review_payload = []
        for created_answer in submission.answers.select_related(
            "question", "selected_option"
        ).all():
            question = created_answer.question
            correct_texts = [
                option.text for option in question.options.filter(is_correct=True)
            ]
            selected_text = (
                created_answer.selected_option.text
                if created_answer.selected_option
                else created_answer.text_response
            )
            review_payload.append(
                {
                    "question": question.id,
                    "order": question.order,
                    "text": question.text,
                    "question_type": question.question_type,
                    "selected_text": selected_text,
                    "is_correct": created_answer.is_correct,
                    "correct_answers": correct_texts,
                    "explanation": question.explanation,
                }
            )

        response_payload = {
            "summary": {
                "score": score,
                "total_questions": submission.total_questions,
                "percent": submission.percent,
                "correct": score,
                "incorrect": max(submission.total_questions - score, 0),
            },
            "submission": SubmissionSerializer(submission).data,
            "answers": AnswerSerializer(submission.answers.all(), many=True).data,
            "review": sorted(review_payload, key=lambda item: item["order"]),
        }
        return Response(response_payload, status=status.HTTP_201_CREATED)


class ProfileViewSet(viewsets.ViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def _build_profile_payload(self, request, profile: Optional[StudentProfile] = None):
        user = request.user
        is_authenticated = bool(user and user.is_authenticated)
        is_teacher = bool(is_authenticated and (user.is_staff or user.is_superuser))
        display_name = ""
        username = ""
        student_email = (
            (request.query_params.get("student_email") or "").strip().lower()
        )
        profile_email = student_email or getattr(user, "email", "") or ""
        profile = None
        if profile_email:
            profile, _ = StudentProfile.objects.get_or_create(
                email=profile_email,
                defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
            )
            if is_authenticated and not profile.user:
                profile.user = user
                profile.save(update_fields=["user"])
        if is_authenticated:
            username = user.get_username()
            display_name = (user.get_full_name() or username or "").strip()
            if not profile and user.email:
                profile, _ = StudentProfile.objects.get_or_create(
                    email=user.email,
                    defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
                )
        return {
            "is_teacher": is_teacher,
            "is_authenticated": is_authenticated,
            "username": username,
            "display_name": display_name,
            "stream": profile.stream if profile else Test.Stream.BOKMAAL,
            "level": profile.level if profile else Test.Level.A1,
            "allow_stream_change": profile.allow_stream_change if profile else True,
            "first_name": profile.first_name if profile else "",
            "last_name": profile.last_name if profile else "",
            "middle_name": profile.middle_name if profile else "",
            "date_of_birth": (
                profile.date_of_birth.isoformat()
                if profile and profile.date_of_birth
                else None
            ),
            "learning_language": profile.learning_language if profile else "",
            "native_language": profile.native_language if profile else "",
        }

    @action(detail=False, methods=["get"])
    def me(self, request):
        payload = self._build_profile_payload(request)
        return Response(payload)

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
        profile, _ = StudentProfile.objects.get_or_create(
            email=email,
            defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
        )
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

        name = (request.data.get("name") or "").strip()
        if name:
            first, *rest = name.split(" ", 1)
            user.first_name = first
            if rest:
                user.last_name = rest[0]
            user.save(update_fields=["first_name", "last_name"])

        profile = None
        if user.email:
            profile, _ = StudentProfile.objects.get_or_create(
                email=user.email,
                defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
            )
            for field in [
                "last_name",
                "first_name",
                "middle_name",
                "learning_language",
                "native_language",
            ]:
                if field in request.data:
                    setattr(profile, field, (request.data.get(field) or "").strip())
            if "date_of_birth" in request.data:
                dob_raw = (request.data.get("date_of_birth") or "").strip()
                if dob_raw:
                    try:
                        profile.date_of_birth = datetime.date.fromisoformat(dob_raw)
                    except ValueError:
                        return Response(
                            {"detail": "Invalid date_of_birth format. Use YYYY-MM-DD."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    profile.date_of_birth = None
            profile.save()

        payload = self._build_profile_payload(request, profile=profile)
        return Response(payload)

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

        username = email
        user = user_model.objects.create_user(
            username=username,
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

        login(request, user)

        display_name = (user.get_full_name() or user.get_username() or "").strip()
        is_teacher = bool(user.is_staff or user.is_superuser)

        return Response(
            {
                "is_teacher": is_teacher,
                "is_authenticated": True,
                "username": user.get_username(),
                "display_name": display_name,
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

        user_model = get_user_model()
        normalized_identifier = identifier.strip()
        user = authenticate(request, username=normalized_identifier, password=password)
        if user is None:
            user_by_email = None
            if "@" in normalized_identifier:
                user_by_email = user_model.objects.filter(
                    email__iexact=normalized_identifier
                ).first()
            else:
                user_by_email = user_model.objects.filter(
                    username__iexact=normalized_identifier
                ).first()
            if user_by_email is not None:
                user = authenticate(
                    request,
                    username=user_by_email.get_username(),
                    password=password,
                )
        if user is None:
            return Response(
                {"detail": "Invalid username/email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)

        profile_email = (user.email or "").strip().lower()
        profile, created = StudentProfile.objects.get_or_create(
            email=profile_email,
            defaults={"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
        )
        if profile.user_id != user.id:
            profile.user = user
            profile.save(update_fields=["user"])

        display_name = (user.get_full_name() or user.get_username() or "").strip()
        is_teacher = bool(user.is_staff or user.is_superuser)

        return Response(
            {
                "is_teacher": is_teacher,
                "is_authenticated": True,
                "username": user.get_username(),
                "display_name": display_name,
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
        user = request.user
        if not email and user and user.is_authenticated:
            email = (user.email or "").strip().lower()

        if not email:
            return Response(
                {"detail": "Email is required to fetch progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submissions = Submission.objects.filter(email=email).select_related("test")
        submissions = submissions.order_by("-created_at")
        tests_taken = submissions.count()

        by_level_map: Dict[str, Dict[str, Any]] = {}
        for sub in submissions:
            level = sub.test.level
            entry = by_level_map.setdefault(
                level, {"level": level, "tests": 0, "total_percent": 0.0}
            )
            entry["tests"] += 1
            entry["total_percent"] += sub.percent

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

        return Response(
            {
                "email": email,
                "tests_taken": tests_taken,
                "last_submission": last_payload,
                "by_level": by_level,
            }
        )


class FilteredStreamLevelMixin:
    def filter_by_stream_level(self, qs):
        stream = (self.request.query_params.get("stream") or "").strip().lower()
        level = (self.request.query_params.get("level") or "").strip().upper()
        email = (self.request.query_params.get("student_email") or "").strip().lower()
        if stream and hasattr(qs.model, "stream"):
            qs = qs.filter(stream=stream)
        if level and hasattr(qs.model, "level"):
            qs = qs.filter(level=level)
        if hasattr(qs.model, "assigned_to_email") and email:
            qs = qs.filter(
                models.Q(assigned_to_email__isnull=True)
                | models.Q(assigned_to_email=email)
            )
        return qs


class MaterialViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = MaterialSerializer

    def get_queryset(self):
        qs = Material.objects.filter(is_published=True)
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "level", "title"
        )


class HomeworkViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = HomeworkSerializer

    def get_queryset(self):
        qs = Homework.objects.filter(status=Homework.Status.PUBLISHED)
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "-due_date", "-created_at"
        )


class ExerciseViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ExerciseSerializer

    def get_queryset(self):
        qs = Exercise.objects.all()
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "level", "title"
        )


class VerbEntryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = VerbEntrySerializer

    def get_queryset(self):
        qs = VerbEntry.objects.all()
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "verb"
        )


class ExpressionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ExpressionSerializer

    def get_queryset(self):
        qs = Expression.objects.all()
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "phrase"
        )


class GlossaryTermViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = GlossaryTermSerializer

    def get_queryset(self):
        qs = GlossaryTerm.objects.all()
        stream = (self.request.query_params.get("stream") or "").strip().lower()
        if stream:
            qs = qs.filter(stream=stream)
        search_term = (self.request.query_params.get("q") or "").strip()
        if search_term:
            qs = qs.filter(
                models.Q(term__icontains=search_term)
                | models.Q(translation__icontains=search_term)
                | models.Q(translation_en__icontains=search_term)
                | models.Q(translation_ru__icontains=search_term)
                | models.Q(translation_nb__icontains=search_term)
                | models.Q(translation_nn__icontains=search_term)
                | models.Q(explanation__icontains=search_term)
            )
        return qs.order_by("term")


class ReadingViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ReadingSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        qs = Reading.objects.filter(is_published=True)
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "level", "title"
        )
