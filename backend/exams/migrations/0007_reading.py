import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0006_verbentry_translations"),
    ]

    operations = [
        migrations.CreateModel(
            name="Reading",
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
                ("title", models.CharField(max_length=255)),
                ("slug", models.SlugField(max_length=255, unique=True)),
                (
                    "stream",
                    models.CharField(
                        choices=[
                            ("bokmaal", "Bokmal"),
                            ("nynorsk", "Nynorsk"),
                            ("english", "English"),
                        ],
                        default="bokmaal",
                        max_length=20,
                    ),
                ),
                (
                    "level",
                    models.CharField(
                        choices=[
                            ("A1", "A1 - Beginner"),
                            ("A2", "A2 - Elementary"),
                            ("B1", "B1 - Intermediate"),
                            ("B2", "B2 - Upper-intermediate"),
                        ],
                        default="A1",
                        max_length=2,
                    ),
                ),
                ("body", models.TextField()),
                ("translation", models.TextField(blank=True)),
                ("tags", models.JSONField(blank=True, default=list)),
                ("is_published", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["level", "title"],
            },
        ),
    ]
