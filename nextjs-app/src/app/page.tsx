"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ReadingPhase } from "@/components/ReadingPhase";
import { WordLearning } from "@/components/WordLearning";
import { WritingPhase } from "@/components/WritingPhase";
import { speakText } from "@/lib/gemini";
import type { Storybook, LearningPhase } from "@/types";

// Book selection screen - first screen user sees
function BookSelectionScreen({
  storybook,
  onSelect,
}: {
  storybook: Storybook;
  onSelect: () => void;
}) {
  // Get first page image as cover
  const coverImage = storybook.pages[0]?.image;

  return (
    <div className="max-w-4xl w-full">
      <h1 className="text-4xl font-bold text-primary mb-8 text-center">
        Choose a Book
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Book card */}
        <button
          onClick={onSelect}
          className="card hover:shadow-2xl transform transition hover:scale-105 text-left p-0 overflow-hidden"
        >
          {/* Book cover image */}
          {coverImage ? (
            <img
              src={`/storybook/${coverImage}`}
              alt={storybook.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-6xl">📖</span>
            </div>
          )}

          {/* Book info */}
          <div className="p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {storybook.title}
            </h2>
            <p className="text-gray-600">{storybook.description}</p>
            <p className="text-sm text-gray-400 mt-2">
              {storybook.pages.length} pages
            </p>
          </div>
        </button>

        {/* Placeholder for more books - shows "coming soon" */}
        <div className="card bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-8 opacity-60">
          <span className="text-4xl mb-2">📚</span>
          <p className="text-gray-500 font-medium">More books coming soon!</p>
        </div>
      </div>
    </div>
  );
}

// Name input component with audio guidance
function NameInputScreen({
  onSubmit,
  childName,
  setChildName,
}: {
  onSubmit: (e: React.FormEvent) => void;
  childName: string;
  setChildName: (name: string) => void;
}) {
  const hasPlayedRef = useRef(false);
  const showButtonGlow = childName.trim().length > 0;

  useEffect(() => {
    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      speakText("Hello! What's your name? Type it in the box.");
    }
  }, []);

  return (
    <div className="card max-w-lg w-full text-center">
      <div className="text-6xl mb-4">👋</div>
      <h1 className="text-4xl font-bold text-primary mb-4">
        Hey, what is your name?
      </h1>
      <p className="text-xl text-gray-700 mb-6">
        Type it in here in the box.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-xl border-4 border-primary text-2xl text-center input-glow focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          className={`btn-primary w-full text-xl ${showButtonGlow ? "btn-glow" : "opacity-50"}`}
          disabled={!childName.trim()}
        >
          Let's Go!
        </button>
      </form>
    </div>
  );
}

// Main menu with three activity options
type AppMode = "menu" | "read_together" | "learn_to_read" | "writing_practice";

function MainMenuScreen({
  childName,
  onSelectMode,
}: {
  childName: string;
  onSelectMode: (mode: AppMode) => void;
}) {
  return (
    <div className="card max-w-2xl w-full text-center">
      <div className="text-6xl mb-4">📚</div>
      <h1 className="text-4xl font-bold text-primary mb-2">
        Hi {childName}!
      </h1>
      <p className="text-xl text-gray-700 mb-8">
        What would you like to do today?
      </p>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => onSelectMode("read_together")}
          className="btn-primary text-xl py-6 btn-glow flex items-center justify-center gap-3"
        >
          <span className="text-3xl">📖</span>
          <span>Read the Storybook Together</span>
        </button>

        <button
          onClick={() => onSelectMode("learn_to_read")}
          className="btn-secondary text-xl py-6 btn-glow-secondary flex items-center justify-center gap-3"
        >
          <span className="text-3xl">🎓</span>
          <span>Learn How to Read</span>
        </button>

        <button
          onClick={() => onSelectMode("writing_practice")}
          className="btn-accent text-xl py-6 btn-glow-accent flex items-center justify-center gap-3"
        >
          <span className="text-3xl">✏️</span>
          <span>Learn How to Write</span>
        </button>
      </div>
    </div>
  );
}

