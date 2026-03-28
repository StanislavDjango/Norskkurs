from __future__ import annotations

from django.db import models
from rest_framework.authentication import SessionAuthentication
from rest_framework.pagination import PageNumberPagination


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return


class FilteredStreamLevelMixin:
    def filter_by_stream_level(self, qs):
        stream = (self.request.query_params.get("stream") or "").strip().lower()
        level = (self.request.query_params.get("level") or "").strip().upper()
        email = (self.request.query_params.get("student_email") or "").strip().lower()
        if stream and hasattr(qs.model, "stream"):
            qs = qs.filter(stream=stream)
        if level and hasattr(qs.model, "level"):
            qs = qs.filter(level=level)
        if hasattr(qs.model, "assigned_to_email") and email:
            qs = qs.filter(
                models.Q(assigned_to_email__isnull=True)
                | models.Q(assigned_to_email=email)
            )
        return qs


class UserLexemePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200
