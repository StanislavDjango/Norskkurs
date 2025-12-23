from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0028_userlexeme"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="userlexeme",
            index=models.Index(
                fields=["user", "glossary_term"], name="exams_user_user_id_gloss_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="userlexeme",
            index=models.Index(
                fields=["user", "kind"], name="exams_user_user_id_kind_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="userlexeme",
            index=models.Index(
                fields=["user", "language"], name="exams_user_user_id_lang_idx"
            ),
        ),
    ]
