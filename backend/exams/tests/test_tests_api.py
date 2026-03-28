from django.urls import reverse
from exams.models import Assignment, Test
from rest_framework import status
from rest_framework.test import APITestCase


class TestsApiTests(APITestCase):
    def setUp(self):
        self.public_test = Test.objects.create(
            title="Public A1",
            slug="public-a1",
            level=Test.Level.A1,
            stream=Test.Stream.BOKMAAL,
            is_published=True,
        )
        self.restricted_test = Test.objects.create(
            title="Restricted B1",
            slug="restricted-b1",
            level=Test.Level.B1,
            stream=Test.Stream.BOKMAAL,
            is_published=True,
            is_restricted=True,
        )

    def test_list_hides_restricted_tests_without_assignment(self):
        response = self.client.get(reverse("test-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item["slug"] for item in response.data]
        self.assertEqual(slugs, ["public-a1"])

    def test_list_includes_assigned_restricted_test(self):
        Assignment.objects.create(
            test=self.restricted_test,
            student_email="student@example.com",
        )

        response = self.client.get(
            reverse("test-list"),
            {"student_email": "student@example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = {item["slug"] for item in response.data}
        self.assertEqual(slugs, {"public-a1", "restricted-b1"})

    def test_restricted_submit_requires_assignment(self):
        response = self.client.post(
            reverse("test-submit", kwargs={"slug": self.restricted_test.slug}),
            {
                "email": "student@example.com",
                "answers": [],
                "name": "Student",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
