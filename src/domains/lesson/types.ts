import type {
  AccentId, LexEntry, Localized, ProficiencyRef, SentenceAnalysis, SupportLang, TargetLang,
} from '@/languages/types';
import type { CategoryId } from '@/domains/library/taxonomy';

export type MediaSource =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'file'; mediaType: 'audio' | 'video'; url: string }
  | { kind: 'blob'; mediaType: 'audio' | 'video'; blobId: string; fileName?: string }
  | { kind: 'url'; mediaType: 'audio' | 'video'; url: string };

/** The Sentence Learning Unit — every learning feature attaches to this. */
export interface Sentence {
  id: string;
  index: number;
  start: number; // seconds
  end: number;
  text: string;
  speaker?: string;
  translations: Localized;
  analysis?: SentenceAnalysis;
  note?: Localized;
}

export interface LessonSource {
  kind: 'prepared' | 'user-import';
  attribution?: string;
  url?: string;
  license?: string;
  /** true when audio is machine-synthesised (demo content) */
  synthetic?: boolean;
  /** 'auto' when the transcript came from speech recognition (may contain errors) */
  transcript?: 'provided' | 'auto';
  /** e.g. "faster-whisper large-v3-turbo" */
  transcriber?: string;
}

export interface LessonMeta {
  id: string;
  schemaVersion: 1;
  origin: 'catalog' | 'user';
  title: Localized & { original: string };
  description?: Localized;
  targetLanguage: TargetLang;
  supportLanguages: SupportLang[];
  media: MediaSource;
  durationSec: number;
  sentenceCount: number;
  categories: CategoryId[];
  tags: string[];
  difficulty?: ProficiencyRef;
  accent?: AccentId;
  speakers?: string[];
  thumbnail?: string;
  source: LessonSource;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson extends LessonMeta {
  sentences: Sentence[];
  /** offline dictionary for words in this lesson (lexKey → entry) */
  glossary: Record<string, LexEntry>;
  /** true while timings are missing (TXT import awaiting tap-to-sync) */
  needsSync?: boolean;
}

export const sentenceId = (lessonId: string, index: number) => `${lessonId}#${index}`;

export function lessonTitle(l: Pick<LessonMeta, 'title'>, ui: SupportLang): { primary: string; secondary?: string } {
  const t = l.title[ui];
  return t && t !== l.title.original ? { primary: l.title.original, secondary: t } : { primary: l.title.original };
}

export function toMeta(l: Lesson): LessonMeta {
  const { sentences: _s, glossary: _g, needsSync: _n, ...meta } = l;
  return meta;
}
