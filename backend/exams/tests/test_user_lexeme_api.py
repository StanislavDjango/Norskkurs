import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
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
        self.export_url = reverse("user-lexemes-export-csv")
        self.import_url = reverse("user-lexemes-import-csv")
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

    def test_export_csv_returns_rows(self):
        UserLexeme.objects.create(
            user=self.user,
            source="custom",
            kind="word",
            text="export me",
            translation_en="export",
            concept_key="export|||",
        )
        resp = self.client.get(self.export_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        content = resp.content.decode("utf-8")
        self.assertIn("text", content.splitlines()[0])
        self.assertIn("export me", content)

    def test_import_csv_creates_custom(self):
        csv_content = io.StringIO()
        csv_content.write(
            "source;kind;text;translation_en;translation_nb;translation_nn;"
            "translation_ru;notes;example;tags;language;level;glossary_term\n"
        )
        csv_content.write(
            "custom;word;imported;hello;;;;note;example;tag1,tag2;english;A1;\n"
        )
        upload = SimpleUploadedFile(
            "lexemes.csv",
            csv_content.getvalue().encode("utf-8"),
            content_type="text/csv",
        )
        resp = self.client.post(self.import_url, {"file": upload}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["created"], 1)
        self.assertEqual(UserLexeme.objects.filter(user=self.user).count(), 1)
