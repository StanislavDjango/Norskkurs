from rest_framework.routers import DefaultRouter

from .views import (
    ExerciseViewSet,
    ExpressionViewSet,
    GlossaryTermViewSet,
    HomeworkViewSet,
    MaterialViewSet,
    ProfileViewSet,
    TestViewSet,
    VerbEntryViewSet,
)

router = DefaultRouter()
router.register(r"tests", TestViewSet, basename="test")
router.register(r"profile", ProfileViewSet, basename="profile")
router.register(r"materials", MaterialViewSet, basename="materials")
router.register(r"homework", HomeworkViewSet, basename="homework")
router.register(r"exercises", ExerciseViewSet, basename="exercises")
router.register(r"verbs", VerbEntryViewSet, basename="verbs")
router.register(r"expressions", ExpressionViewSet, basename="expressions")
router.register(r"glossary", GlossaryTermViewSet, basename="glossary")

urlpatterns = router.urls
