from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0023_expression_drop_meaning_and_reset"),
    ]

    operations = [
        migrations.AddField(
            model_name="expression",
            name="meaning_nn",
            field=models.TextField(blank=True, default=""),
        ),
    ]
