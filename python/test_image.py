"""Test image generation with Gemini"""
import os
import base64
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

prompt = "Create a colorful, child-friendly illustration of a boy sitting under an apple tree."

response = client.models.generate_content(
    model="gemini-2.0-flash-exp",
    contents=[prompt],
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
    )
)

print("Response candidates:", len(response.candidates))
print("Parts:", len(response.parts))

for i, part in enumerate(response.parts):
    print(f"\nPart {i}:")
    print(f"  Has text: {hasattr(part, 'text') and part.text}")
    print(f"  Has inline_data: {part.inline_data is not None}")
    if part.inline_data:
        print(f"  MIME type: {part.inline_data.mime_type}")
        data = part.inline_data.data
        print(f"  Data type: {type(data)}")
        print(f"  Data length: {len(data) if data else 0}")
        if data:
            # Check if it's already bytes or needs decoding
            if isinstance(data, bytes):
                print("  Data is already bytes")
                with open("test_output.png", "wb") as f:
                    f.write(data)
            else:
                print(f"  Data preview: {str(data)[:100]}...")
                # Try to decode if it's base64 string
                try:
                    decoded = base64.b64decode(data)
                    print(f"  Decoded length: {len(decoded)}")
                    with open("test_output.png", "wb") as f:
                        f.write(decoded)
                except Exception as e:
                    print(f"  Decode error: {e}")
                    # Maybe it's raw data
                    with open("test_output_raw.png", "wb") as f:
                        f.write(data.encode() if isinstance(data, str) else data)

print("\nDone!")
