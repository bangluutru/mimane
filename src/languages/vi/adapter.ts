import type { AnalyzeContext, LanguageAdapter, LexEntry, ProficiencyRef, ViAnalysis, ViToken } from '../types';
import { parseSyllable } from './syllable';
import { splitByTerminators } from '../shared/text';
import { loadJson } from '../shared/data';

const WORD_RE = /[\p{L}\p{M}]+(?:[-'][\p{L}\p{M}]+)*|\d+(?:[.,]\d+)*|\s+|[^\p{L}\p{M}\d\s]+/gu;
const MAX_COMPOUND = 4;

let sharedLexicon: Promise<Record<string, LexEntry>> | undefined;
/** Lexicon compiled from all prepared lessons — used to segment imported text. */
function getSharedLexicon() {
  sharedLexicon ??= loadJson<Record<string, LexEntry>>('data/vi-lexicon.json').catch(() => ({}));
  return sharedLexicon;
}

export function segmentVietnamese(text: string, lexicon: Record<string, unknown>): ViToken[] {
  const raw = text.normalize('NFC').match(WORD_RE) ?? [];
  const tokens: ViToken[] = [];
  let i = 0;
  while (i < raw.length) {
    const piece = raw[i];
    if (!/[\p{L}\p{M}\d]/u.test(piece)) {
      tokens.push({ surface: piece, isWord: false });
      i++;
      continue;
    }
    // Greedy longest match over "word (space word)*"
    let matched = 1;
    for (let n = MAX_COMPOUND; n > 1; n--) {
      const parts: string[] = [];
      let j = i;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (k > 0) {
          if (raw[j] !== ' ') { ok = false; break; }
          j++;
        }
        const w = raw[j];
        if (!w || !/[\p{L}\p{M}]/u.test(w)) { ok = false; break; }
        parts.push(w.toLowerCase());
        j++;
      }
      if (ok && lexicon[parts.join(' ')]) {
        matched = n;
        break;
      }
    }
    const span = raw.slice(i, i + matched * 2 - 1);
    const surface = span.join('');
    const words = span.filter((p) => p !== ' ');
    const key = words.map((w) => w.toLowerCase()).join(' ');
    const syllables = words.map((w) => parseSyllable(w)).filter((s) => s !== null);
    tokens.push({
      surface,
      isWord: true,
      lemma: key,
      lexKey: lexicon[key] ? key : undefined,
      syllables: syllables.length === words.length ? syllables : undefined,
    });
    i += matched * 2 - 1;
  }
  return tokens;
}

export const viAdapter: LanguageAdapter<ViAnalysis> = {
  code: 'vi',
  framework: 'vi-level',
  accents: ['vi-north', 'vi-central', 'vi-south'],
  defaultAccent: 'vi-north',

  splitSentences: (text) => splitByTerminators(text, /[.!?…]+["”’)]*\s*/g),
  isSentenceFinal: (text) => /[.!?…]["”’)]*\s*$/.test(text.trim()),

  async analyze(text, ctx?: AnalyzeContext) {
    const lex = { ...(ctx?.lexicon ? {} : await getSharedLexicon()), ...(ctx?.lexicon ?? {}) };
    const tokens = segmentVietnamese(text, lex);
    for (const t of tokens) if (t.lexKey) t.pos = lex[t.lexKey]?.pos;
    return { lang: 'vi', tokens };
  },

  // Tones are meaning-bearing in Vietnamese: keep diacritics, only fold case/punct.
  normalizeForDictation: (text) =>
    text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\d\s]/gu, ' ').replace(/\s+/g, ' ').trim(),
  dictationUnits: (text) => text.split(' ').filter(Boolean),

  estimateDifficulty(analyses): ProficiencyRef | undefined {
    if (!analyses.length) return undefined;
    const avg = analyses.reduce((n, a) => n + a.tokens.filter((t) => t.isWord).length, 0) / analyses.length;
    const level = avg <= 5 ? 'beginner' : avg <= 8 ? 'elementary' : avg <= 12 ? 'intermediate' : 'upper-intermediate';
    return { framework: 'vi-level', level, estimated: true };
  },

  async lookup(token) {
    const lex = await getSharedLexicon();
    return token.lemma ? lex[token.lemma] : undefined;
  },
};
