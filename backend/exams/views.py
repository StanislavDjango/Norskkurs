from __future__ import annotations

from typing import Any, Dict, Optional

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Answer, Assignment, Option, Question, Submission, Test
from .serializers import (
    AnswerInputSerializer,
    AnswerSerializer,
    AssignmentSerializer,
    SubmissionSerializer,
    TestDetailSerializer,
    TestListSerializer,
)


class TestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TestListSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        base_qs = Test.objects.filter(is_published=True).prefetch_related("questions__options")
        email = self.request.query_params.get("student_email", "").strip().lower()
        if not email:
            return base_qs.filter(is_restricted=False).order_by("level", "title")

        allowed_ids = Assignment.objects.filter(
            student_email=email
        ).values_list("test_id", flat=True)
        return base_qs.filter(models.Q(is_restricted=False) | models.Q(id__in=allowed_ids)).order_by(
            "level", "title"
        )

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
            has_assignment = Assignment.objects.filter(test=test, student_email=email).exists()
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
                is_correct = normalized_response in correct_texts if correct_texts else False

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
    @action(detail=False, methods=["get"])
    def me(self, request):
        user = request.user
        is_authenticated = bool(user and user.is_authenticated)
        is_teacher = bool(is_authenticated and (user.is_staff or user.is_superuser))
        display_name = ""
        username = ""
        if is_authenticated:
            username = user.get_username()
            display_name = (user.get_full_name() or username or "").strip()
        return Response(
            {
                "is_teacher": is_teacher,
                "is_authenticated": is_authenticated,
                "username": username,
                "display_name": display_name,
            }
        )
