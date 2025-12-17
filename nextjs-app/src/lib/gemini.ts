import type { GeminiVerificationResult } from "@/types";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function verifyReading(
  expectedSentence: string,
  spokenText: string,
  apiKey: string
): Promise<GeminiVerificationResult> {
  const prompt = `You are a friendly teacher helping a young child (age 5-7) learn to read.

The child was supposed to read: "${expectedSentence}"
The child said: "${spokenText}"

Determine if the child read the sentence correctly. Be lenient with:
- Minor pronunciation differences
- Small words like "a", "the" being slightly off
- Slight word order mistakes

Respond in JSON format:
{
  "isCorrect": true/false,
  "feedback": "short specific feedback about what they said",
  "encouragement": "a short, warm, encouraging message for the child"
}

If correct, the encouragement should celebrate their success.
If incorrect, the encouragement should gently help them try again.
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

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return {
      isCorrect: false,
      feedback: "Could not verify",
      encouragement: "Let's try again!",
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      isCorrect: false,
      feedback: "Could not verify",
      encouragement: "Let's try again!",
    };
  }
}

export async function verifyWriting(
  expectedWord: string,
  writtenWord: string,
  apiKey: string
): Promise<GeminiVerificationResult> {
  const prompt = `You are a friendly teacher helping a young child (age 5-7) learn to write.

The child was supposed to write: "${expectedWord}"
The child wrote: "${writtenWord}"

Check if the spelling is correct (case insensitive).

Respond in JSON format:
{
  "isCorrect": true/false,
  "feedback": "short specific feedback",
  "encouragement": "a short, warm message for the child"
}

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

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return {
      isCorrect: false,
      feedback: "Could not verify",
      encouragement: "Let's try again!",
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      isCorrect: false,
      feedback: "Could not verify",
      encouragement: "Let's try again!",
    };
  }
}

export async function generateSpeech(
  text: string,
  apiKey: string
): Promise<string | null> {
  // Use Gemini TTS API
  const response = await fetch(
    `${GEMINI_API_URL}/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck", // A friendly, upbeat voice
              },
            },
          },
        },
      }),
    }
  );

  const data = await response.json();
  const audioPart = data.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data: string } }) => part.inlineData
  );

  if (audioPart?.inlineData?.data) {
    return audioPart.inlineData.data; // base64 encoded audio
  }

  return null;
}

// Convert PCM to WAV by adding header
function pcmToWav(pcmBase64: string): string {
  // Decode base64 to binary
  const pcmData = atob(pcmBase64);
  const pcmLength = pcmData.length;

  // WAV header parameters (Gemini TTS: mono, 24000 Hz, 16-bit)
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // Create WAV header (44 bytes)
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // "RIFF" chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmLength, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmLength, true);

  // Combine header and PCM data
  const wavArray = new Uint8Array(44 + pcmLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  for (let i = 0; i < pcmLength; i++) {
    wavArray[44 + i] = pcmData.charCodeAt(i);
  }

  // Convert to base64
  let binary = "";
  for (let i = 0; i < wavArray.length; i++) {
    binary += String.fromCharCode(wavArray[i]);
  }
  return btoa(binary);
}

// Helper to play base64 PCM audio from Gemini TTS
export function playBase64Audio(base64Data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const wavBase64 = pcmToWav(base64Data);
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(e);
      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Track current audio element to allow cancellation
let currentAudio: HTMLAudioElement | null = null;

// Audio cache for preloaded phrases
const audioCache = new Map<string, string>();

// Queue for throttled preloading
const preloadQueue: string[] = [];
let isProcessingQueue = false;
const DELAY_BETWEEN_REQUESTS_MS = 4500; // ~13 requests per minute to stay under limits

// Process the preload queue with delays between requests
async function processPreloadQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (preloadQueue.length > 0) {
    const text = preloadQueue.shift();
    if (!text || audioCache.has(text)) continue;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audio) {
          const wavBase64 = pcmToWav(data.audio);
          audioCache.set(text, wavBase64);
        }
      }
    } catch (error) {
      console.error("Preload error:", error);
    }

    // Wait before next request to avoid rate limits
    if (preloadQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
    }
  }

  isProcessingQueue = false;
}

// Add phrases to preload queue (throttled)
export function preloadAudioBatch(phrases: string[]): void {
  // Filter out already cached or queued phrases
  const newPhrases = phrases.filter(
    (phrase) => !audioCache.has(phrase) && !preloadQueue.includes(phrase)
  );

  preloadQueue.push(...newPhrases);
  processPreloadQueue(); // Start processing if not already running
}

// Preload a single phrase with high priority (adds to front of queue)
export function preloadAudioPriority(text: string): void {
  if (audioCache.has(text) || preloadQueue.includes(text)) return;
  preloadQueue.unshift(text); // Add to front
  processPreloadQueue();
}

// Check if audio is cached
export function isAudioCached(text: string): boolean {
  return audioCache.has(text);
}

// Stop any currently playing speech
export function stopSpeech(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// Main speak function - uses cache first, then Gemini TTS
export async function speakText(text: string): Promise<void> {
  // Stop any currently playing speech first
  stopSpeech();

  // Check cache first for instant playback
  if (audioCache.has(text)) {
    try {
      await playWavAudioWithTracking(audioCache.get(text)!);
      return;
    } catch (error) {
      // If cached playback fails, continue to fetch
      console.error("Cached audio playback failed:", error);
    }
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audio) {
        // Cache for future use
        const wavBase64 = pcmToWav(data.audio);
        audioCache.set(text, wavBase64);
        await playWavAudioWithTracking(wavBase64);
        return;
      }
    }
  } catch (error) {
    // Silently handle autoplay errors (NotAllowedError) - these are expected before user interaction
    if (error instanceof Error && error.name === "NotAllowedError") {
      return;
    }
    // Only log unexpected errors
    console.error("TTS error:", error);
  }
}

// Helper to play already-converted WAV audio with tracking
function playWavAudioWithTracking(wavBase64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      audio.onerror = (e) => {
        currentAudio = null;
        reject(e);
      };
      audio.play().catch((e) => {
        currentAudio = null;
        reject(e);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Helper to play PCM audio with tracking for cancellation (converts to WAV first)
function playBase64AudioWithTracking(base64Data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const wavBase64 = pcmToWav(base64Data);
      const audio = new Audio(`data:audio/wav;base64,${wavBase64}`);
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      audio.onerror = (e) => {
        currentAudio = null;
        reject(e);
      };
      audio.play().catch((e) => {
        currentAudio = null;
        reject(e);
      });
    } catch (error) {
      reject(error);
    }
  });
}
