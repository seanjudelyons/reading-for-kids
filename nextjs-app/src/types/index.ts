export interface StoryPage {
  page_number: number;
  sentence: string;
  words: string[];
  image: string | null;
}

export interface Storybook {
  title: string;
  description: string;
  pages: StoryPage[];
}

export type LearningPhase =
  | "intro"           // Show the full sentence with image
  | "reading"         // Child reads the sentence aloud
  | "word_learning"   // Show individual words one by one
  | "writing"         // Child writes the sentence with hints
  | "complete";       // Sentence mastered

export type WritingHintLevel =
  | "full_blanks"     // All letters are blank: _ _ _ _ _ _
  | "first_letter"    // Show first letter: T _ _ _ _ _
  | "reveal_more"     // Progressively reveal more letters
  | "full_word"       // Show full word, then spell letter by letter
  | "success";        // Word correctly spelled

export interface LearningState {
  currentPageIndex: number;
  phase: LearningPhase;
  currentWordIndex: number;
  writingHintLevel: WritingHintLevel;
  revealedLetters: number;
  userInput: string;
  attempts: number;
  isCorrect: boolean | null;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface GeminiVerificationResult {
  isCorrect: boolean;
  feedback: string;
  encouragement: string;
}
