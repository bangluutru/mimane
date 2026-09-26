import type { LexEntry, PartOfSpeech, TargetLang } from '@/languages/types';

/** Raw authoring format in content/lexicon/<lang>.json (see content/README.md). */
export interface RawLexEntry {
  reading?: string;
  pos?: PartOfSpeech;
  vi?: string;
  en?: string;
  ja?: string;
  jlpt?: string;
  cefr?: string;
  forms?: string[];
  note?: LexEntry['note'];
  regional?: LexEntry['regional'];
}

export type Lexicon = Record<string, LexEntry & { forms?: string[] }>;

export function normalizeLexicon(lang: TargetLang, raw: Record<string, RawLexEntry>): Lexicon {
  const out: Lexicon = {};
  for (const [key, r] of Object.entries(raw)) {
    const k = key.normalize('NFC');
    const meanings: LexEntry['meanings'] = {};
    for (const l of ['vi', 'en', 'ja'] as const) if (r[l] && l !== lang) meanings[l] = r[l];
    const e: LexEntry & { forms?: string[] } = { lang, lemma: k, meanings, source: 'lesson' };
    if (r.reading) e.reading = r.reading;
    if (r.pos) e.pos = r.pos;
    if (r.jlpt) e.level = { framework: 'jlpt', level: r.jlpt };
    if (r.cefr) e.level = { framework: 'cefr', level: r.cefr };
    if (r.forms?.length) e.forms = r.forms;
    if (r.note) e.note = r.note;
    if (r.regional) e.regional = r.regional;
    out[lang === 'ja' ? k : k.toLowerCase()] = e;
  }
  return out;
}
