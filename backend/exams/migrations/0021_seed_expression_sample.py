from django.db import migrations


def seed_expression_sample(apps, schema_editor):
    Expression = apps.get_model("exams", "Expression")
    sample, created = Expression.objects.get_or_create(
        phrase="å miste kontakten",
        stream="bokmaal",
        defaults={
            "meaning": "потерять связь",
            "example": "Vi mistet kontakten etter at hun flyttet til en annen by.",
            "tags": ["relationships"],
        },
    )


def noop(apps, schema_editor):
    # Do not delete data on reverse migration.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0020_glossary_translation_nn_and_reset"),
    ]

    operations = [
        migrations.RunPython(seed_expression_sample, reverse_code=noop),
    ]
