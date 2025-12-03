from django.db import migrations, models


def reset_glossary_to_sample(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    GlossaryTerm.objects.all().delete()
    GlossaryTerm.objects.create(
        term="job",
        translation="job",
        translation_en="job",
        translation_ru="работа",
        translation_nn="jobb",
        translation_nb="jobb",
        explanation="Example: Jeg har en ny jobb.",
        stream="english",
        level="A1",
        tags=["jobs", "yrke"],
    )


def noop(apps, schema_editor):
    # We keep existing data on reverse migrations.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0019_reading_title_multilang"),
    ]

    operations = [
        migrations.AddField(
            model_name="glossaryterm",
            name="translation_nn",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.RunPython(reset_glossary_to_sample, reverse_code=noop),
    ]
