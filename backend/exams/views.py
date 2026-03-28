from .viewsets.content import (
    ExerciseViewSet,
    ExpressionViewSet,
    GlossaryTermViewSet,
    HomeworkViewSet,
    MaterialViewSet,
    ReadingViewSet,
    VerbEntryViewSet,
)
from .viewsets.lexemes import UserLexemeViewSet
from .viewsets.profile import ProfileViewSet
from .viewsets.tests import TestViewSet

__all__ = [
    "ExerciseViewSet",
    "ExpressionViewSet",
    "GlossaryTermViewSet",
    "HomeworkViewSet",
    "MaterialViewSet",
    "ProfileViewSet",
    "ReadingViewSet",
    "TestViewSet",
    "UserLexemeViewSet",
    "VerbEntryViewSet",
]
