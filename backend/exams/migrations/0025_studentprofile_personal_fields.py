from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0024_expression_meaning_nn"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="last_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="first_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="middle_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="learning_language",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="native_language",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
    ]
