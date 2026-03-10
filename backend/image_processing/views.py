from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from .models import UploadedImage
from .serializers import UploadedImageSerializer, UserProfileStatsSerializer
from .tasks import process_uploaded_image

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request):
    files = request.FILES.getlist('images')
    if not files:
        return Response({'error': 'Nenhuma imagem enviada.'}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_ids = []
    img_type = request.data.get('type', 'desafios')
    for f in files:
        image_obj = UploadedImage.objects.create(user=request.user, image=f, image_type=img_type)
        uploaded_ids.append(image_obj.id)
        # Chama a task do Celery para processamento em background
        process_uploaded_image.delay(image_obj.id)

    return Response({
        'message': f'{len(uploaded_ids)} imagens enviadas para processamento.',
        'ids': uploaded_ids
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    total_images = UploadedImage.objects.filter(user=request.user).count()
    profile = request.user.profile
    
    return Response({
        'total_images': total_images,
        'stats': UserProfileStatsSerializer(profile).data
    })
