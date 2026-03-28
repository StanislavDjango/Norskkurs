from django.contrib.auth import get_user_model
from django.urls import reverse
from exams.models import StudentProfile, Submission, Test
from rest_framework import status
from rest_framework.test import APITestCase


class ProfileApiTests(APITestCase):
    def test_register_creates_user_and_profile(self):
        response = self.client.post(
            reverse("profile-register"),
            {
                "email": "student@example.com",
                "password": "pass1234",
                "name": "Student Demo",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_authenticated"])
        self.assertTrue(
            get_user_model().objects.filter(email="student@example.com").exists()
        )
        self.assertTrue(
            StudentProfile.objects.filter(email="student@example.com").exists()
        )

    def test_me_returns_authenticated_profile_data(self):
        user = get_user_model().objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="pass1234",
            first_name="Student",
            last_name="Demo",
        )
        StudentProfile.objects.create(
            user=user,
            email=user.email,
            stream=Test.Stream.NYNORSK,
            level=Test.Level.B1,
            first_name="Student",
            last_name="Demo",
            native_language="ru",
        )
        self.client.force_authenticate(user)

        response = self.client.get(reverse("profile-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_authenticated"])
        self.assertEqual(response.data["stream"], Test.Stream.NYNORSK)
        self.assertEqual(response.data["level"], Test.Level.B1)
        self.assertEqual(response.data["native_language"], "ru")

    def test_progress_uses_authenticated_user_email_by_default(self):
        user = get_user_model().objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="pass1234",
        )
        test = Test.objects.create(
            title="A1 demo",
            slug="a1-demo",
            level=Test.Level.A1,
            stream=Test.Stream.BOKMAAL,
            is_published=True,
        )
        Submission.objects.create(
            test=test,
            email="student@example.com",
            score=3,
            total_questions=4,
        )
        self.client.force_authenticate(user)

        response = self.client.get(reverse("profile-progress"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "student@example.com")
        self.assertEqual(response.data["tests_taken"], 1)
        self.assertEqual(response.data["last_submission"]["test_title"], "A1 demo")
