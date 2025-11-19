from __future__ import annotations

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from exams.models import VerbEntry, Test


class Command(BaseCommand):
    help = "Import verb entries from a CSV file (same structure as export)."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to the CSV file to import.")
        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing verbs (matched by stream + verb) instead of creating only new rows.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"]).expanduser()
        if not csv_path.exists():
            raise CommandError(f"File {csv_path} does not exist.")

        created = 0
        updated = 0
        skipped = 0
        with csv_path.open(newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            required_columns = {
                "verb",
                "stream",
                "infinitive",
                "present",
                "past",
                "perfect",
                "examples_infinitive",
                "examples_present",
                "examples_past",
                "examples_perfect",
                "tags",
            }
            missing_columns = required_columns - set(reader.fieldnames or [])
            if missing_columns:
                raise CommandError(f"Missing columns in CSV: {', '.join(sorted(missing_columns))}")

            for row in reader:
                stream = row["stream"].strip()
                if stream not in Test.Stream.values:
                    skipped += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping '{row['verb']}' due to invalid stream '{stream}'."
                        )
                    )
                    continue
                tags = [tag.strip() for tag in row.get("tags", "").split(";") if tag.strip()]
                defaults = {
                    "infinitive": row["infinitive"].strip(),
                    "present": row["present"].strip(),
                    "past": row["past"].strip(),
                    "perfect": row["perfect"].strip(),
                    "examples_infinitive": row["examples_infinitive"].replace(" | ", "\n"),
                    "examples_present": row["examples_present"].replace(" | ", "\n"),
                    "examples_past": row["examples_past"].replace(" | ", "\n"),
                    "examples_perfect": row["examples_perfect"].replace(" | ", "\n"),
                    "tags": tags,
                }
                verb_key = row["verb"].strip()
                entry, created_flag = VerbEntry.objects.get_or_create(
                    verb=verb_key,
                    stream=stream,
                    defaults=defaults,
                )
                if created_flag:
                    created += 1
                    continue
                if options["update"]:
                    for field, value in defaults.items():
                        setattr(entry, field, value)
                    entry.save()
                    updated += 1
                else:
                    skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Import finished. Created: {created}, Updated: {updated}, Skipped: {skipped}."
            )
        )
