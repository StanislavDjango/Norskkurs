from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0017_reading_multilang_and_reset"),
    ]

    operations = [
        migrations.RenameField(
            model_name="reading",
            old_name="translation",
            new_name="translation_ru",
        ),
        migrations.AddField(
            model_name="reading",
            name="translation_en",
            field=models.TextField(blank=True, default=""),
        ),
    ]
