import type { LexEntry, TargetLang } from '@/languages/types';

export interface SavedWord {
  id: string; // `${lang}:${lemma}`
  lang: TargetLang;
  lemma: string;
  surface: string;
  reading?: string;
  /** meaning in the learner's support language (editable by the learner) */
  meaning?: string;
  entry?: LexEntry;
  contexts: { lessonId: string; sentenceId: string; text: string }[];
  createdAt: string;
  /** reserved for Phase 2 spaced repetition */
  srs?: { due: string; interval: number; ease: number };
}
