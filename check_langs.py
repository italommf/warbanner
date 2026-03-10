from winsdk.windows.media.ocr import OcrEngine
from winsdk.windows.globalization import Language

print("Available OCR Languages:")
for lang in OcrEngine.all_available_languages:
    print(f"- {lang.id} ({lang.display_name})")

print("\nUser Profile Languages:")
engine = OcrEngine.try_create_from_user_profile_languages()
if engine:
    print(f"Default Language: {engine.recognizer_language.id}")
else:
    print("Could not create engine from user profile languages")
