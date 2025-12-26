/**
 * Script to pre-generate audio for static phrases
 * Run with: npx ts-node scripts/generate-static-audio.ts
 *
 * This generates a JSON file with all static audio pre-computed
 * so they load instantly without API calls.
 */

import fs from "fs";
import path from "path";

// All static phrases that never change
const STATIC_PHRASES = [
  "Hello! What's your name? Type it in the box.",
  "Let's try again!",
  "I didn't hear anything. Try again!",
  "Good try! Let's keep going!",
  "Let's keep going!",
  "No problem! Let's keep going.",
  "Now let's write! Fill in the missing word.",
  "Correct!",
  "Amazing! You wrote the whole sentence!",
  "Not quite. Try again!",
  "Good effort! You finished the sentence!",
];

async function generateAudio(text: string): Promise<string | null> {
  try {
    const response = await fetch("http://localhost:3000/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.audio || null;
    }
    return null;
  } catch (error) {
    console.error(`Error generating audio for "${text}":`, error);
    return null;
  }
}

async function main() {
  console.log("Generating static audio cache...\n");

  const cache: Record<string, string> = {};

  for (const phrase of STATIC_PHRASES) {
    console.log(`Generating: "${phrase.substring(0, 40)}..."`);
    const audio = await generateAudio(phrase);
    if (audio) {
      cache[phrase] = audio;
      console.log("  ✓ Success");
    } else {
      console.log("  ✗ Failed");
    }
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const outputPath = path.join(__dirname, "../public/static-audio-cache.json");
  fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));

  console.log(`\n✓ Saved ${Object.keys(cache).length} phrases to ${outputPath}`);
}

main();
