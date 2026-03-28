from __future__ import annotations

from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.authentication import BasicAuthentication
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import UserLexeme
from ..serializers import UserLexemeSerializer
from ..services.lexeme_service import (
    build_user_lexeme_queryset,
    import_user_lexeme_content,
    toggle_glossary_favorite,
)
from ..utils.user_lexeme_csv import export_user_lexemes_to_file
from .common import CsrfExemptSessionAuthentication, UserLexemePagination


class UserLexemeViewSet(viewsets.ModelViewSet):
    authentication_classes = (BasicAuthentication, CsrfExemptSessionAuthentication)
    permission_classes = (IsAuthenticated,)
    queryset = UserLexeme.objects.all()
    serializer_class = UserLexemeSerializer
    pagination_class = UserLexemePagination

    def get_queryset(self):
        return build_user_lexeme_queryset(self.request)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_archived = True
        instance.save(update_fields=["is_archived", "updated_at"])

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, *args, **kwargs):
        lexeme = self.get_object()
        correct = bool(request.data.get("correct"))
        lexeme.touch_review(correct=correct)
        lexeme.save(
            update_fields=["times_reviewed", "times_correct", "last_reviewed_at"]
        )
        return Response(self.get_serializer(lexeme).data)

    @action(detail=False, methods=["get"], url_path="export_csv")
    def export_csv(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        filename = f"user-lexemes-{request.user.id}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        export_user_lexemes_to_file(response, queryset)
        return response

    @action(
        detail=False,
        methods=["post"],
        url_path="import_csv",
        parser_classes=[MultiPartParser],
    )
    def import_csv(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response(
                {"detail": "CSV file required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stats = import_user_lexeme_content(
            request=request,
            uploaded=uploaded,
            update=str(request.data.get("update") or "").strip().lower()
            in {"1", "true", "yes", "y"},
        )
        if stats is None:
            return Response(
                {"detail": "CSV file is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "created": stats.created,
                "updated": stats.updated,
                "skipped": stats.skipped,
            }
        )

    def _toggle_favorite(self, request):
        result = toggle_glossary_favorite(request=request, data=request.data)
        if result["is_favorite"]:
            return Response(
                {"is_favorite": True, "lexeme": result["lexeme"]},
                status=status.HTTP_201_CREATED,
            )
        return Response({"is_favorite": False})

    @action(detail=False, methods=["post"], url_path="toggle_favorite")
    def toggle_favorite(self, request):
        return self._toggle_favorite(request)

    @action(detail=False, methods=["post"], url_path="toggle")
    def toggle(self, request):
        return self._toggle_favorite(request)
