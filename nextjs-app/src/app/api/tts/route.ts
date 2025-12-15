import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

// Vertex AI configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0911928075";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL = "gemini-2.5-flash-tts";

const VERTEX_AI_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

// Initialize GoogleAuth for Application Default Credentials
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    console.log("TTS request:", { text, project: PROJECT_ID, location: LOCATION });

    // Get access token from ADC
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      console.error("Failed to get access token");
      return NextResponse.json({ audio: null, error: "Authentication failed" });
    }

    const response = await fetch(VERTEX_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Say in a clear, friendly, slightly upbeat pace: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore", // Warm, friendly female voice good for kids
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vertex AI TTS error:", errorText);
      return NextResponse.json({ audio: null, error: errorText });
    }

    const data = await response.json();
    console.log("Vertex AI TTS response structure:", JSON.stringify(data).slice(0, 500));

    const audioPart = data.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: { data: string } }) => part.inlineData
    );

    if (audioPart?.inlineData?.data) {
      console.log("TTS audio received, length:", audioPart.inlineData.data.length);
      return NextResponse.json({ audio: audioPart.inlineData.data });
    }

    console.log("No audio data in response");
    return NextResponse.json({ audio: null });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ audio: null, error: String(error) });
  }
}
