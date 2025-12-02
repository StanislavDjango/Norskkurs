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
        "translation_en",
        "translation_nb",
        "translation_nn",
        "translation_ru",
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
                "translation_en": item.translation_en,
                "translation_nb": item.translation_nb,
                "translation_nn": item.translation_nn,
                "translation_ru": item.translation_ru,
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

        legacy_translation = (row.get("translation") or "").strip()
        translation_en = (row.get("translation_en") or "").strip()
        translation_nb = (row.get("translation_nb") or "").strip()
        translation_nn = (row.get("translation_nn") or "").strip()
        translation_ru = (row.get("translation_ru") or "").strip()

        # Backwards compatibility: older templates used a single "translation"
        # column whose meaning depended on the stream.
        if legacy_translation and not (translation_en or translation_ru):
            if stream == "english":
                translation_ru = legacy_translation
            else:
                translation_en = legacy_translation

        defaults = {
            "title": title or slug,
            "stream": stream,
            "level": level,
            "body": (row.get("body") or "").strip(),
            "translation_en": translation_en,
            "translation_nb": translation_nb,
            "translation_nn": translation_nn,
            "translation_ru": translation_ru,
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
