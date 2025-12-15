"""
Storybook Generator for Kids Reading & Writing App
Generates a story about Isaac Newton discovering gravity with images using Gemini API
"""

import os
import json
import base64
import time
from pathlib import Path
from google import genai
from google.genai import types

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
OUTPUT_DIR = Path(__file__).parent.parent / "nextjs-app" / "public" / "storybook"

# The story about Isaac Newton - 6 sentences, ~6 words each, child-friendly
STORY_TEMPLATE = """
Create a children's storybook about Isaac Newton discovering gravity from a falling apple.
The story must have EXACTLY 6 sentences.
Each sentence must have approximately 6 words (5-7 words maximum).
Use simple words that a 5-7 year old can read.
Make it engaging and fun for children.
Return the story as a JSON array of strings, one sentence per element.
Example format: ["Sentence one here.", "Sentence two here.", ...]
Return ONLY the JSON array, no other text.
"""

IMAGE_PROMPT_TEMPLATE = """
Create a colorful, child-friendly illustration for a children's book.
The scene depicts: {sentence}
Style: Bright, cheerful watercolor illustration suitable for children ages 5-7.
The image should be simple, clear, and engaging with warm colors.
Show Isaac Newton as a friendly young man with period-appropriate clothing.
No text in the image.
"""


def generate_story(client: genai.Client) -> list[str]:
    """Generate the Newton story using Gemini"""
    print("Generating story text...")

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[STORY_TEMPLATE],
    )

    # Parse the JSON response
    text = response.text.strip()
    # Clean up potential markdown code blocks
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    story = json.loads(text)

    print(f"Generated {len(story)} sentences:")
    for i, sentence in enumerate(story, 1):
        word_count = len(sentence.split())
        print(f"  {i}. ({word_count} words) {sentence}")

    return story


def generate_image(client: genai.Client, sentence: str, index: int) -> str:
    """Generate an image for a sentence using Gemini's image generation"""
    print(f"Generating image {index + 1} for: {sentence[:50]}...")

    prompt = IMAGE_PROMPT_TEMPLATE.format(sentence=sentence)

    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        )
    )

    # Extract image from response
    for part in response.parts:
        if part.inline_data is not None:
            # Save the image
            image_path = OUTPUT_DIR / f"scene_{index + 1}.png"
            image_data = part.inline_data.data
            # Data is already bytes, not base64 encoded
            if isinstance(image_data, str):
                image_data = base64.b64decode(image_data)
            with open(image_path, "wb") as f:
                f.write(image_data)
            print(f"  Saved: {image_path} ({len(image_data)} bytes)")
            return str(image_path.name)

    raise Exception(f"No image generated for sentence {index + 1}")


def create_storybook():
    """Main function to create the complete storybook"""
    if not GEMINI_API_KEY:
        print("ERROR: Please set GEMINI_API_KEY environment variable")
        print("Usage: GEMINI_API_KEY=your_key python generate_storybook.py")
        return

    # Initialize client
    client = genai.Client(api_key=GEMINI_API_KEY)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate story
    story = generate_story(client)

    # Validate story
    if len(story) < 5 or len(story) > 6:
        print(f"WARNING: Story has {len(story)} sentences, expected 5-6")

    # Generate images for each sentence
    storybook_data = {
        "title": "Newton and the Apple",
        "description": "Learn how Isaac Newton discovered gravity!",
        "pages": []
    }

    for i, sentence in enumerate(story):
        print(f"\nProcessing page {i + 1}/{len(story)}...")

        # Generate image
        try:
            image_filename = generate_image(client, sentence, i)
        except Exception as e:
            print(f"  Warning: Could not generate image: {e}")
            image_filename = None

        # Break sentence into words for learning activities
        words = sentence.replace(".", "").replace(",", "").replace("!", "").replace("?", "").split()

        page_data = {
            "page_number": i + 1,
            "sentence": sentence,
            "words": words,
            "image": image_filename,
        }
        storybook_data["pages"].append(page_data)

        # Rate limiting - be gentle with the API
        time.sleep(2)

    # Save storybook data as JSON
    json_path = OUTPUT_DIR / "storybook.json"
    with open(json_path, "w") as f:
        json.dump(storybook_data, f, indent=2)
    print(f"\nStorybook data saved to: {json_path}")

    # Verify the storybook
    print("\n" + "="*50)
    print("STORYBOOK VERIFICATION")
    print("="*50)
    print(f"Title: {storybook_data['title']}")
    print(f"Total pages: {len(storybook_data['pages'])}")

    for page in storybook_data["pages"]:
        print(f"\nPage {page['page_number']}:")
        print(f"  Sentence: {page['sentence']}")
        print(f"  Words: {page['words']}")
        print(f"  Image: {page['image']}")
        if page['image']:
            img_path = OUTPUT_DIR / page['image']
            if img_path.exists():
                print(f"  Image exists: Yes ({img_path.stat().st_size} bytes)")
            else:
                print(f"  Image exists: NO - MISSING!")

    print("\n" + "="*50)
    print("Storybook generation complete!")
    print("="*50)

    return storybook_data


if __name__ == "__main__":
    create_storybook()
