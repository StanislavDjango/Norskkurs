from __future__ import annotations

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from exams.utils.verb_csv import import_verbs_from_reader


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

        with csv_path.open(newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            try:
                stats = import_verbs_from_reader(reader, update=options["update"])
            except ValueError as exc:
                raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Import finished. Created: {stats.created}, Updated: {stats.updated}, Skipped: {stats.skipped}."
            )
        )
