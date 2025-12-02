from django.db import migrations, models


def populate_reading_titles(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    for reading in Reading.objects.all():
        updated_fields = []
        if reading.stream == "english" and not reading.title_en:
            reading.title_en = reading.title
            updated_fields.append("title_en")
        if reading.stream == "bokmaal" and not reading.title_nb:
            reading.title_nb = reading.title
            updated_fields.append("title_nb")
        if reading.stream == "nynorsk" and not reading.title_nn:
            reading.title_nn = reading.title
            updated_fields.append("title_nn")
        if updated_fields:
            reading.save(update_fields=updated_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0018_reading_translation_en_and_ru_rename"),
    ]

    operations = [
        migrations.AddField(
            model_name="reading",
            name="title_en",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="reading",
            name="title_nb",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="reading",
            name="title_nn",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="reading",
            name="title_ru",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.RunPython(populate_reading_titles, migrations.RunPython.noop),
    ]
