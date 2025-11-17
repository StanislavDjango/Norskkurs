from rest_framework.routers import DefaultRouter

from .views import TestViewSet

router = DefaultRouter()
router.register(r"tests", TestViewSet, basename="test")

urlpatterns = router.urls
