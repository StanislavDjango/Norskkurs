import csv
import io
import re
from dataclasses import dataclass
from typing import Iterable, TextIO

from ..models import UserLexeme

DELIMITER = ";"
FIELDNAMES = [
    "source",
    "kind",
    "text",
    "translation_en",
    "translation_nb",
    "translation_nn",
    "translation_ru",
    "notes",
    "example",
    "tags",
    "language",
    "level",
    "glossary_term",
]


@dataclass
class ImportStats:
    created: int
    updated: int
    skipped: int


def export_user_lexemes_to_file(
    file_obj: TextIO, queryset: Iterable[UserLexeme]
) -> None:
    writer = csv.DictWriter(file_obj, fieldnames=FIELDNAMES, delimiter=DELIMITER)
    writer.writeheader()
    for item in queryset:
        writer.writerow(
            {
                "source": item.source,
                "kind": item.kind,
                "text": item.text,
                "translation_en": item.translation_en,
                "translation_nb": item.translation_nb,
                "translation_nn": item.translation_nn,
                "translation_ru": item.translation_ru,
                "notes": item.notes,
                "example": item.example,
                "tags": DELIMITER.join(item.tags or []),
                "language": item.language,
                "level": item.level,
                "glossary_term": item.glossary_term_id or "",
            }
        )


def parse_user_lexeme_rows(content: str) -> list[dict]:
    if not content.strip():
        return []
    sample = "\n".join(content.splitlines()[:5])
    delimiter = DELIMITER
    if delimiter not in sample and "," in sample:
        delimiter = ","
    elif delimiter not in sample and "\t" in sample:
        delimiter = "\t"
    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
    return [row for row in reader]


def parse_user_lexeme_tags(raw: str) -> list[str]:
    if not raw:
        return []
    parts = re.split(r"[;,]", raw)
    return [part.strip() for part in parts if part.strip()]
