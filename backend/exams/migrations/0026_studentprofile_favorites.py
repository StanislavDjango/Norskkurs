from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0025_studentprofile_personal_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="vocab_favorites",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="expression_favorites",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
