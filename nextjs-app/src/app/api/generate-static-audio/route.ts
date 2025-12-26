import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
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

// Vertex AI configuration (same as TTS route)
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0911928075";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL = "gemini-2.5-flash-tts";
const VERTEX_AI_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

export async function POST() {
  const cache: Record<string, string> = {};
  const errors: string[] = [];

  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }

    for (const phrase of STATIC_PHRASES) {
      try {
        const response = await fetch(VERTEX_AI_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `Say in a clear, friendly, slightly upbeat pace: ${phrase}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const audioPart = data.candidates?.[0]?.content?.parts?.find(
            (part: { inlineData?: { data: string } }) => part.inlineData
          );
          if (audioPart?.inlineData?.data) {
            cache[phrase] = audioPart.inlineData.data;
          } else {
            errors.push(`No audio data for: ${phrase.substring(0, 30)}...`);
          }
        } else {
          errors.push(`API error for: ${phrase.substring(0, 30)}...`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        errors.push(`Exception for: ${phrase.substring(0, 30)}... - ${error}`);
      }
    }

    // Save to public folder
    const outputPath = path.join(process.cwd(), "public/static-audio-cache.json");
    fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));

    return NextResponse.json({
      success: true,
      generated: Object.keys(cache).length,
      total: STATIC_PHRASES.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
