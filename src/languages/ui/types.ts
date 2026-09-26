import type { FC } from 'react';
import type { Sentence, Lesson } from '@/domains/lesson/types';
import type { DisplayPrefs } from '@/domains/user/profile';
import type { AccentId, AnyToken, LexEntry, SupportLang } from '../types';
import type { TFn } from '@/app/i18n';

export interface SentenceViewProps {
  sentence: Sentence;
  variant: 'current' | 'list';
  display: DisplayPrefs;
  accent?: AccentId;
  selected?: number;
  onToken?: (tokenIndex: number) => void;
}

export interface VocabBodyProps {
  token: AnyToken;
  entry?: LexEntry;
  lesson: Lesson;
  ui: SupportLang;
  t: TFn;
}

export interface DisplaySettingsProps {
  display: DisplayPrefs;
  setDisplay: (p: Partial<DisplayPrefs>) => void;
  t: TFn;
}

/** React side of a language module — same registry key as the adapter. */
export interface LanguageUI {
  SentenceView: FC<SentenceViewProps>;
  VocabBody: FC<VocabBodyProps>;
  DisplaySettings: FC<DisplaySettingsProps>;
  /** extra line under the current sentence (e.g. tone legend) */
  CurrentExtras?: FC<{ display: DisplayPrefs; t: TFn; accent?: AccentId }>;
  lookupLinks(lemma: string, ui: SupportLang): { label: string; url: string }[];
  /** display form of a token in lists / cards */
  headword(token: AnyToken): { word: string; reading?: string };
}
