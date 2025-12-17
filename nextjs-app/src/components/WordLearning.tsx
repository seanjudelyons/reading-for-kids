"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { speakText } from "@/lib/gemini";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

interface WordLearningProps {
  words: string[];
  sentence: string;
  childName: string;
  onComplete: () => void;
}

type Phase = "learning" | "quiz";

export function WordLearning({ words, sentence, childName, onComplete }: WordLearningProps) {
  const [phase, setPhase] = useState<Phase>("learning");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const hasStartedRef = useRef(false);

  const currentWord = words[currentWordIndex];

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ targetSentence: currentWord });

  // Auto-play through all words in learning phase
  const playAllWords = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    for (let i = 0; i < words.length; i++) {
      setCurrentWordIndex(i);
      await speakText(words[i]);
      // Small pause between words
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Transition to quiz phase
    setCurrentWordIndex(0);
    setPhase("quiz");
    setIsPlaying(false);
    await speakText(`Now let's see if you know the words, ${childName}! What word is this?`);
    // Auto-start listening after the prompt
    console.log("[WordLearning] Quiz phase starting, auto-starting listening");
    resetTranscript();
    startListening();
  }, [words, isPlaying, childName, resetTranscript, startListening]);

  // Start learning phase automatically
  useEffect(() => {
    if (!hasStartedRef.current && phase === "learning") {
      hasStartedRef.current = true;
      playAllWords();
    }
  }, [phase, playAllWords]);

  // Check how close two words are (simple similarity check)
  const getCloseness = (spoken: string, expected: string): "exact" | "close" | "wrong" => {
    const s = spoken.toLowerCase().replace(/[^a-z]/g, "");
    const e = expected.toLowerCase().replace(/[^a-z]/g, "");

    // Exact match
    if (s === e) return "exact";

    // One contains the other
    if (s.includes(e) || e.includes(s)) return "exact";

    // Check if they share the same starting sound (first 2+ chars)
    if (s.length >= 2 && e.length >= 2 && s.slice(0, 2) === e.slice(0, 2)) return "close";

    // Check if most letters match (allowing for some errors)
    const longer = Math.max(s.length, e.length);
    let matches = 0;
    for (let i = 0; i < Math.min(s.length, e.length); i++) {
      if (s[i] === e[i]) matches++;
    }
    if (matches / longer >= 0.6) return "close";

    return "wrong";
  };

  // Handle quiz answer
  const handleCheckAnswer = async () => {
    console.log("[WordLearning] handleCheckAnswer called");
    console.log("[WordLearning] isListening:", isListening);
    console.log("[WordLearning] transcript before stop:", transcript);

    const result = stopListening();
    console.log("[WordLearning] stopListening result:", result);

    if (!result?.transcript) {
      console.log("[WordLearning] No transcript, returning early");
      // Still allow moving forward even without transcript
      setQuizFeedback("I didn't hear anything. Try again!");
      await speakText("I didn't hear anything. Try again!");
      setTimeout(() => {
        setQuizFeedback(null);
        resetTranscript();
        startListening();
      }, 1500);
      return;
    }

    const spoken = result.transcript;
    console.log("[WordLearning] Spoken:", spoken, "Expected:", currentWord);
    const closeness = getCloseness(spoken, currentWord);
    const isExact = closeness === "exact";
    const isClose = closeness === "close";

    setIsCorrect(isExact);

    if (isExact) {
      setQuizFeedback("That's right! 🎉");
      await speakText(`That's right ${childName}! ${currentWordIndex < words.length - 1 ? "Next word!" : ""}`);

      // Move to next word or complete
      setTimeout(async () => {
        if (currentWordIndex < words.length - 1) {
          setCurrentWordIndex(prev => prev + 1);
          setQuizFeedback(null);
          setIsCorrect(null);
          resetTranscript();
          startListening();
        } else {
          await speakText(`Excellent ${childName}! You know all the words!`);
          setTimeout(onComplete, 1500);
        }
      }, 800);
    } else {
      // Give encouraging feedback based on how close they were
      const feedbackMessage = isClose
        ? `So close! You said "${spoken}". The word is "${currentWord}".`
        : `You said "${spoken}". This word is "${currentWord}".`;

      setQuizFeedback(feedbackMessage);

      // Encourage them to try again
      const spokenFeedback = isClose
        ? `So close ${childName}! The word is ${currentWord}. Try again!`
        : `You said ${spoken}. This word is ${currentWord}. Let's try again!`;

      await speakText(spokenFeedback);

      // Let them try the same word again
      setTimeout(() => {
        setQuizFeedback(null);
        setIsCorrect(null);
        resetTranscript();
        startListening();
      }, 1500);
    }
  };


  // Learning Phase - Show all words, highlight current one being spoken
  if (phase === "learning") {
    return (
      <div className="flex flex-col items-center gap-6 slide-up">
        <div className="card max-w-2xl w-full text-center">
          <h2 className="text-3xl font-bold text-primary mb-6">
            Let's learn each word!
          </h2>

          {/* Show all words with current one highlighted */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {words.map((word, index) => (
              <span
                key={index}
                className={`text-3xl px-4 py-2 rounded-xl transition-all duration-300 ${
                  index === currentWordIndex
                    ? "bg-accent font-bold scale-110 shadow-lg"
                    : index < currentWordIndex
                    ? "bg-success/30 text-gray-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {word}
              </span>
            ))}
          </div>

          {isPlaying && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" />
              <span className="text-lg">Listening...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quiz Phase - Ask child to identify each word
  return (
    <div className="flex flex-col items-center gap-6 slide-up">
      {/* Progress indicator */}
      <div className="flex gap-2">
        {words.map((_, index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full ${
              index < currentWordIndex
                ? "bg-success"
                : index === currentWordIndex
                ? "bg-primary animate-pulse"
                : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      <div className="card max-w-2xl w-full text-center">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-600">
            What word is this?
          </h2>
          <button
            onClick={() => speakText(sentence)}
            className="text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 flex items-center gap-1"
          >
            🔊 Hear Sentence
          </button>
        </div>

        {/* Show the word to identify */}
        <div className="text-6xl font-bold text-primary py-8 px-10 bg-accent/20 rounded-2xl inline-block">
          {currentWord}
        </div>

        {/* What child said */}
        {transcript && (
          <div className="mt-6 bg-white rounded-xl px-6 py-3 shadow-md inline-block">
            <p className="text-lg text-gray-600">You said:</p>
            <p className="text-2xl font-bold text-gray-800">{transcript}</p>
          </div>
        )}

        {/* Feedback */}
        {quizFeedback && (
          <div
            className={`mt-4 text-2xl font-bold text-center px-6 py-4 rounded-2xl ${
              isCorrect
                ? "bg-success text-gray-800"
                : "bg-accent text-gray-800"
            }`}
          >
            {quizFeedback}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-4">
        {isListening && (
          <div className="flex items-center gap-3">
            <div className="recording-pulse w-6 h-6 bg-red-500 rounded-full" />
            <span className="text-xl font-bold text-red-500">Listening...</span>
          </div>
        )}
        {!quizFeedback && (
          <button onClick={handleCheckAnswer} className="btn-primary">
            Done
          </button>
        )}
      </div>
    </div>
  );
}
