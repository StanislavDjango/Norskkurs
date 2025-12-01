import csv
from dataclasses import dataclass
from typing import Iterable, TextIO

from django.utils.text import slugify

from ..models import Reading


@dataclass
class ImportStats:
    created: int
    updated: int
    skipped: int


def export_readings_to_file(file_obj: TextIO, queryset: Iterable[Reading]) -> None:
    fieldnames = [
        "slug",
        "title",
        "stream",
        "level",
        "tags",
        "body",
        "translation",
        "translation_nb",
        "translation_nn",
        "is_published",
    ]
    writer = csv.DictWriter(file_obj, fieldnames=fieldnames)
    writer.writeheader()
    for item in queryset:
        writer.writerow(
            {
                "slug": item.slug,
                "title": item.title,
                "stream": item.stream,
                "level": item.level,
                "tags": ";".join(item.tags or []),
                "body": item.body,
                "translation": item.translation,
                "translation_nb": item.translation_nb,
                "translation_nn": item.translation_nn,
                "is_published": "1" if item.is_published else "0",
            }
        )


def import_readings_from_reader(
    reader: Iterable[dict], update: bool = False
) -> ImportStats:
    created = updated = skipped = 0
    for row in reader:
        title = (row.get("title") or "").strip()
        slug = (row.get("slug") or "").strip()
        stream = (row.get("stream") or "").strip().lower()
        level = (row.get("level") or "").strip().upper()
        if not title and not slug:
            skipped += 1
            continue
        if not slug:
            slug = slugify(title)
        if not level:
            level = Reading._meta.get_field("level").default
        if not stream:
            stream = Reading._meta.get_field("stream").default

        defaults = {
            "title": title or slug,
            "stream": stream,
            "level": level,
            "body": (row.get("body") or "").strip(),
            "translation": (row.get("translation") or "").strip(),
            "tags": [
                t.strip() for t in (row.get("tags") or "").split(";") if t.strip()
            ],
            "is_published": (row.get("is_published") or "1").strip()
            not in {"0", "false", "False"},
        }
        obj, created_flag = Reading.objects.get_or_create(
            slug=slug,
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
