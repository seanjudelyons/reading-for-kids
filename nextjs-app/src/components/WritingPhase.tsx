"use client";

import { useState, useEffect, useRef } from "react";
import { speakText } from "@/lib/gemini";

interface WritingPhaseProps {
  sentence: string;
  words: string[];
  onComplete: () => void;
}

export function WritingPhase({ sentence, words, onComplete }: WritingPhaseProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSneakPeek, setShowSneakPeek] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const hasInitialized = useRef(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentWord = words[currentWordIndex];

  // Initialize
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      speakText("Now let's write! Fill in the missing word.");
    }
  }, []);

  // Focus input when word changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentWordIndex]);

  // Build sentence with blank for current word
  const renderSentenceWithBlank = () => {
    return words.map((word, index) => {
      if (index === currentWordIndex) {
        return (
          <span key={index} className="inline-block mx-1">
            <span className="px-4 py-2 bg-accent/30 rounded-lg border-2 border-dashed border-primary text-primary font-bold">
              _____
            </span>
          </span>
        );
      }
      return (
        <span key={index} className="mx-1 text-gray-800">
          {word}
        </span>
      );
    });
  };

  const handleSneakPeek = async () => {
    setShowSneakPeek(true);
    await speakText(currentWord);
    // Hide after 2 seconds
    setTimeout(() => {
      setShowSneakPeek(false);
      inputRef.current?.focus();
    }, 2000);
  };

  const checkAnswer = async () => {
    const cleanInput = userInput.trim().toLowerCase();
    const expectedWord = currentWord.toLowerCase();

    if (cleanInput === expectedWord) {
      // Correct!
      setFeedback("Correct!");
      setIsCorrect(true);
      await speakText("Correct!");

      if (currentWordIndex < words.length - 1) {
        setTimeout(() => {
          setCurrentWordIndex((prev) => prev + 1);
          setUserInput("");
          setFeedback(null);
          setIsCorrect(null);
        }, 1000);
      } else {
        // All words complete!
        setIsComplete(true);
        await speakText("Amazing! You wrote the whole sentence!");
        setTimeout(onComplete, 2000);
      }
    } else {
      // Incorrect - try again
      setFeedback(`Not quite. Try again!`);
      setIsCorrect(false);
      await speakText("Not quite. Try again!");
      setUserInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userInput.trim()) {
      checkAnswer();
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center gap-6 bounce-in">
        <div className="text-8xl">🎉</div>
        <div className="card max-w-2xl w-full text-center">
          <h2 className="text-4xl font-bold text-success mb-4">
            You did it!
          </h2>
          <p className="text-2xl text-gray-700 mb-4">
            You wrote the whole sentence:
          </p>
          <p className="text-3xl font-bold text-gray-800">{sentence}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 slide-up">
      {/* Sneak Peek Overlay */}
      {showSneakPeek && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-12 shadow-2xl bounce-in">
            <p className="text-sm text-gray-500 mb-2 text-center">The word is:</p>
            <p className="text-6xl font-bold text-primary">{currentWord}</p>
          </div>
        </div>
      )}

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

      {/* Sentence with blank */}
      <div className="card max-w-3xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl text-gray-600">Fill in the missing word:</h3>
          <button
            onClick={() => speakText(sentence)}
            className="text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 flex items-center gap-1"
          >
            🔊 Hear Sentence
          </button>
        </div>
        <p className="text-3xl font-bold text-center leading-relaxed">
          {renderSentenceWithBlank()}
        </p>
      </div>

      {/* Input area */}
      <div className="card max-w-xl w-full text-center">
        <p className="text-lg text-gray-600 mb-4">
          Type the missing word:
        </p>

        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full max-w-xs mx-auto block mb-4 px-4 py-3 text-2xl text-center rounded-xl border-4 border-primary focus:outline-none focus:border-accent"
          placeholder="Type here..."
          autoComplete="off"
          autoCapitalize="off"
        />

        {/* Feedback */}
        {feedback && (
          <div
            className={`bounce-in text-xl font-bold py-3 px-6 rounded-xl mb-4 inline-block ${
              isCorrect
                ? "bg-success text-white"
                : "bg-accent text-gray-800"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={handleSneakPeek}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
            disabled={showSneakPeek}
          >
            👀 Sneak Peek
          </button>
          <button
            onClick={checkAnswer}
            className="btn-primary"
            disabled={!userInput.trim()}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
