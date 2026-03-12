from django.urls import path, include
from . import views, admin_views, warchaos_views

urlpatterns = [
    path("items/", views.items),
    path("history/", views.history_list),
    path("history/<int:pk>/", views.history_delete),
    path("music/", views.music_list),
    path("backgrounds/", views.backgrounds),
    path("gifs/", views.gifs),
    path("community/", views.community),
    path("community/latest/", views.community_latest),
    path("community/statistics/", views.community_statistics),

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

    # Admin
    path("admin/stats/", admin_views.admin_global_stats),
    path("admin/queue/", admin_views.admin_queue_list),
    path("admin/reprocess/<int:pk>/", admin_views.reprocess_image),
    path("admin/users/", admin_views.admin_users_list),
    path("admin/users/<int:pk>/", admin_views.admin_user_detail),
    path("admin/users/<int:pk>/history/", admin_views.admin_user_history),
    path("admin/users/<int:pk>/images/", admin_views.admin_user_images),
    path("admin/users/<int:pk>/banners/", admin_views.admin_user_banners),
    path("admin/users/<int:user_id>/reset-ocr/", admin_views.reset_ocr_data),
    path("admin/migrations/", admin_views.admin_migrations_list),

    # Support
    path("support/tickets/", views.ticket_list_create),
    path("support/tickets/<int:pk>/", views.ticket_detail),

    # Warchaos Migration
    path("warchaos/migration/", warchaos_views.warchaos_migration_api),
    path("warchaos/request/", warchaos_views.request_warchaos_migration),
]
