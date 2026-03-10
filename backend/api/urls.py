from django.urls import path, include
from . import views

urlpatterns = [
    path("items/", views.items),
    path("history/", views.history_list),
    path("history/<int:pk>/", views.history_delete),
    path("music/", views.music_list),
    path("backgrounds/", views.backgrounds),
    path("gifs/", views.gifs),
    path("community/", views.community),
    path("community/latest/", views.community_latest),

    # Auth
    path("auth/register/",         views.auth_register),
    path("auth/login/",            views.auth_login),
    path("auth/recover/",          views.auth_recover),
    path("auth/me/",               views.auth_me),
    path("auth/profile/",          views.auth_update_profile),
    path("auth/change-password/",  views.auth_change_password),
    path("auth/discord/",          views.discord_auth_url),
    path("auth/discord/callback/", views.discord_callback),

    # Image Processing
    path("processar/upload/", include('image_processing.urls')),
]
