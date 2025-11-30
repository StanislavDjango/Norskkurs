from django.db import migrations


def seed_more_glossary(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    items = [
        # set 1: book
        {
            "term": "bok",
            "translation": "book",
            "translation_en": "book",
            "translation_ru": "книга",
            "translation_nb": "bok",
            "explanation": "Jeg kjøper en ny bok i dag. (Norwegian Bokmål)",
            "stream": "bokmaal",
            "level": "A1",
            "tags": ["hverdag"],
        },
        {
            "term": "bok",
            "translation": "book",
            "translation_en": "book",
            "translation_ru": "книга",
            "translation_nb": "bok",
            "explanation": "Eg låner ei bok frå biblioteket. (Nynorsk)",
            "stream": "nynorsk",
            "level": "A1",
            "tags": ["kvardag"],
        },
        {
            "term": "book",
            "translation": "книга",
            "translation_en": "book",
            "translation_ru": "книга",
            "translation_nb": "bok",
            "explanation": "I read a book every evening. (English)",
            "stream": "english",
            "level": "A1",
            "tags": ["daily"],
        },
        # set 2: train
        {
            "term": "tog",
            "translation": "train",
            "translation_en": "train",
            "translation_ru": "поезд",
            "translation_nb": "tog",
            "explanation": "Toget går klokka åtte. (Bokmål)",
            "stream": "bokmaal",
            "level": "A1",
            "tags": ["reise"],
        },
        {
            "term": "tog",
            "translation": "train",
            "translation_en": "train",
            "translation_ru": "поезд",
            "translation_nb": "tog",
            "explanation": "Toget kjem om fem minutt. (Nynorsk)",
            "stream": "nynorsk",
            "level": "A1",
            "tags": ["reise"],
        },
        {
            "term": "train",
            "translation": "поезд",
            "translation_en": "train",
            "translation_ru": "поезд",
            "translation_nb": "tog",
            "explanation": "The train is usually on time. (English)",
            "stream": "english",
            "level": "A1",
            "tags": ["travel"],
        },
        # set 3: teacher
        {
            "term": "lærer",
            "translation": "teacher",
            "translation_en": "teacher",
            "translation_ru": "учитель",
            "translation_nb": "lærer",
            "explanation": "Læreren hjelper oss med grammatikk. (Bokmål)",
            "stream": "bokmaal",
            "level": "A1",
            "tags": ["skole"],
        },
        {
            "term": "lærar",
            "translation": "teacher",
            "translation_en": "teacher",
            "translation_ru": "учитель",
            "translation_nb": "lærar",
            "explanation": "Læraren forklarer nye ord. (Nynorsk)",
            "stream": "nynorsk",
            "level": "A1",
            "tags": ["skule"],
        },
        {
            "term": "teacher",
            "translation": "учитель",
            "translation_en": "teacher",
            "translation_ru": "учитель",
            "translation_nb": "lærer",
            "explanation": "The teacher gives us a short text to read. (English)",
            "stream": "english",
            "level": "A1",
            "tags": ["school"],
        },
    ]
    for item in items:
        GlossaryTerm.objects.update_or_create(
            term=item["term"],
            stream=item["stream"],
            level=item["level"],
            defaults=item,
        )


def unseed_more_glossary(apps, schema_editor):
    GlossaryTerm = apps.get_model("exams", "GlossaryTerm")
    terms = ["bok", "train", "lærer", "lærar", "teacher", "tog"]
    GlossaryTerm.objects.filter(term__in=terms).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0011_glossary_samples_to_a1"),
    ]

    operations = [
        migrations.RunPython(seed_more_glossary, reverse_code=unseed_more_glossary),
    ]
