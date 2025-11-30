from django.db import migrations


def seed_glossary(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    samples = [
        {
            "term": "kafe",
            "translation": "café",
            "translation_en": "café",
            "translation_ru": "кафе",
            "translation_nb": "kafe",
            "explanation": "En liten kafe i byen, eksempel: Vi møtes på kafe etter timen.",
            "stream": "bokmaal",
            "level": "A2",
            "tags": ["hverdag", "sted"],
        },
        {
            "term": "notatbok",
            "translation": "notebook",
            "translation_en": "notebook",
            "translation_ru": "блокнот",
            "translation_nb": "notatbok",
            "explanation": "Ei bok for å skrive nye ord, eksempel: Han skriver setninger i notatboka.",
            "stream": "nynorsk",
            "level": "A2",
            "tags": ["studie"],
        },
        {
            "term": "practice",
            "translation": "практика",
            "translation_en": "practice",
            "translation_ru": "практика",
            "translation_nb": "øving",
            "explanation": "To practice Norwegian at a café, example: We practice new words together.",
            "stream": "english",
            "level": "A2",
            "tags": ["study"],
        },
    ]
    for item in samples:
        GlossaryTerm.objects.update_or_create(
            term=item["term"], stream=item["stream"], level=item["level"], defaults=item
        )


def unseed_glossary(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    terms = ["kafe", "notatbok", "practice"]
    GlossaryTerm.objects.filter(term__in=terms).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0009_add_more_readings"),
    ]

    operations = [
        migrations.RunPython(seed_glossary, reverse_code=unseed_glossary),
    ]
