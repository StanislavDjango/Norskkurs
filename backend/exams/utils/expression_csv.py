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
    fieldnames = [
        "phrase",
        "meaning_en",
        "meaning_nb",
        "meaning_nn",
        "meaning_ru",
        "example",
        "stream",
        "tags",
    ]
    writer = csv.DictWriter(file_obj, fieldnames=fieldnames)
    writer.writeheader()
    for item in queryset:
        writer.writerow(
            {
                "phrase": item.phrase,
                "meaning_en": item.meaning_en,
                "meaning_nb": item.meaning_nb,
                "meaning_nn": item.meaning_nn,
                "meaning_ru": item.meaning_ru,
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

        meaning_en = (row.get("meaning_en") or "").strip()
        meaning_nb = (row.get("meaning_nb") or "").strip()
        meaning_nn = (row.get("meaning_nn") or "").strip()
        meaning_ru = (row.get("meaning_ru") or "").strip()

        defaults = {
            "meaning_en": meaning_en,
            "meaning_nb": meaning_nb,
            "meaning_nn": meaning_nn,
            "meaning_ru": meaning_ru,
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
