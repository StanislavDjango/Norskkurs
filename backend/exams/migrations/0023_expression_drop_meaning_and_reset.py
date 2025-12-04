from django.db import migrations


def reset_expressions(apps, schema_editor):
    Expression = apps.get_model("exams", "Expression")
    Expression.objects.all().delete()
    Expression.objects.create(
        phrase="å miste kontakten",
        meaning_en="to lose contact",
        meaning_nb="å miste kontakten",
        meaning_ru="потерять связь",
        example="Vi mistet kontakten etter at hun flyttet til en annen by.",
        stream="bokmaal",
        tags=["relationships"],
    )


def noop(apps, schema_editor):
    # Do not modify data on reverse. The schema change is irreversible.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0022_expression_multilang_meaning"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="expression",
            name="meaning",
        ),
        migrations.RunPython(reset_expressions, reverse_code=noop),
    ]
