from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0005_remove_verbentry_examples_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="verbentry",
            name="translation_en",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="verbentry",
            name="translation_nb",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="verbentry",
            name="translation_ru",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
