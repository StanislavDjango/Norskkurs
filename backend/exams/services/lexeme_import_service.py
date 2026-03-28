from __future__ import annotations

from exams.models import GlossaryTerm, UserLexeme
from exams.serializers import UserLexemeSerializer
from exams.utils.user_lexeme_csv import (
    ImportStats,
    parse_user_lexeme_rows,
    parse_user_lexeme_tags,
)


def _coerce_kind(raw_kind: str) -> str:
    kind = (raw_kind or UserLexeme.Kind.WORD).strip().lower()
    return kind if kind in UserLexeme.Kind.values else UserLexeme.Kind.WORD


def _coerce_source(raw_source: str) -> str:
    source = (raw_source or UserLexeme.Source.CUSTOM).strip().lower()
    return source if source in UserLexeme.Source.values else UserLexeme.Source.CUSTOM


def _resolve_glossary_term(source: str, glossary_term_id: str):
    glossary_term = None
    if glossary_term_id and source == UserLexeme.Source.GLOSSARY:
        try:
            glossary_term = GlossaryTerm.objects.get(id=int(glossary_term_id))
        except (ValueError, GlossaryTerm.DoesNotExist):
            glossary_term = None
    return glossary_term


def _build_import_payload(row: dict):
    text = (row.get("text") or "").strip()
    translation_en = (row.get("translation_en") or "").strip()
    translation_nb = (row.get("translation_nb") or "").strip()
    translation_nn = (row.get("translation_nn") or "").strip()
    translation_ru = (row.get("translation_ru") or "").strip()
    notes = (row.get("notes") or "").strip()
    example = (row.get("example") or "").strip()
    tags = parse_user_lexeme_tags(row.get("tags") or "")

    base_translation = (row.get("translation") or "").strip()
    if base_translation and not translation_en:
        translation_en = base_translation

    kind = _coerce_kind(row.get("kind") or "")
    source = _coerce_source(row.get("source") or "")
    glossary_term = _resolve_glossary_term(
        source, (row.get("glossary_term") or "").strip()
    )

    if source == UserLexeme.Source.GLOSSARY and not glossary_term:
        source = UserLexeme.Source.CUSTOM

    payload = {
        "source": source,
        "kind": kind,
        "glossary_term": glossary_term.id if glossary_term else None,
        "text": text,
        "translation_en": translation_en,
        "translation_nb": translation_nb,
        "translation_nn": translation_nn,
        "translation_ru": translation_ru,
        "notes": notes,
        "example": example,
        "tags": tags,
        "language": (row.get("language") or "").strip().lower(),
        "level": (row.get("level") or "").strip().upper(),
        "is_archived": False,
    }
    return payload, glossary_term


def _has_import_translations(payload: dict) -> bool:
    return any(
        [
            payload["translation_en"],
            payload["translation_nb"],
            payload["translation_nn"],
            payload["translation_ru"],
        ]
    )


def _find_existing_import_lexeme(*, user, payload: dict, glossary_term):
    source = payload["source"]
    kind = payload["kind"]
    text = payload["text"]

    if source == UserLexeme.Source.GLOSSARY and glossary_term:
        return (
            UserLexeme.objects.filter(
                user=user,
                source=source,
                glossary_term=glossary_term,
            )
            .order_by("-id")
            .first()
        )

    concept_key = UserLexeme.build_concept_key(
        translation_en=payload["translation_en"],
        translation_nb=payload["translation_nb"],
        translation_nn=payload["translation_nn"],
        translation_ru=payload["translation_ru"],
    )
    existing_filter = UserLexeme.objects.filter(
        user=user,
        source=source,
        kind=kind,
        concept_key=concept_key,
    )
    if text:
        existing_filter = existing_filter.filter(text=text)
    return existing_filter.order_by("-id").first()


def _save_imported_lexeme(*, request, user, payload: dict, existing):
    serializer = UserLexemeSerializer(
        existing,
        data=payload,
        partial=bool(existing),
        context={"request": request},
    )
    if not serializer.is_valid():
        return False
    serializer.save(user=user if not existing else existing.user)
    return True


def _import_single_row(*, request, user, row: dict, update: bool, stats: ImportStats):
    payload, glossary_term = _build_import_payload(row)

    if payload["source"] == UserLexeme.Source.CUSTOM and not _has_import_translations(
        payload
    ):
        stats.skipped += 1
        return

    existing = _find_existing_import_lexeme(
        user=user,
        payload=payload,
        glossary_term=glossary_term,
    )
    if existing and not update:
        stats.skipped += 1
        return

    if _save_imported_lexeme(
        request=request,
        user=user,
        payload=payload,
        existing=existing,
    ):
        if existing:
            stats.updated += 1
        else:
            stats.created += 1
        return

    stats.skipped += 1


def _decode_uploaded_content(uploaded) -> str:
    raw = uploaded.read()
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("utf-8", errors="ignore")


def import_user_lexeme_content(*, request, uploaded, update: bool):
    user = request.user
    content = _decode_uploaded_content(uploaded)
    rows = parse_user_lexeme_rows(content)
    if not rows:
        return None

    stats = ImportStats(created=0, updated=0, skipped=0)
    for row in rows:
        _import_single_row(
            request=request,
            user=user,
            row=row,
            update=update,
            stats=stats,
        )

    return stats
