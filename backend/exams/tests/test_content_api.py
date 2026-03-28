from django.urls import reverse
from exams.models import Homework, Material, Reading, Test
from rest_framework import status
from rest_framework.test import APITestCase


class ContentApiTests(APITestCase):
    def test_materials_filter_by_stream_and_level(self):
        Material.objects.create(
            title="A1 Bokmaal",
            stream=Test.Stream.BOKMAAL,
            level=Test.Level.A1,
            is_published=True,
        )
        Material.objects.create(
            title="B2 English",
            stream=Test.Stream.ENGLISH,
            level=Test.Level.B2,
            is_published=True,
        )

        response = self.client.get(
            reverse("materials-list"),
            {"stream": Test.Stream.BOKMAAL, "level": Test.Level.A1},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "A1 Bokmaal")

    def test_homework_respects_student_assignment_filter(self):
        Homework.objects.create(
            title="Open homework",
            stream=Test.Stream.BOKMAAL,
            level=Test.Level.A1,
            status=Homework.Status.PUBLISHED,
            assigned_to_email=None,
        )
        Homework.objects.create(
            title="Private homework",
            stream=Test.Stream.BOKMAAL,
            level=Test.Level.A1,
            status=Homework.Status.PUBLISHED,
            assigned_to_email="student@example.com",
        )
        Homework.objects.create(
            title="Other student homework",
            stream=Test.Stream.BOKMAAL,
            level=Test.Level.A1,
            status=Homework.Status.PUBLISHED,
            assigned_to_email="other@example.com",
        )

        response = self.client.get(
            reverse("homework-list"),
            {"student_email": "student@example.com"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertEqual(titles, {"Open homework", "Private homework"})

    def test_readings_hide_unpublished_items(self):
        Reading.objects.create(
            title="Visible reading",
            slug="visible-reading",
            stream=Test.Stream.BOKMAAL,
            level=Test.Level.A1,
            body="Hei verden",
            is_published=True,
        )
        Reading.objects.create(
            title="Hidden reading",
            slug="hidden-reading",
            stream=Test.Stream.BOKMAAL,
            level=Test.Level.A1,
            body="Skjult",
            is_published=False,
        )

        response = self.client.get(reverse("readings-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = {item["slug"] for item in response.data}
        self.assertIn("visible-reading", slugs)
        self.assertNotIn("hidden-reading", slugs)
