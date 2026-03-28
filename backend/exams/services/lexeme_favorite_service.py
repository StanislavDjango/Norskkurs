from __future__ import annotations

from django.db import models
from exams.models import GlossaryTerm, UserLexeme
from exams.serializers import UserLexemeSerializer

from .lexeme_query_service import normalize_concept_key


def _coerce_kind(raw_kind: str) -> str:
    kind = (raw_kind or UserLexeme.Kind.WORD).strip().lower()
    return kind if kind in UserLexeme.Kind.values else UserLexeme.Kind.WORD


def _build_concept_key_from_translations(data: dict) -> str:
    return UserLexeme.build_concept_key(
        translation_en=data.get("translation_en") or "",
        translation_nb=data.get("translation_nb") or "",
        translation_nn=data.get("translation_nn") or "",
        translation_ru=data.get("translation_ru") or "",
    )


def _resolve_toggle_glossary(data: dict):
    glossary_id = (
        data.get("glossary_term") or data.get("glossary_id") or data.get("term_id")
    )
    if not glossary_id:
        return None
    try:
        return GlossaryTerm.objects.get(id=glossary_id)
    except GlossaryTerm.DoesNotExist:
        return None


def _build_concept_key_from_glossary(glossary_obj) -> str:
    if not glossary_obj:
        return ""
    return UserLexeme.build_concept_key(
        translation_en=glossary_obj.translation_en,
        translation_nb=glossary_obj.translation_nb,
        translation_nn=glossary_obj.translation_nn,
        translation_ru=glossary_obj.translation_ru,
    )


def _resolve_toggle_concept_key(data: dict, glossary_obj) -> str:
    concept_key = normalize_concept_key(data.get("concept_key") or "")
    if glossary_obj and not concept_key:
        concept_key = _build_concept_key_from_glossary(glossary_obj)
    if not concept_key:
        concept_key = _build_concept_key_from_translations(data)
    return concept_key


def _find_existing_favorite(*, user, concept_key: str, glossary_obj):
    if not (concept_key or glossary_obj):
        return None
    existing_filter = models.Q()
    if concept_key:
        existing_filter |= models.Q(concept_key=concept_key)
    if glossary_obj:
        existing_filter |= models.Q(glossary_term=glossary_obj)
    return (
        UserLexeme.objects.filter(
            user=user,
            source=UserLexeme.Source.GLOSSARY,
            is_archived=False,
        )
        .filter(existing_filter)
        .order_by("-id")
        .first()
    )


def _build_toggle_payload(data: dict, glossary_obj, concept_key: str):
    kind = _coerce_kind(data.get("kind") or "")
    language = (data.get("language") or "").strip().lower()
    level = (data.get("level") or "").strip().upper()
    return {
        "source": UserLexeme.Source.GLOSSARY,
        "kind": kind,
        "glossary_term": glossary_obj.id if glossary_obj else None,
        "concept_key": concept_key,
        "text": data.get("text")
        or (glossary_obj.term if glossary_obj else "")
        or concept_key,
        "translation_en": data.get("translation_en")
        or (glossary_obj.translation_en if glossary_obj else ""),
        "translation_nb": data.get("translation_nb")
        or (glossary_obj.translation_nb if glossary_obj else ""),
        "translation_nn": data.get("translation_nn")
        or (glossary_obj.translation_nn if glossary_obj else ""),
        "translation_ru": data.get("translation_ru")
        or (glossary_obj.translation_ru if glossary_obj else ""),
        "language": language
        or (glossary_obj.stream if glossary_obj else data.get("language"))
        or "",
        "level": level
        or (glossary_obj.level if glossary_obj else data.get("level"))
        or "",
    }


def _archive_existing_favorite(existing):
    existing.is_archived = True
    existing.save(update_fields=["is_archived", "updated_at"])


def _create_glossary_favorite(
    *, request, user, data: dict, glossary_obj, concept_key: str
):
    serializer = UserLexemeSerializer(
        data=_build_toggle_payload(data, glossary_obj, concept_key),
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    lexeme = serializer.save(user=user)
    return {"is_favorite": True, "lexeme": UserLexemeSerializer(lexeme).data}


def toggle_glossary_favorite(*, request, data: dict):
    user = request.user
    glossary_obj = _resolve_toggle_glossary(data)
    concept_key = _resolve_toggle_concept_key(data, glossary_obj)
    existing = _find_existing_favorite(
        user=user,
        concept_key=concept_key,
        glossary_obj=glossary_obj,
    )
    if existing:
        _archive_existing_favorite(existing)
        return {"is_favorite": False, "lexeme": None}
    return _create_glossary_favorite(
        request=request,
        user=user,
        data=data,
        glossary_obj=glossary_obj,
        concept_key=concept_key,
    )
