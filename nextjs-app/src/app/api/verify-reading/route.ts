import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(request: NextRequest) {
  try {
    const { expectedSentence, spokenText, apiKey: clientApiKey } = await request.json();

    // Use server-side env var if available, otherwise use client-provided key
    // "server" means the client knows the server has the key configured
    const apiKey = process.env.GOOGLE_API_KEY || (clientApiKey !== "server" ? clientApiKey : null);

    if (!apiKey || apiKey === "demo") {
      // Demo mode: simple comparison
      const expected = expectedSentence
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .trim();
      const spoken = spokenText
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .trim();

      // Be lenient - check if most words match
      const expectedWords = expected.split(/\s+/);
      const spokenWords = spoken.split(/\s+/);
      let matches = 0;

      for (const word of spokenWords) {
        if (expectedWords.includes(word)) {
          matches++;
        }
      }

      const matchRatio = matches / expectedWords.length;
      const isCorrect = matchRatio >= 0.7;

      return NextResponse.json({
        isCorrect,
        feedback: isCorrect
          ? "You read it correctly!"
          : "Some words were different",
        encouragement: isCorrect
          ? "Excellent reading! You're a star!"
          : "Good try! Let's read it together again!",
      });
    }

    // Log for debugging
    console.log("Verifying reading:", { expectedSentence, spokenText });

    // Use Gemini API for verification
    const prompt = `You are a friendly, encouraging teacher helping a young child (age 5-7) learn to read.

The child was supposed to read: "${expectedSentence}"
The child said: "${spokenText}"

Determine if the child read the sentence correctly. Be VERY lenient and forgiving:
- If they said essentially the same words, mark it correct
- Ignore punctuation completely
- Ignore capitalization completely
- Minor pronunciation differences are OK
- Small words like "a", "the", "an" being slightly different are OK
- Slight word order mistakes are OK
- If 80% or more of the words match, mark it as correct

IMPORTANT: Lean toward marking it correct if it's close. We want to encourage the child!

Respond in JSON format:
{
  "isCorrect": true/false,
  "feedback": "short specific feedback about what they said",
  "encouragement": "a short, warm, encouraging message for the child"
}

If correct, the encouragement should celebrate their success enthusiastically.
If incorrect, the encouragement should be gentle and supportive.
Keep messages very short and child-friendly.`;

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      throw new Error("API request failed");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Verification error:", error);

    // Fallback response
    return NextResponse.json({
      isCorrect: false,
      feedback: "Could not verify",
      encouragement: "Let's try again!",
    });
  }
}
