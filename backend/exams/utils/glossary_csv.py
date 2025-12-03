import csv
from dataclasses import dataclass
from typing import Iterable, TextIO

from ..models import GlossaryTerm


@dataclass
class ImportStats:
    created: int
    updated: int
    skipped: int


def export_glossary_to_file(file_obj: TextIO, queryset: Iterable[GlossaryTerm]) -> None:
    fieldnames = [
        "term",
        "translation_en",
        "translation_ru",
        "translation_nn",
        "translation_nb",
        "tags",
    ]
    writer = csv.DictWriter(file_obj, fieldnames=fieldnames)
    writer.writeheader()
    for item in queryset:
        writer.writerow(
            {
                "term": item.term,
                "translation_en": item.translation_en,
                "translation_ru": item.translation_ru,
                "translation_nn": item.translation_nn,
                "translation_nb": item.translation_nb,
                "tags": ";".join(item.tags or []),
            }
        )


def import_glossary_from_reader(
    reader: Iterable[dict], update: bool = False
) -> ImportStats:
    created = updated = skipped = 0
    for row in reader:
        term = (row.get("term") or "").strip()
        if not term:
            skipped += 1
            continue

        stream = (row.get("stream") or "").strip().lower()
        level = (row.get("level") or "").strip().upper()

        if not stream:
            stream = GlossaryTerm._meta.get_field("stream").default
        if not level:
            level = GlossaryTerm._meta.get_field("level").default

        base_translation = (row.get("translation") or "").strip()
        translation_en = (row.get("translation_en") or "").strip()
        translation_ru = (row.get("translation_ru") or "").strip()
        translation_nn = (row.get("translation_nn") or "").strip()
        translation_nb = (row.get("translation_nb") or "").strip()

        # Backwards compatibility: if only a generic "translation"
        # column is present, prefer it as English.
        if base_translation and not (translation_en or translation_ru):
            translation_en = base_translation

        # Fallback for the legacy "translation" field used in search.
        if not base_translation:
            base_translation = (
                translation_en or translation_nb or translation_ru or translation_nn
            )

        defaults = {
            "translation": base_translation,
            "translation_en": translation_en,
            "translation_ru": translation_ru,
            "translation_nn": translation_nn,
            "translation_nb": translation_nb,
            "explanation": (row.get("explanation") or "").strip(),
            "tags": [
                t.strip() for t in (row.get("tags") or "").split(";") if t.strip()
            ],
        }
        obj, created_flag = GlossaryTerm.objects.get_or_create(
            term=term, stream=stream, level=level, defaults=defaults
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
