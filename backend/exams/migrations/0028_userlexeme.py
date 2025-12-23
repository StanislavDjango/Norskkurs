import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("exams", "0027_verbentry_part_of_speech"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserLexeme",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "source",
                    models.CharField(
                        choices=[("glossary", "Glossary"), ("custom", "Custom")],
                        default="custom",
                        max_length=20,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[("word", "Word"), ("sentence", "Sentence")],
                        default="word",
                        max_length=20,
                    ),
                ),
                (
                    "concept_key",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                ("text", models.TextField(blank=True, default="")),
                ("translation_en", models.TextField(blank=True, default="")),
                ("translation_ru", models.TextField(blank=True, default="")),
                ("translation_nb", models.TextField(blank=True, default="")),
                ("translation_nn", models.TextField(blank=True, default="")),
                ("example", models.TextField(blank=True, default="")),
                ("notes", models.TextField(blank=True, default="")),
                ("tags", models.JSONField(blank=True, default=list)),
                (
                    "language",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("bokmaal", "Bokmal"),
                            ("nynorsk", "Nynorsk"),
                            ("english", "English"),
                        ],
                        default="",
                        max_length=20,
                    ),
                ),
                (
                    "level",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("A1", "A1 - Beginner"),
                            ("A2", "A2 - Elementary"),
                            ("B1", "B1 - Intermediate"),
                            ("B2", "B2 - Upper-intermediate"),
                        ],
                        default="",
                        max_length=2,
                    ),
                ),
                ("times_reviewed", models.PositiveIntegerField(default=0)),
                ("times_correct", models.PositiveIntegerField(default=0)),
                ("last_reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("is_archived", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "glossary_term",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="user_lexemes",
                        to="exams.glossaryterm",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lexemes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="userlexeme",
            index=models.Index(
                fields=["user", "concept_key", "is_archived"],
                name="exams_user_user_id_1293be_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="userlexeme",
            index=models.Index(
                fields=["user", "source"], name="exams_user_user_id_3c67bb_idx"
            ),
        ),
    ]
