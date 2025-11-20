from __future__ import annotations

import csv
from pathlib import Path

from django.core.management.base import BaseCommand

from exams.models import VerbEntry
from exams.utils.verb_csv import export_verbs_to_file


class Command(BaseCommand):
    help = "Export all verb entries into a CSV template (can be reused for edits/import)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            "-o",
            default="verbs-template.csv",
            help="Path to write the CSV template (default: verbs-template.csv).",
        )

    def handle(self, *args, **options):
        output_path = Path(options["output"]).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        header = [
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
        ]

        queryset = VerbEntry.objects.all().order_by("stream", "verb")
        if not queryset.exists():
            self.stdout.write(self.style.WARNING("No verbs found; writing empty template."))

        with output_path.open("w", newline="", encoding="utf-8") as csvfile:
            export_verbs_to_file(csvfile, queryset)

        self.stdout.write(self.style.SUCCESS(f"Exported {queryset.count()} verbs to {output_path}"))
