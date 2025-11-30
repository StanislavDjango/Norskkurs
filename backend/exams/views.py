from __future__ import annotations

from typing import Any, Dict, Optional

from django.contrib.auth import logout
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
    MaterialSerializer,
    ReadingSerializer,
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

    @action(detail=False, methods=["get"])
    def me(self, request):
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
        return Response(
            {
                "is_teacher": is_teacher,
                "is_authenticated": is_authenticated,
                "username": username,
                "display_name": display_name,
                "stream": profile.stream if profile else Test.Stream.BOKMAAL,
                "level": profile.level if profile else Test.Level.A1,
                "allow_stream_change": profile.allow_stream_change if profile else True,
            }
        )

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
