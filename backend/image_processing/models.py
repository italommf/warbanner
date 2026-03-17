from django.db import models
from django.conf import settings

class UploadedImage(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('processing', 'Processando'),
        ('done', 'Concluído'),
        ('failed', 'Falhou'),
    ]

    TYPE_CHOICES = [
        ('pvp', 'PvP'),
        ('pve', 'PvE'),
        ('desafios', 'Desafios'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_images')
    image = models.ImageField(upload_to='uploads_ocr/')
    debug_image = models.ImageField(upload_to='uploads_debug/', null=True, blank=True)
    image_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='desafios')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Image {self.id} - {self.user.username} ({self.status})"
