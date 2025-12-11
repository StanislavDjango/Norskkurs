from django.db import migrations, models
from django.utils import timezone


def seed_parts_of_speech(apps, schema_editor):
    VerbEntry = apps.get_model("exams", "VerbEntry")

    samples = [
        {
            "verb": "løpe",
            "part_of_speech": "verb",
            "infinitive": "løpe",
            "present": "løper",
            "past": "løp",
            "perfect": "har løpt",
            "translation_en": "run",
            "translation_ru": "бежать",
            "tags": ["irregular"],
        },
        {
            "verb": "bok",
            "part_of_speech": "noun",
            "infinitive": "bok",
            "present": "bok",
            "past": "bok",
            "perfect": "bok",
            "translation_en": "book",
            "translation_ru": "книга",
            "tags": ["noun"],
        },
        {
            "verb": "vakker",
            "part_of_speech": "adjective",
            "infinitive": "vakker",
            "present": "vakker",
            "past": "vakker",
            "perfect": "vakker",
            "translation_en": "beautiful",
            "translation_ru": "красивый",
            "tags": ["adjective"],
        },
        {
            "verb": "fort",
            "part_of_speech": "adverb",
            "infinitive": "fort",
            "present": "fort",
            "past": "fort",
            "perfect": "fort",
            "translation_en": "quickly",
            "translation_ru": "быстро",
            "tags": ["adverb"],
        },
        {
            "verb": "han",
            "part_of_speech": "pronoun",
            "infinitive": "han",
            "present": "han",
            "past": "han",
            "perfect": "han",
            "translation_en": "he",
            "translation_ru": "он",
            "tags": ["pronoun"],
        },
        {
            "verb": "to",
            "part_of_speech": "numeral",
            "infinitive": "to",
            "present": "to",
            "past": "to",
            "perfect": "to",
            "translation_en": "two",
            "translation_ru": "два",
            "tags": ["numeral"],
        },
        {
            "verb": "på",
            "part_of_speech": "preposition",
            "infinitive": "på",
            "present": "på",
            "past": "på",
            "perfect": "på",
            "translation_en": "on",
            "translation_ru": "на",
            "tags": ["preposition"],
        },
        {
            "verb": "og",
            "part_of_speech": "conjunction",
            "infinitive": "og",
            "present": "og",
            "past": "og",
            "perfect": "og",
            "translation_en": "and",
            "translation_ru": "и",
            "tags": ["conjunction"],
        },
        {
            "verb": "oi",
            "part_of_speech": "interjection",
            "infinitive": "oi",
            "present": "oi",
            "past": "oi",
            "perfect": "oi",
            "translation_en": "oops",
            "translation_ru": "ой",
            "tags": ["interjection"],
        },
    ]

    for sample in samples:
        VerbEntry.objects.get_or_create(
            verb=sample["verb"],
            stream="bokmaal",
            defaults={
                "part_of_speech": sample["part_of_speech"],
                "infinitive": sample["infinitive"],
                "present": sample["present"],
                "past": sample["past"],
                "perfect": sample["perfect"],
                "examples_infinitive": "",
                "examples_present": "",
                "examples_past": "",
                "examples_perfect": "",
                "translation_en": sample["translation_en"],
                "translation_ru": sample["translation_ru"],
                "translation_nb": "",
                "tags": sample.get("tags", []),
                "created_at": timezone.now(),
                "updated_at": timezone.now(),
            },
        )


def remove_seeded_parts(apps, schema_editor):
    VerbEntry = apps.get_model("exams", "VerbEntry")
    VerbEntry.objects.filter(
        verb__in=["løpe", "bok", "vakker", "fort", "han", "to", "på", "og", "oi"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0026_studentprofile_favorites"),
    ]

    operations = [
        migrations.AddField(
            model_name="verbentry",
            name="part_of_speech",
            field=models.CharField(
                choices=[
                    ("verb", "Verb"),
                    ("noun", "Noun"),
                    ("adjective", "Adjective"),
                    ("adverb", "Adverb"),
                    ("pronoun", "Pronoun"),
                    ("numeral", "Numeral"),
                    ("preposition", "Preposition"),
                    ("conjunction", "Conjunction"),
                    ("interjection", "Interjection"),
                ],
                default="verb",
                max_length=20,
            ),
        ),
        migrations.RunPython(seed_parts_of_speech, remove_seeded_parts),
    ]
