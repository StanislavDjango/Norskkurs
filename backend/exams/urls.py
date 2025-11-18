from rest_framework.routers import DefaultRouter

from .views import ProfileViewSet, TestViewSet

router = DefaultRouter()
router.register(r"tests", TestViewSet, basename="test")
router.register(r"profile", ProfileViewSet, basename="profile")

urlpatterns = router.urls
