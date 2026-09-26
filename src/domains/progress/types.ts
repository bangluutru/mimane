export interface LessonProgress {
  lessonId: string;
  lastSentenceIndex: number;
  practicedSentenceIds: string[];
  completed: boolean;
  completedAt?: string;
  listenedMs: number;
  shadowedMs: number;
  startedAt: string;
  lastOpenedAt: string;
}

export interface SentenceMark {
  sentenceId: string;
  lessonId: string;
  favorite: boolean;
  difficult: boolean;
  plays: number;
  repeats: number;
  recordings: number;
  lastPracticedAt?: string;
  /** reserved for Phase 2 spaced repetition (shared with vocabulary) */
  srs?: { due: string; interval: number; ease: number };
}

export interface Stats {
  minutesListened: number;
  minutesShadowed: number;
  sentencesPracticed: number;
  lessonsCompleted: number;
  wordsSaved: number;
  recordings: number;
}
