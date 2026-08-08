export type ExerciseType = 'VOCAB' | 'MATCHING' | 'FILL_BLANK' | 'REWRITE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ORDERING' | 'SHORT_ANSWER';

export interface ExerciseItem {
  id: string;
  listId: string;
  type: ExerciseType;
  instruction: string;
  question: string;
  answer: string;
  options?: string[];
  imageB64?: string;
  image_b64?: string; // Khai bÃ¡o cáº£ snake_case cho tÆ°Æ¡ng thÃ­ch
  listName?: string;
  folderId?: string;
  dateLearned: string;
}

export interface VocabList {
  id: string;
  name: string;
  date: string;
  items: ExerciseItem[];
  folderId?: string;
}

export interface ExerciseProgress {
  listId: string;
  completedAt: string;
  score: number;
  total: number;
}

export interface ExerciseFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface PomodoroSession {
  id: string;
  completedAt: string;
  studyDate: string;
  minutes: number;
}

export interface VocaWord {
  id: string;
  word: string;
  meaning: string;
  ipa: string;
  example: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  intervalDays: number;
  easeFactor: number;
  folderId?: string;
}

export interface VocaFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  mode: 'markdown' | 'plain';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export enum AppMode {
  HOME = 'HOME',
  CROP = 'CROP',
  PROCESSING = 'PROCESSING',
  EDITOR = 'EDITOR',
  QUIZ = 'QUIZ',
  PRONUNCIATION = 'PRONUNCIATION',
  HISTORY = 'HISTORY',
  VOCA = 'VOCA',
  NOTE = 'NOTE',
  POMODORO = 'POMODORO',
  STREAK = 'STREAK'
}

export interface QuizState {
  currentIndex: number;
  score: number;
  isFinished: boolean;
  userInput: string;
  selectedOption: string | null;
  feedback: 'correct' | 'incorrect' | null;
}


