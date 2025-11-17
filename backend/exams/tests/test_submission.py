from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from exams.models import Option, Question, Test


class TestSubmitCase(APITestCase):
    def setUp(self):
        self.test = Test.objects.create(
            title="Demo test",
            slug="demo-test",
            level=Test.Level.A1,
            is_published=True,
        )
        self.question = Question.objects.create(
            test=self.test,
            text="Velg rett ord",
            question_type=Question.QuestionType.SINGLE_CHOICE,
        )
        self.correct_option = Option.objects.create(
            question=self.question,
            text="riktig",
            is_correct=True,
        )
        Option.objects.create(question=self.question, text="feil", is_correct=False)

    def test_submit_scores_correct_answer(self):
        url = reverse("test-submit", kwargs={"slug": self.test.slug})
        response = self.client.post(
            url,
            {
                "answers": [{"question": self.question.id, "selected_option": self.correct_option.id}],
                "name": "Tester",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["summary"]["score"], 1)
        self.assertEqual(response.data["summary"]["percent"], 100)
