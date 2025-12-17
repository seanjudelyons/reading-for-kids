"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SpeechRecognitionResult } from "@/types";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
    length: number;
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function getLastNWords(text: string, n: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(-n);
}

function formatWordsToMatch(spokenWords: string[], targetSentence: string): string {
  // Get the target words from the sentence (strip punctuation for matching)
  const targetWords = targetSentence.split(/\s+/).filter(Boolean);
  const wordCount = targetWords.length;

  // Get the last N spoken words (where N = number of words in sentence)
  const lastSpokenWords = spokenWords.slice(-wordCount);

  // Format each spoken word to match the capitalization/punctuation of the target
  return lastSpokenWords.map((spokenWord, index) => {
    const targetWord = targetWords[index];
    if (!targetWord) return spokenWord;

    // Get the base word from target (without punctuation)
    const targetBase = targetWord.replace(/[^a-zA-Z']/g, "");
    const targetPunctuation = targetWord.replace(/[a-zA-Z']/g, "");

    // Check if target starts with uppercase
    const isCapitalized = targetBase[0] === targetBase[0]?.toUpperCase();

    // Format the spoken word
    let formatted = spokenWord.toLowerCase().replace(/[^a-zA-Z']/g, "");
    if (isCapitalized && formatted.length > 0) {
      formatted = formatted[0].toUpperCase() + formatted.slice(1);
    }

    // Add back any punctuation from the target word
    return formatted + targetPunctuation;
  }).join(" ");
}

interface UseSpeechRecognitionOptions {
  targetSentence?: string;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { targetSentence = "" } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const allWordsRef = useRef<string[]>([]);
  const targetSentenceRef = useRef(targetSentence);

  // Keep target sentence ref updated
  targetSentenceRef.current = targetSentence;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const startListening = useCallback(() => {
    console.log("[SpeechRecognition] startListening called");
    if (typeof window === "undefined") {
      console.log("[SpeechRecognition] window undefined, returning");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("[SpeechRecognition] Not supported");
      setError("Speech recognition is not supported in this browser");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      console.log("[SpeechRecognition] Aborting existing recognition");
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalTranscriptRef.current = "";
    allWordsRef.current = [];
    setTranscript("");
    setError(null);

    recognition.onstart = () => {
      console.log("[SpeechRecognition] Started listening");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + " ";
          // Add finalized words to our word array
          const newWords = result[0].transcript.trim().split(/\s+/).filter(Boolean);
          allWordsRef.current = [...allWordsRef.current, ...newWords];
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Combine final words with interim words
      const interimWords = interimTranscript.trim().split(/\s+/).filter(Boolean);
      const allCurrentWords = [...allWordsRef.current, ...interimWords];

      // Format to match target sentence (word count and capitalization)
      const target = targetSentenceRef.current;
      if (target) {
        const wordCount = target.split(/\s+/).filter(Boolean).length;
        const lastWords = allCurrentWords.slice(-wordCount);
        setTranscript(formatWordsToMatch(lastWords, target));
      } else {
        // Fallback: just show last 6 words
        setTranscript(allCurrentWords.slice(-6).join(" "));
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log("[SpeechRecognition] Error:", event.error, event.message);
      if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] Ended");
      setIsListening(false);
    };

    try {
      recognition.start();
      console.log("[SpeechRecognition] start() called successfully");
    } catch (err) {
      setError("Failed to start speech recognition");
      console.error("[SpeechRecognition] Failed to start:", err);
    }
  }, []);

  const stopListening = useCallback((): SpeechRecognitionResult | null => {
    console.log("[SpeechRecognition] stopListening called, recognitionRef:", !!recognitionRef.current);
    console.log("[SpeechRecognition] allWordsRef:", allWordsRef.current);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);

      // Return the formatted transcript for verification
      const target = targetSentenceRef.current;
      const wordCount = target ? target.split(/\s+/).filter(Boolean).length : 6;
      const lastWords = allWordsRef.current.slice(-wordCount);
      const formattedTranscript = target
        ? formatWordsToMatch(lastWords, target)
        : lastWords.join(" ");

      console.log("[SpeechRecognition] Returning transcript:", formattedTranscript);
      return {
        transcript: formattedTranscript,
        confidence: 0.9,
        isFinal: true,
      };
    }
    console.log("[SpeechRecognition] No recognition instance, returning null");
    return null;
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    finalTranscriptRef.current = "";
    allWordsRef.current = [];
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
