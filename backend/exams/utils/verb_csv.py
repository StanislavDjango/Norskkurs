from __future__ import annotations

import csv
from dataclasses import dataclass
from typing import Iterable, TextIO

from exams.models import Test, VerbEntry

CSV_HEADER = [
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

EXAMPLE_SEPARATOR = " | "


def export_verbs_to_file(file_obj: TextIO, queryset: Iterable[VerbEntry]) -> None:
    file_obj.write("\ufeff")
    writer = csv.writer(file_obj)
    writer.writerow(CSV_HEADER)
    for entry in queryset:
        writer.writerow(
            [
                entry.verb,
                entry.stream,
                entry.infinitive,
                entry.present,
                entry.past,
                entry.perfect,
                entry.examples_infinitive.replace("\n", EXAMPLE_SEPARATOR),
                entry.examples_present.replace("\n", EXAMPLE_SEPARATOR),
                entry.examples_past.replace("\n", EXAMPLE_SEPARATOR),
                entry.examples_perfect.replace("\n", EXAMPLE_SEPARATOR),
                ";".join(entry.tags or []),
            ]
        )


@dataclass
class ImportStats:
    created: int = 0
    updated: int = 0
    skipped: int = 0


def import_verbs_from_reader(reader: csv.DictReader, *, update: bool = False) -> ImportStats:
    stats = ImportStats()
    missing = set(CSV_HEADER) - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"Missing columns: {', '.join(sorted(missing))}")

    for row in reader:
        stream = row["stream"].strip()
        if stream not in Test.Stream.values:
            stats.skipped += 1
            continue
        tags = [tag.strip() for tag in row.get("tags", "").split(";") if tag.strip()]
        defaults = {
            "infinitive": row["infinitive"].strip(),
            "present": row["present"].strip(),
            "past": row["past"].strip(),
            "perfect": row["perfect"].strip(),
            "examples_infinitive": _parse_examples(row["examples_infinitive"]),
            "examples_present": _parse_examples(row["examples_present"]),
            "examples_past": _parse_examples(row["examples_past"]),
            "examples_perfect": _parse_examples(row["examples_perfect"]),
            "tags": tags,
        }
        verb_key = row["verb"].strip()
        entry, created_flag = VerbEntry.objects.get_or_create(
            verb=verb_key,
            stream=stream,
            defaults=defaults,
        )
        if created_flag:
            stats.created += 1
            continue
        if update:
            for field, value in defaults.items():
                setattr(entry, field, value)
            entry.save()
            stats.updated += 1
        else:
            stats.skipped += 1

    return stats


def _parse_examples(cell: str) -> str:
    value = (cell or "").strip()
    if not value:
        return ""
    if EXAMPLE_SEPARATOR in value:
        return "\n".join(part.strip() for part in value.split(EXAMPLE_SEPARATOR))
    return value
