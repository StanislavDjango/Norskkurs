from django.db import migrations


def add_readings(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    samples = [
        {
            "slug": "bokmaal-kafe-praksis",
            "title": "Språkkafé etter timen",
            "stream": "bokmaal",
            "level": "A2",
            "tags": ["hverdag", "sprak"],
            "body": (
                "Etter timen møtes vi på en liten kafé for å øve norsk. "
                "Vi bestiller kaffe og snakker om planene for helgen. "
                "Hver person deler ett nytt ord de lærte i dag. "
                "Etter en halvtime skriver vi setninger med de nye ordene."
            ),
            "translation": (
                "After class we meet at a small café to practice Norwegian. "
                "We order coffee and talk about weekend plans. "
                "Each person shares one new word they learned today. "
                "After half an hour we write sentences with the new words."
            ),
        },
        {
            "slug": "nynorsk-kafe-praksis",
            "title": "Språkkafé etter timen",
            "stream": "nynorsk",
            "level": "A2",
            "tags": ["kvardag", "språk"],
            "body": (
                "Etter timen møtest vi på ein liten kafé for å øve norsk. "
                "Vi bestiller kaffe og snakkar om planane for helga. "
                "Kvar person deler eitt nytt ord dei lærte i dag. "
                "Etter ei halv time skriv vi setningar med dei nye orda."
            ),
            "translation": (
                "After class we meet at a small café to practice Norwegian. "
                "We order coffee and talk about weekend plans. "
                "Each person shares one new word they learned today. "
                "After half an hour we write sentences with the new words."
            ),
        },
        {
            "slug": "english-cafe-practice",
            "title": "Practice at the café",
            "stream": "english",
            "level": "A2",
            "tags": ["daily", "study"],
            "body": (
                "After class we meet at a small café to practice Norwegian. "
                "We order coffee and talk about our weekend plans. "
                "Each person shares one new word they learned today. "
                "After half an hour we write sentences with the new words."
            ),
            "translation": (
                "После занятия мы встречаемся в маленьком кафе, чтобы практиковать норвежский. "
                "Мы заказываем кофе и обсуждаем планы на выходные. "
                "Каждый делится одним новым словом, которое выучил сегодня. "
                "Через полчаса мы пишем предложения с этими новыми словами."
            ),
        },
    ]

    for data in samples:
        Reading.objects.update_or_create(slug=data["slug"], defaults=data)


def remove_readings(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    slugs = [
        "bokmaal-kafe-praksis",
        "nynorsk-kafe-praksis",
        "english-cafe-practice",
    ]
    Reading.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0008_seed_readings"),
    ]

    operations = [
        migrations.RunPython(add_readings, reverse_code=remove_readings),
    ]
