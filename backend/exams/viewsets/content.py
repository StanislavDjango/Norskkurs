from __future__ import annotations

from django.db import models
from rest_framework import mixins, viewsets

from ..models import (
    Exercise,
    Expression,
    GlossaryTerm,
    Homework,
    Material,
    Reading,
    VerbEntry,
)
from ..serializers import (
    ExerciseSerializer,
    ExpressionSerializer,
    GlossaryTermSerializer,
    HomeworkSerializer,
    MaterialSerializer,
    ReadingSerializer,
    VerbEntrySerializer,
)
from .common import CsrfExemptSessionAuthentication, FilteredStreamLevelMixin


class MaterialViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = MaterialSerializer

    def get_queryset(self):
        qs = Material.objects.filter(is_published=True)
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "level", "title"
        )


class HomeworkViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = HomeworkSerializer

    def get_queryset(self):
        qs = Homework.objects.filter(status=Homework.Status.PUBLISHED)
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "-due_date", "-created_at"
        )


class ExerciseViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ExerciseSerializer

    def get_queryset(self):
        qs = Exercise.objects.all()
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "level", "title"
        )


class VerbEntryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = VerbEntrySerializer

    def get_queryset(self):
        qs = VerbEntry.objects.all()
        qs = FilteredStreamLevelMixin.filter_by_stream_level(self, qs)
        part = (self.request.query_params.get("part_of_speech") or "").strip().lower()
        if part:
            qs = qs.filter(part_of_speech=part)
        tag = (self.request.query_params.get("tag") or "").strip().lower()
        if tag:
            qs = qs.filter(tags__contains=[tag])
        return qs.order_by("verb")


class ExpressionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ExpressionSerializer

    def get_queryset(self):
        qs = Expression.objects.all()
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "phrase"
        )


class GlossaryTermViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = GlossaryTermSerializer

    def get_queryset(self):
        qs = GlossaryTerm.objects.all()
        stream = (self.request.query_params.get("stream") or "").strip().lower()
        if stream:
            qs = qs.filter(stream=stream)
        search_term = (self.request.query_params.get("q") or "").strip()
        if search_term:
            qs = qs.filter(
                models.Q(term__icontains=search_term)
                | models.Q(translation__icontains=search_term)
                | models.Q(translation_en__icontains=search_term)
                | models.Q(translation_ru__icontains=search_term)
                | models.Q(translation_nb__icontains=search_term)
                | models.Q(translation_nn__icontains=search_term)
                | models.Q(explanation__icontains=search_term)
            )
        return qs.order_by("term")


class ReadingViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    authentication_classes = (CsrfExemptSessionAuthentication,)
    serializer_class = ReadingSerializer
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        qs = Reading.objects.filter(is_published=True)
        return FilteredStreamLevelMixin.filter_by_stream_level(self, qs).order_by(
            "level", "title"
        )
