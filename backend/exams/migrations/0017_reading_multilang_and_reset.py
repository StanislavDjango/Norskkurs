from django.db import migrations, models


def reset_readings(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    Reading.objects.all().delete()

    Reading.objects.create(
        title="Evening walk in the city",
        slug="a1-evening-walk",
        stream="english",
        level="A1",
        body=(
            "In the evening I like to take a short walk near my home. "
            "I put on a warm jacket and comfortable shoes. "
            "First I walk past a small park where children play. "
            "Then I go down the street and look at the lights in the windows. "
            "Sometimes I listen to a podcast in Norwegian while I walk. "
            "After twenty minutes I walk back home and make a cup of tea."
        ),
        translation=(
            "Вечером я люблю делать небольшую прогулку рядом с домом. "
            "Я надеваю тёплую куртку и удобную обувь. "
            "Сначала я прохожу мимо небольшого парка, где играют дети. "
            "Потом иду по улице и смотрю на огни в окнах. "
            "Иногда во время прогулки я слушаю подкаст на норвежском языке. "
            "Через двадцать минут я возвращаюсь домой и делаю себе чашку чая."
        ),
        translation_nb=(
            "Om kvelden liker eg å ta ein kort tur nær heimen min. "
            "Eg tek på meg ei varm jakke og gode sko. "
            "Først går eg forbi ein liten park der barna leikar. "
            "Så går eg nedover gata og ser på lysa i vindauga. "
            "Av og til høyrer eg på ein podkast på norsk medan eg går. "
            "Etter tjue minutt går eg heim igjen og lagar meg ein kopp te."
        ),
        translation_nn=(
            "Om kvelden liker jeg å gå en liten tur i nærheten av hjemmet. "
            "Jeg tar på meg en varm jakke og gode sko. "
            "Først går jeg forbi en liten park hvor barna leker. "
            "Deretter går jeg nedover gaten og ser på lysene i vinduene. "
            "Noen ganger hører jeg på en podcast på norsk mens jeg går. "
            "Etter tjue minutter går jeg hjem igjen og lager meg en kopp te."
        ),
        tags=["A1", "everyday", "walk"],
        is_published=True,
    )


def unreset_readings(apps, schema_editor):
    Reading = apps.get_model("exams", "Reading")
    Reading.objects.filter(slug="a1-evening-walk").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0016_reset_glossary_sample2"),
    ]

    operations = [
        migrations.AddField(
            model_name="reading",
            name="translation_nb",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="reading",
            name="translation_nn",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.RunPython(reset_readings, reverse_code=unreset_readings),
    ]