// Read Together mode - listen to the whole book
function ReadTogetherPage({
  page,
  pageNumber,
  totalPages,
  childName,
  onNext,
  onBack,
  onBackToMenu,
}: {
  page: { sentence: string; image: string | null; page_number: number };
  pageNumber: number;
  totalPages: number;
  childName: string;
  onNext: () => void;
  onBack: () => void;
  onBackToMenu: () => void;
}) {
  const hasPlayedRef = useRef(false);
  const lastPageRef = useRef(pageNumber);

  useEffect(() => {
    // Play audio when page changes
    if (lastPageRef.current !== pageNumber) {
      hasPlayedRef.current = false;
      lastPageRef.current = pageNumber;
    }

    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      speakText(page.sentence);
    }
  }, [page.sentence, pageNumber]);

  const handleReadAgain = () => {
    speakText(page.sentence);
  };

  const isLastPage = pageNumber === totalPages;
  const isFirstPage = pageNumber === 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBackToMenu}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
          >
            <span className="text-2xl">←</span>
            <span>Menu</span>
          </button>
          <span className="text-lg text-gray-600">
            Page {pageNumber} of {totalPages}
          </span>
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(pageNumber / totalPages) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col items-center gap-6 slide-up">
        {/* Story Image */}
        {page.image && (
          <div className="w-full max-w-md">
            <img
              src={`/storybook/${page.image}`}
              alt="Story illustration"
              className="w-full h-64 object-cover rounded-2xl shadow-xl border-4 border-white"
            />
          </div>
        )}

        {/* Sentence card */}
        <div className="card max-w-2xl w-full text-center">
          <p className="text-4xl font-bold text-gray-800 leading-relaxed">
            {page.sentence}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 justify-center">
          {!isFirstPage && (
            <button
              onClick={onBack}
              className="btn-secondary text-xl"
            >
              ← Back
            </button>
          )}

          <button
            onClick={handleReadAgain}
            className="bg-accent hover:bg-accent/80 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-lg transform transition hover:scale-105 text-xl"
          >
            🔊 Read Again
          </button>

          {isLastPage ? (
            <button
              onClick={onBackToMenu}
              className="btn-primary text-xl btn-glow"
            >
              Finish! 🎉
            </button>
          ) : (
            <button
              onClick={onNext}
              className="btn-primary text-xl btn-glow"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Default storybook for testing (will be replaced by generated content)
const defaultStorybook: Storybook = {
  title: "Newton and the Apple",
  description: "Learn how Isaac Newton discovered gravity!",
  pages: [
    {
      page_number: 1,
      sentence: "Isaac sat under a big tree.",
      words: ["Isaac", "sat", "under", "a", "big", "tree"],
      image: null,
    },
    {
      page_number: 2,
      sentence: "A red apple fell down fast.",
      words: ["A", "red", "apple", "fell", "down", "fast"],
      image: null,
    },
    {
      page_number: 3,
      sentence: "It bumped Isaac on his head.",
      words: ["It", "bumped", "Isaac", "on", "his", "head"],
      image: null,
    },
    {
      page_number: 4,
      sentence: "He asked why things fall down.",
      words: ["He", "asked", "why", "things", "fall", "down"],
      image: null,
    },
    {
      page_number: 5,
      sentence: "Isaac discovered a force called gravity.",
      words: ["Isaac", "discovered", "a", "force", "called", "gravity"],
      image: null,
    },
    {
      page_number: 6,
      sentence: "Now we know why apples fall!",
      words: ["Now", "we", "know", "why", "apples", "fall"],
      image: null,
    },
  ],
};

export default function Home() {
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [phase, setPhase] = useState<LearningPhase>("intro");
  const [apiKey, setApiKey] = useState("");
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [showStoryComplete, setShowStoryComplete] = useState(false);
  const [childName, setChildName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [isBookSelected, setIsBookSelected] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("menu");

  // Load storybook and check for server-side API key on mount
  useEffect(() => {
    async function loadStorybook() {
      try {
        const response = await fetch("/storybook/storybook.json");
        if (response.ok) {
          const data = await response.json();
          setStorybook(data);
        } else {
          // Use default storybook
          setStorybook(defaultStorybook);
        }
      } catch {
        setStorybook(defaultStorybook);
      }
    }

    async function checkApiKey() {
      try {
        const response = await fetch("/api/check-api-key");
        if (response.ok) {
          const { hasApiKey } = await response.json();
          if (hasApiKey) {
            setApiKey("server");
            setIsApiKeySet(true);
          }
        }
      } catch {
        // Ignore - user will need to enter key manually
      }
    }

    loadStorybook();
    checkApiKey();
  }, []);

  // Current page data
  const currentPage = storybook?.pages[currentPageIndex];
  const totalPages = storybook?.pages.length || 0;

  // Handle API key submission
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setIsApiKeySet(true);
      speakText("Welcome! Let's learn to read and write!");
    }
  };

  // Verify reading with Gemini
  const verifyReading = useCallback(
    async (spokenText: string) => {
      if (!currentPage) {
        return { isCorrect: false, feedback: "", encouragement: "Try again!" };
      }

      try {
        const response = await fetch("/api/verify-reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedSentence: currentPage.sentence,
            spokenText,
            apiKey,
          }),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error("Verification error:", error);
      }

      // Fallback: simple comparison
      const expected = currentPage.sentence.toLowerCase().replace(/[^a-z\s]/g, "");
      const spoken = spokenText.toLowerCase().replace(/[^a-z\s]/g, "");
      const isCorrect = expected === spoken || spoken.includes(expected) || expected.includes(spoken);

      return {
        isCorrect,
        feedback: isCorrect ? "You read it correctly!" : "Not quite right",
        encouragement: isCorrect ? "Great job! You're amazing!" : "Let's try again!",
      };
    },
    [currentPage, apiKey]
  );

  // Handle book selection
  const handleBookSelect = () => {
    setIsBookSelected(true);
  };

  // Handle name submission - go to main menu
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childName.trim()) {
      setIsNameSet(true);
      // Menu audio will play from MainMenuScreen component
    }
  };

  // Handle mode selection from main menu
  const handleSelectMode = async (mode: AppMode) => {
    setAppMode(mode);
    setCurrentPageIndex(0);

    if (mode === "read_together" && currentPage) {
      setPhase("intro");
      await speakText(`Let's read the story together, ${childName}! I'll read each page to you.`);
    } else if (mode === "learn_to_read" && currentPage) {
      setPhase("reading");
      await speakText(`Let's learn to read, ${childName}! Here's the first sentence: ${currentPage.sentence}. Now you read it out loud! Press Done when you're finished.`);
    } else if (mode === "writing_practice" && currentPage) {
      setPhase("writing");
      await speakText(`Let's practice writing, ${childName}! Try to write this sentence.`);
    }
  };

  // Return to main menu
  const handleBackToMenu = () => {
    setAppMode("menu");
    setCurrentPageIndex(0);
    setPhase("intro");
    setShowStoryComplete(false);
    setShowChoice(false);
  };

  // Phase transitions
  const handleReadingComplete = () => {
    setPhase("word_learning");
  };

  const handleWordLearningComplete = async () => {
    // Show choice: read next or write
    setShowChoice(true);
    await speakText(`Great work ${childName}! What would you like to do next? Click a button to choose.`);
  };

  const handleChooseNextSentence = async () => {
    setShowChoice(false);
    if (currentPageIndex < totalPages - 1) {
      const nextPage = storybook?.pages[currentPageIndex + 1];
      setCurrentPageIndex((prev) => prev + 1);
      setPhase("reading");
      // Go straight to reading the next sentence
      await speakText(`Great job ${childName}! Here's the next sentence: ${nextPage?.sentence}. Now you read it!`);
    } else {
      setShowStoryComplete(true);
      await speakText(`Congratulations ${childName}! You finished the whole story!`);
    }
  };

  const handleChooseWriting = async () => {
    setShowChoice(false);
    setPhase("writing");
    await speakText(`Okay ${childName}, let's write the sentence!`);
  };

  const handleWritingComplete = async () => {
    if (currentPageIndex < totalPages - 1) {
      const nextPage = storybook?.pages[currentPageIndex + 1];
      setCurrentPageIndex((prev) => prev + 1);
      setPhase("reading");
      // Go straight to reading the next sentence
      await speakText(`Excellent ${childName}! Here's the next sentence: ${nextPage?.sentence}. Now you read it!`);
    } else {
      setShowStoryComplete(true);
      await speakText(`Congratulations ${childName}! You finished the whole story!`);
    }
  };

  const handleStartPage = async () => {
    if (currentPage) {
      // Play the sentence, then switch to reading phase
      await speakText(currentPage.sentence);
      setPhase("reading");
    }
  };

  const handleRestart = () => {
    setCurrentPageIndex(0);
    setPhase("intro");
    setShowStoryComplete(false);
  };

  // Read Together mode navigation
  const handleReadTogetherNext = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const handleReadTogetherBack = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  // Writing Practice mode navigation
  const handleWritingPracticeComplete = async () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      const nextPage = storybook?.pages[currentPageIndex + 1];
      await speakText(`Great job ${childName}! Now try writing this sentence.`);
    } else {
      setShowStoryComplete(true);
      await speakText(`Amazing ${childName}! You wrote the whole story!`);
    }
  };

  // Loading state
  if (!storybook) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-2xl font-bold text-gray-700">Loading story...</p>
        </div>
      </main>
    );
  }

  // API Key input (first time)
  if (!isApiKeySet) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">
            {storybook.title}
          </h1>
          <p className="text-xl text-gray-700 mb-6">{storybook.description}</p>

          <div className="bg-accent/30 rounded-xl p-4 mb-6">
            <p className="text-lg text-gray-700">
              To use AI-powered reading verification, please enter your Gemini
              API key. Your key stays in your browser.
            </p>
          </div>

          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Gemini API Key"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:outline-none text-lg"
            />
            <button type="submit" className="btn-primary w-full">
              Start Learning!
            </button>
          </form>

          <button
            onClick={() => {
              setApiKey("demo");
              setIsApiKeySet(true);
            }}
            className="mt-4 text-gray-500 underline"
          >
            Skip (use basic mode)
          </button>
        </div>
      </main>
    );
  }

  // Book selection screen (first screen after API key)
  if (!isBookSelected) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <BookSelectionScreen storybook={storybook} onSelect={handleBookSelect} />
      </main>
    );
  }

  // Name input screen (after book selection)
  if (!isNameSet) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <NameInputScreen onSubmit={handleNameSubmit} childName={childName} setChildName={setChildName} />
      </main>
    );
  }

  // Main menu screen
  if (appMode === "menu") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <MainMenuScreen childName={childName} onSelectMode={handleSelectMode} />
      </main>
    );
  }

  // Read Together mode
  if (appMode === "read_together" && currentPage) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <ReadTogetherPage
          page={currentPage}
          pageNumber={currentPageIndex + 1}
          totalPages={totalPages}
          childName={childName}
          onNext={handleReadTogetherNext}
          onBack={handleReadTogetherBack}
          onBackToMenu={handleBackToMenu}
        />
      </main>
    );
  }

  // Writing Practice mode
  if (appMode === "writing_practice" && currentPage) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBackToMenu}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
              >
                <span className="text-2xl">←</span>
                <span>Menu</span>
              </button>
              <span className="text-lg text-gray-600">
                Page {currentPageIndex + 1} of {totalPages}
              </span>
            </div>

            {/* Progress bar */}
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentPageIndex + 1) / totalPages) * 100}%` }}
              />
            </div>
          </header>

          <WritingPhase
            sentence={currentPage.sentence}
            words={currentPage.words}
            onComplete={handleWritingPracticeComplete}
          />
        </div>
      </main>
    );
  }

  // Story complete
  if (showStoryComplete) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-9xl mb-6">🏆</div>
          <h1 className="text-5xl font-bold text-success mb-4">
            Amazing job, {childName}!
          </h1>
          <p className="text-2xl text-gray-700 mb-6">
            You finished the whole story about Newton!
          </p>
          <div className="card inline-block px-8 py-6 mb-6">
            <p className="text-xl text-gray-600">Pages completed:</p>
            <p className="text-6xl font-bold text-primary">{totalPages}</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={handleBackToMenu} className="btn-secondary">
              Back to Menu
            </button>
            <button onClick={handleRestart} className="btn-primary">
              Read Again!
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Choice screen after word learning
  if (showChoice) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center">
          <div className="text-6xl mb-4">⭐</div>
          <h1 className="text-3xl font-bold text-primary mb-4">
            Great work, {childName}!
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            What would you like to do next?
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleChooseNextSentence}
              className="btn-primary text-xl py-4 btn-glow"
            >
              📖 Read Next Sentence
            </button>
            <button
              onClick={handleChooseWriting}
              className="btn-secondary text-xl py-4 btn-glow-secondary"
            >
              ✏️ Write This Sentence
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Learn to Read mode (default fallback for existing flow)
  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToMenu}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <span className="text-xl">←</span>
              <span>Menu</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-primary">{storybook.title}</h1>
              <p className="text-lg text-gray-500">Learning with {childName}</p>
            </div>
          </div>
          <span className="text-lg text-gray-600">
            Page {currentPageIndex + 1} of {totalPages}
          </span>
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${((currentPageIndex + 1) / totalPages) * 100}%`,
            }}
          />
        </div>

        {/* Phase indicator */}
        <div className="flex justify-center gap-2 mt-4">
          {["intro", "reading", "word_learning"].map((p, i) => {
            const labels = ["📖", "🎤", "🔤"];
            const phaseOrder = ["intro", "reading", "word_learning", "writing"];
            const currentPhaseIndex = phaseOrder.indexOf(phase);
            const thisPhaseIndex = phaseOrder.indexOf(p);

            return (
              <div
                key={p}
                className={`flex items-center ${i > 0 ? "ml-2" : ""}`}
              >
                {i > 0 && <div className="w-8 h-1 bg-gray-300 mr-2" />}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    phase === p
                      ? "bg-primary text-white"
                      : currentPhaseIndex > thisPhaseIndex
                      ? "bg-success text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {labels[i]}
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main content area */}
      <div className="max-w-4xl mx-auto">
        {phase === "intro" && currentPage && (
          <div className="flex flex-col items-center gap-6 slide-up">
            {/* Story Image */}
            {currentPage.image && (
              <div className="w-full max-w-md">
                <img
                  src={`/storybook/${currentPage.image}`}
                  alt="Story illustration"
                  className="w-full h-64 object-cover rounded-2xl shadow-xl border-4 border-white"
                />
              </div>
            )}

            {/* Page number */}
            <div className="text-6xl">📖</div>

            {/* Sentence card */}
            <div className="card max-w-2xl w-full text-center">
              <h2 className="text-2xl text-gray-500 mb-4">
                Page {currentPage.page_number}
              </h2>
              <p className="text-4xl font-bold text-gray-800 leading-relaxed">
                {currentPage.sentence}
              </p>
            </div>

            {/* Start button */}
            <button onClick={handleStartPage} className="btn-primary text-2xl btn-glow">
              Start Reading!
            </button>
          </div>
        )}

        {phase === "reading" && currentPage && (
          <ReadingPhase
            sentence={currentPage.sentence}
            imageUrl={
              currentPage.image ? `/storybook/${currentPage.image}` : null
            }
            childName={childName}
            onComplete={handleReadingComplete}
            onVerify={verifyReading}
          />
        )}

        {phase === "word_learning" && currentPage && (
          <WordLearning
            words={currentPage.words}
            sentence={currentPage.sentence}
            childName={childName}
            onComplete={handleWordLearningComplete}
          />
        )}

        {phase === "writing" && currentPage && (
          <WritingPhase
            sentence={currentPage.sentence}
            words={currentPage.words}
            onComplete={handleWritingComplete}
          />
        )}
      </div>
    </main>
  );
}
