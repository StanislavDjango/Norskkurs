from __future__ import annotations

from typing import Any, Dict, Optional

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Answer, Option, Question, Submission, Test
from .serializers import (
    AnswerInputSerializer,
    AnswerSerializer,
    SubmissionSerializer,
    TestDetailSerializer,
    TestListSerializer,
)


class TestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        Test.objects.filter(is_published=True)
        .prefetch_related("questions__options")
        .order_by("level", "title")
    )
    serializer_class = TestListSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TestDetailSerializer
        return super().get_serializer_class()

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, **kwargs):
        test = self.get_object()
        answers_payload = request.data.get("answers", [])
        serializer = AnswerInputSerializer(data=answers_payload, many=True)
        serializer.is_valid(raise_exception=True)
        validated_answers = serializer.validated_data

        submission = Submission.objects.create(
            test=test,
            name=request.data.get("name", "").strip(),
            email=request.data.get("email", "").strip(),
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
