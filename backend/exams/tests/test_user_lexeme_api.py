from django.contrib.auth import get_user_model
from django.urls import reverse
from exams.models import GlossaryTerm, UserLexeme
from rest_framework import status
from rest_framework.test import APIClient, APITestCase


class UserLexemeApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="student", email="student@example.com", password="pass1234"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.list_url = reverse("user-lexemes-list")
        self.toggle_url = reverse("user-lexemes-toggle-favorite")
        self.glossary = GlossaryTerm.objects.create(
            term="hei",
            translation_en="hi",
            translation_nb="hei",
            translation_nn="hei",
            translation_ru="привет",
            stream="bokmaal",
            level="A1",
        )

    def test_requires_auth(self):
        client = APIClient()
        resp = client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_custom_entry(self):
        payload = {
            "text": "custom phrase",
            "translation_en": "custom",
            "language": "english",
            "level": "A2",
            "tags": ["custom"],
            "source": "custom",
        }
        resp = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserLexeme.objects.filter(user=self.user).count(), 1)

    def test_toggle_glossary_creates_and_archives(self):
        resp = self.client.post(
            self.toggle_url,
            {"glossary_term": self.glossary.id, "concept_key": "hi|hei|||"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data.get("is_favorite"))
        self.assertEqual(
            UserLexeme.objects.filter(user=self.user, is_archived=False).count(), 1
        )

        resp2 = self.client.post(
            self.toggle_url,
            {"glossary_term": self.glossary.id, "concept_key": "hi|hei|||"},
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertFalse(resp2.data.get("is_favorite"))
        self.assertEqual(
            UserLexeme.objects.filter(user=self.user, is_archived=False).count(), 0
        )

    def test_list_filters_by_user(self):
        other_user = get_user_model().objects.create_user(
            username="other", email="other@example.com", password="pass1234"
        )
        UserLexeme.objects.create(
            user=other_user,
            source="custom",
            kind="word",
            text="secret",
            translation_en="secret",
            concept_key="secret|||",
        )
        UserLexeme.objects.create(
            user=self.user,
            source="custom",
            kind="word",
            text="mine",
            translation_en="mine",
            concept_key="mine|||",
        )
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)
        self.assertEqual(resp.data["results"][0]["text"], "mine")
