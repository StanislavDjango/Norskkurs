from __future__ import annotations

from django.db import models
from exams.models import UserLexeme


def build_user_lexeme_queryset(request):
    qs = UserLexeme.objects.filter(user=request.user)
    archived = (request.query_params.get("archived") or "").lower() == "true"
    if not archived:
        qs = qs.filter(is_archived=False)
    source = (request.query_params.get("source") or "").strip().lower()
    if source:
        qs = qs.filter(source=source)
    kind = (request.query_params.get("kind") or "").strip().lower()
    if kind:
        qs = qs.filter(kind=kind)
    level = (request.query_params.get("level") or "").strip().upper()
    if level:
        qs = qs.filter(level=level)
    language = (request.query_params.get("language") or "").strip().lower()
    if language:
        qs = qs.filter(language=language)
    tag = (request.query_params.get("tag") or "").strip().lower()
    if tag:
        qs = qs.filter(tags__contains=[tag])
    search_term = (request.query_params.get("q") or "").strip()
    if search_term:
        qs = qs.filter(
            models.Q(text__icontains=search_term)
            | models.Q(translation_en__icontains=search_term)
            | models.Q(translation_ru__icontains=search_term)
            | models.Q(translation_nb__icontains=search_term)
            | models.Q(translation_nn__icontains=search_term)
            | models.Q(notes__icontains=search_term)
            | models.Q(example__icontains=search_term)
        )
    return qs.order_by("-updated_at", "-id")


def normalize_concept_key(value: str) -> str:
    if not value:
        return ""
    parts = value.split("|")
    while len(parts) < 4:
        parts.append("")
    return UserLexeme.build_concept_key(
        translation_en=parts[0],
        translation_nb=parts[1],
        translation_nn=parts[2],
        translation_ru=parts[3],
    )
