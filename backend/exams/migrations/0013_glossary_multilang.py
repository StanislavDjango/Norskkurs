from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0012_seed_glossary_extras"),
    ]

    operations = [
        migrations.AddField(
            model_name="glossaryterm",
            name="translation_en",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="glossaryterm",
            name="translation_ru",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="glossaryterm",
            name="translation_nb",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
