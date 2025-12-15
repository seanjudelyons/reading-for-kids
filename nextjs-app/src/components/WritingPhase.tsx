"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { speakText } from "@/lib/gemini";

interface WritingPhaseProps {
  sentence: string;
  words: string[];
  onComplete: () => void;
}

type WordState = "pending" | "in_progress" | "completed";

interface WordProgress {
  word: string;
  state: WordState;
  revealedLetters: number;
  attempts: number;
}

export function WritingPhase({ sentence, words, onComplete }: WritingPhaseProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordProgress, setWordProgress] = useState<WordProgress[]>(
    words.map((word) => ({
      word,
      state: "pending",
      revealedLetters: 0,
      attempts: 0,
    }))
  );
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSpelling, setShowSpelling] = useState(false);
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = words[currentWordIndex];
  const currentProgress = wordProgress[currentWordIndex];

  // Initialize
  useEffect(() => {
    speakText("Now let's write the sentence! Type each word.");
    setWordProgress((prev) =>
      prev.map((wp, i) => ({
        ...wp,
        state: i === 0 ? "in_progress" : "pending",
      }))
    );
  }, []);

  // Focus input when current word changes
  useEffect(() => {
    inputRef.current?.focus();
    if (currentProgress?.state === "in_progress") {
      speakText(`Write the word: ${currentWord}`);
    }
  }, [currentWordIndex, currentProgress?.state, currentWord]);

  // Handle spelling reveal (letter by letter from right to left)
  const revealNextLetter = useCallback(async () => {
    const word = currentWord;
    const newIndex = spellingIndex + 1;

    if (newIndex <= word.length) {
      // Reveal from right to left (last letter first)
      const letterPosition = word.length - newIndex;
      const letter = word[letterPosition];
      await speakText(letter);
      setSpellingIndex(newIndex);
    } else {
      // All letters revealed, now user types the full word
      setShowSpelling(false);
      setSpellingIndex(0);
      setUserInput("");
      await speakText("Now type the whole word!");
    }
  }, [currentWord, spellingIndex]);

  const checkAnswer = async () => {
    const cleanInput = userInput.trim().toLowerCase();
    const expectedWord = currentWord.toLowerCase();

    if (cleanInput === expectedWord) {
      // Correct!
      setFeedback("Correct! Great job!");
      await speakText("Correct! Great job!");

      setWordProgress((prev) =>
        prev.map((wp, i) =>
          i === currentWordIndex
            ? { ...wp, state: "completed" }
            : i === currentWordIndex + 1
            ? { ...wp, state: "in_progress" }
            : wp
        )
      );

      setUserInput("");
      setShowSpelling(false);
      setSpellingIndex(0);

      if (currentWordIndex < words.length - 1) {
        setTimeout(() => {
          setCurrentWordIndex((prev) => prev + 1);
          setFeedback(null);
        }, 1000);
      } else {
        // All words complete!
        setIsComplete(true);
        await speakText("Amazing! You wrote the whole sentence!");
        setTimeout(onComplete, 2000);
      }
    } else {
      // Incorrect
      const attempts = currentProgress.attempts + 1;
      setWordProgress((prev) =>
        prev.map((wp, i) =>
          i === currentWordIndex
            ? {
                ...wp,
                attempts,
                revealedLetters: Math.min(
                  wp.revealedLetters + 1,
                  currentWord.length
                ),
              }
            : wp
        )
      );

      if (attempts === 1) {
        // First wrong attempt - show first letter hint
        setFeedback("Almost! Here's a hint...");
        await speakText(`The word starts with ${currentWord[0]}`);
      } else if (attempts === 2) {
        // Second wrong attempt - show more letters
        setFeedback("Let me show you more...");
        await speakText("Let me show you more letters!");
      } else if (attempts >= 3) {
        // Third wrong attempt - spell it out letter by letter (right to left)
        setFeedback("Let's spell it together!");
        await speakText("Let's spell it letter by letter!");
        setShowSpelling(true);
        setSpellingIndex(0);
      }

      setUserInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && userInput.trim()) {
      if (showSpelling) {
        revealNextLetter();
      } else {
        checkAnswer();
      }
    }
  };

  // Render letter boxes with hints
  const renderLetterBoxes = () => {
    const word = currentWord;
    const revealed = currentProgress.revealedLetters;

    if (showSpelling) {
      // Show letters being revealed from right to left
      return (
        <div className="flex justify-center gap-2 my-4">
          {word.split("").map((letter, index) => {
            const revealFromEnd = word.length - spellingIndex;
            const isRevealed = index >= revealFromEnd;
            return (
              <div
                key={index}
                className={isRevealed ? "letter-box-hint" : "letter-box"}
              >
                {isRevealed ? letter : "_"}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex justify-center gap-2 my-4">
        {word.split("").map((letter, index) => {
          const isHint = index < revealed;
          return (
            <div
              key={index}
              className={isHint ? "letter-box-hint" : "letter-box"}
            >
              {isHint ? letter : "_"}
            </div>
          );
        })}
      </div>
    );
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
      {/* Progress: Show sentence with completed words */}
      <div className="card max-w-3xl w-full">
        <p className="text-sm text-gray-500 mb-2 text-center">Your sentence:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {wordProgress.map((wp, index) => (
            <span
              key={index}
              className={`px-3 py-2 rounded-lg text-xl font-bold ${
                wp.state === "completed"
                  ? "bg-success text-white"
                  : wp.state === "in_progress"
                  ? "bg-accent text-gray-800 animate-pulse"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {wp.state === "completed" ? wp.word : "_ _ _"}
            </span>
          ))}
        </div>
      </div>

      {/* Current word to write */}
      <div className="card max-w-xl w-full text-center">
        <h3 className="text-xl text-gray-600 mb-2">
          Write this word ({currentWordIndex + 1}/{words.length}):
        </h3>

        {/* Letter boxes showing hints */}
        {renderLetterBoxes()}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="kid-input w-full max-w-sm mx-auto block mb-4"
          placeholder="Type here..."
          autoComplete="off"
          autoCapitalize="off"
          disabled={showSpelling && spellingIndex < currentWord.length}
        />

        {/* Feedback */}
        {feedback && (
          <div
            className={`bounce-in text-xl font-bold py-3 px-6 rounded-xl mb-4 ${
              feedback.includes("Correct")
                ? "bg-success text-white"
                : "bg-accent text-gray-800"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          {showSpelling ? (
            <button onClick={revealNextLetter} className="btn-primary">
              {spellingIndex < currentWord.length
                ? "Show Next Letter"
                : "Now Type It!"}
            </button>
          ) : (
            <>
              <button
                onClick={() => speakText(currentWord)}
                className="btn-secondary"
              >
                Hear Word
              </button>
              <button
                onClick={checkAnswer}
                className="btn-primary"
                disabled={!userInput.trim()}
              >
                Check
              </button>
            </>
          )}
        </div>
      </div>

      {/* Help text */}
      <p className="text-gray-500 text-center">
        {showSpelling
          ? "Watch the letters appear from right to left!"
          : currentProgress.attempts === 0
          ? "Type the word and press Enter or click Check"
          : currentProgress.attempts === 1
          ? "Look at the first letter hint!"
          : "Keep trying, you're doing great!"}
      </p>
    </div>
  );
}
