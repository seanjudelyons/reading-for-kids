"use client";

import { useState, useEffect, useRef } from "react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { speakText } from "@/lib/gemini";

interface ReadingPhaseProps {
  sentence: string;
  imageUrl: string | null;
  childName: string;
  onComplete: (spokenText: string) => void;
  onVerify: (spokenText: string) => Promise<{ isCorrect: boolean; feedback: string; encouragement: string }>;
}

export function ReadingPhase({
  sentence,
  imageUrl,
  childName,
  onComplete,
  onVerify,
}: ReadingPhaseProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const hasStartedRef = useRef(false);

  const {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ targetSentence: sentence });

  // Auto-start listening when component mounts (intro already spoken by parent)
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      resetTranscript();
      startListening();
    }
  }, [resetTranscript, startListening]);

  const handleStopReading = async () => {
    const result = stopListening();
    const spokenText = result?.transcript || "";

    setIsVerifying(true);
    try {
      if (spokenText) {
        const verification = await onVerify(spokenText);
        setFeedback(verification.encouragement);
        setIsCorrect(verification.isCorrect);
        await speakText(verification.encouragement);
      } else {
        // No speech detected - still move forward with encouragement
        setFeedback("Good try! Let's keep going!");
        setIsCorrect(true);
        await speakText("Good try! Let's keep going!");
      }

      // Always move forward after a moment - don't get stuck
      setTimeout(() => {
        onComplete(spokenText);
      }, 1500);
    } catch (err) {
      console.error("Verification error:", err);
      setFeedback("Let's keep going!");
      await speakText("Let's keep going!");
      setTimeout(() => {
        onComplete(spokenText);
      }, 1500);
    }
    setIsVerifying(false);
  };

  const handleTryAgain = () => {
    resetTranscript();
    setFeedback(null);
    setIsCorrect(null);
    startListening();
  };

  return (
    <div className="flex flex-col items-center gap-6 slide-up">
      {/* Story Image */}
      {imageUrl && (
        <div className="w-full max-w-md">
          <img
            src={imageUrl}
            alt="Story illustration"
            className="w-full h-64 object-cover rounded-2xl shadow-xl border-4 border-white"
          />
        </div>
      )}

      {/* Sentence Display */}
      <div className="card max-w-2xl w-full text-center">
        <p className="text-4xl font-bold text-gray-800 leading-relaxed">
          {sentence}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
          {/* Microphone Status */}
          {isListening && (
            <div className="flex items-center gap-3">
              <div className="recording-pulse w-6 h-6 bg-red-500 rounded-full" />
              <span className="text-xl font-bold text-red-500">
                Listening...
              </span>
            </div>
          )}

          {/* What the child said */}
          {transcript && (
            <div className="bg-white rounded-xl px-6 py-3 shadow-md">
              <p className="text-lg text-gray-600">You said:</p>
              <p className="text-2xl font-bold text-gray-800">{transcript}</p>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              className={`bounce-in text-2xl font-bold text-center px-6 py-4 rounded-2xl ${
                isCorrect
                  ? "bg-success text-gray-800"
                  : "bg-accent text-gray-800"
              }`}
            >
              {feedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {isListening ? (
              <button
                onClick={handleStopReading}
                className="btn-secondary"
                disabled={isVerifying}
              >
                Done
              </button>
            ) : isCorrect === false ? (
              <button onClick={handleTryAgain} className="btn-primary btn-glow">
                Try Again
              </button>
            ) : null}
          </div>

          {/* Error Display */}
          {error && (
            <p className="text-red-500 text-lg">{error}</p>
          )}

          {/* Browser Support Warning */}
          {!isSupported && (
            <div className="bg-yellow-100 rounded-xl px-6 py-4 text-center">
              <p className="text-lg text-yellow-800">
                Speech recognition is not supported in this browser.
                <br />
                Please try Chrome or Edge.
              </p>
            </div>
          )}
        </div>

      {/* Loading State */}
      {isVerifying && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xl">Checking...</span>
        </div>
      )}
    </div>
  );
}
