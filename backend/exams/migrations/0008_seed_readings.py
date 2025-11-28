from django.db import migrations


def seed_readings(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    if Reading.objects.exists():
        return

    samples = [
        {
            "slug": "bokmaal-morgenrutine",
            "title": "Morgenrutine i Oslo",
            "stream": "bokmaal",
            "level": "A2",
            "tags": ["hverdag", "byliv"],
            "body": (
                "Jeg står opp klokken halv sju hver morgen. Først lager jeg kaffe og "
                "åpner vinduet for å kjenne den friske luften fra gata. På vei til jobb "
                "går jeg forbi en liten baker hvor de selger varme rundstykker. Jeg prøver "
                "å lese avisen på norsk mens jeg spiser frokost. Det hjelper meg å lære nye ord."
            ),
            "translation": (
                "I get up at 6:30 every morning. First I make coffee and open the window to "
                "feel the fresh air from the street. On my way to work I pass a small bakery "
                "where they sell warm rolls. I try to read the newspaper in Norwegian while "
                "I eat breakfast. It helps me learn new words."
            ),
        },
        {
            "slug": "nynorsk-fjelltur",
            "title": "Ei kort fjelltur",
            "stream": "nynorsk",
            "level": "B1",
            "tags": ["natur", "reise"],
            "body": (
                "Laurdag tok vi bussen til eit lite fjell utanfor byen. Stien var bratt, "
                "men utsikta på toppen var verdt strevet. Vi såg fjordar og små bygder "
                "som låg som perler langs vatnet. Etterpå drakk vi kakao frå termos og "
                "skreiv nokre setningar i ei notatbok for å hugse nye ord."
            ),
            "translation": (
                "On Saturday we took the bus to a small mountain outside the city. "
                "The path was steep, but the view at the top was worth the effort. "
                "We saw fjords and small villages that looked like pearls along the water. "
                "Afterwards we drank cocoa from a thermos and wrote a few sentences in a "
                "notebook to remember new words."
            ),
        },
        {
            "slug": "english-study-spot",
            "title": "A quiet study spot",
            "stream": "english",
            "level": "A2",
            "tags": ["study", "daily"],
            "body": (
                "On weekdays I go to a small library near my apartment. It opens early and "
                "is usually quiet. I bring my Norwegian textbook and a notebook. First I read "
                "one short article, then I write down five new words and try to use them in "
                "sentences. After an hour I take a break, drink tea, and listen to a short "
                "podcast episode."
            ),
            "translation": (
                "В будни я хожу в маленькую библиотеку недалеко от дома. Она открывается рано "
                "и там обычно тихо. Я беру учебник норвежского и тетрадь. Сначала читаю одну "
                "короткую статью, затем записываю пять новых слов и стараюсь использовать их "
                "в предложениях. Через час делаю паузу, пью чай и слушаю короткий выпуск подкаста."
            ),
        },
    ]

    Reading.objects.bulk_create(Reading(**item) for item in samples)


def unseed_readings(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    Reading.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0007_reading"),
    ]

    operations = [
        migrations.RunPython(seed_readings, reverse_code=unseed_readings),
    ]
