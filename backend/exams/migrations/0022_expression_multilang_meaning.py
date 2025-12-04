from django.db import migrations, models


def populate_expression_meanings(apps, schema_editor):
    Expression = apps.get_model("exams", "Expression")
    for expr in Expression.objects.all():
        if expr.meaning and not (expr.meaning_en or expr.meaning_nb or expr.meaning_ru):
            # Existing data is in the legacy "meaning" field.
            # Treat it as Russian by default (current sample is RU).
            expr.meaning_ru = expr.meaning
            expr.save(update_fields=["meaning_ru"])


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0021_seed_expression_sample"),
    ]

    operations = [
        migrations.AddField(
            model_name="expression",
            name="meaning_en",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="expression",
            name="meaning_nb",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="expression",
            name="meaning_ru",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.RunPython(populate_expression_meanings, migrations.RunPython.noop),
    ]
