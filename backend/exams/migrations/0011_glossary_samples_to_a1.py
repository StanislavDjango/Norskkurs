from django.db import migrations


def to_a1(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    GlossaryTerm.objects.filter(term__in=["kafe", "notatbok", "practice"]).update(
        level="A1"
    )


def rollback(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    GlossaryTerm.objects.filter(term__in=["kafe", "notatbok", "practice"]).update(
        level="A2"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0010_seed_glossary_samples"),
    ]

    operations = [
        migrations.RunPython(to_a1, reverse_code=rollback),
    ]
