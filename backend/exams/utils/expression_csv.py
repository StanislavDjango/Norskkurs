import csv
from dataclasses import dataclass
from typing import Iterable, TextIO

from ..models import Expression


@dataclass
class ImportStats:
    created: int
    updated: int
    skipped: int


def export_expressions_to_file(
    file_obj: TextIO,
    queryset: Iterable[Expression],
) -> None:
    fieldnames = ["phrase", "meaning", "example", "stream", "tags"]
    writer = csv.DictWriter(file_obj, fieldnames=fieldnames)
    writer.writeheader()
    for item in queryset:
        writer.writerow(
            {
                "phrase": item.phrase,
                "meaning": item.meaning,
                "example": item.example,
                "stream": item.stream,
                "tags": ";".join(item.tags or []),
            }
        )


def import_expressions_from_reader(
    reader: Iterable[dict],
    update: bool = False,
) -> ImportStats:
    created = updated = skipped = 0
    for row in reader:
        phrase = (row.get("phrase") or "").strip()
        if not phrase:
            skipped += 1
            continue

        stream = (row.get("stream") or "").strip().lower()
        if not stream:
            stream = Expression._meta.get_field("stream").default

        defaults = {
            "meaning": (row.get("meaning") or "").strip(),
            "example": (row.get("example") or "").strip(),
            "tags": [
                t.strip() for t in (row.get("tags") or "").split(";") if t.strip()
            ],
        }

        obj, created_flag = Expression.objects.get_or_create(
            phrase=phrase,
            stream=stream,
            defaults=defaults,
        )
        if created_flag:
            created += 1
            continue

        if update:
            for key, value in defaults.items():
                setattr(obj, key, value)
            obj.save()
            updated += 1
        else:
            skipped += 1

    return ImportStats(created=created, updated=updated, skipped=skipped)
