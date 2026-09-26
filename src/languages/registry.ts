import type { LanguageAdapter, SentenceAnalysis, TargetLang } from './types';
import { jaAdapter } from './ja/adapter';
import { enAdapter } from './en/adapter';
import { viAdapter } from './vi/adapter';

const ADAPTERS: Record<TargetLang, LanguageAdapter> = {
  ja: jaAdapter as LanguageAdapter,
  en: enAdapter as LanguageAdapter,
  vi: viAdapter as LanguageAdapter,
};

export function getAdapter<A extends SentenceAnalysis = SentenceAnalysis>(lang: TargetLang): LanguageAdapter<A> {
  const a = ADAPTERS[lang];
  if (!a) throw new Error(`No language adapter for ${lang}`);
  return a as unknown as LanguageAdapter<A>;
}

export const TARGET_LANGS: TargetLang[] = ['ja', 'en', 'vi'];

/** Guess target language of pasted text (used as a default on import). */
export function detectLanguage(text: string): TargetLang {
  const sample = text.slice(0, 2000);
  if (/[぀-ヿ]/.test(sample)) return 'ja';
  const viMarks = sample.match(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi)?.length ?? 0;
  if (viMarks > sample.length * 0.02) return 'vi';
  return 'en';
}
