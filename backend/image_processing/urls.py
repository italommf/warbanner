from django.urls import path
from . import views

urlpatterns = [
    path("", views.upload_image, name="upload-image"),
    path("stats/", views.get_user_stats, name="user-stats"),
]
