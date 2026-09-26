import type {
  AnalyzeContext, JaAnalysis, JaToken, JlptLevel, LanguageAdapter, LexEntry, PartOfSpeech, ProficiencyRef,
} from '../types';
import { loadJson } from '../shared/data';
import { splitByTerminators } from '../shared/text';
import { alignFurigana } from './furigana';
import { KANJI_RE, hasKanji, toHiragana } from './kana';

/* ------------------------------------------------------------ tokenizer */

export interface KuromojiToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  conjugated_form: string;
  basic_form: string;
  reading?: string;
}
interface Tokenizer { tokenize(text: string): KuromojiToken[] }

let dicPath = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/') + 'dict/';
let tokenizerPromise: Promise<Tokenizer> | undefined;

/** Override the dictionary location (Node build scripts point at node_modules). */
export function configureJapanese(opts: { dicPath: string }) {
  dicPath = opts.dicPath;
  tokenizerPromise = undefined;
}

type KuromojiModule = { builder(o: { dicPath: string }): { build(cb: (e: unknown, t: Tokenizer) => void): void } };

/**
 * Browser: load kuromoji's prebuilt UMD bundle lazily (only when Japanese text
 * must be analysed on-device, e.g. an import). Node build scripts import the
 * package directly.
 */
async function loadKuromoji(): Promise<KuromojiModule> {
  if (typeof window === 'undefined') {
    const name = 'kuromoji';
    const mod = await import(/* @vite-ignore */ name);
    return (mod.default ?? mod) as KuromojiModule;
  }
  const w = window as unknown as { kuromoji?: KuromojiModule };
  if (!w.kuromoji) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = dicPath.replace(/dict\/$/, '') + 'vendor/kuromoji.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Japanese tokenizer'));
      document.head.appendChild(s);
    });
  }
  return w.kuromoji!;
}

export function getTokenizer(): Promise<Tokenizer> {
  tokenizerPromise ??= loadKuromoji().then(
    (k) =>
      new Promise<Tokenizer>((resolve, reject) => {
        // kuromoji can throw inside XHR callbacks without calling back: never hang
        const timer = setTimeout(() => reject(new Error('Japanese tokenizer timed out')), 90_000);
        k.builder({ dicPath }).build((err, t) => {
          clearTimeout(timer);
          if (err) reject(err);
          else resolve(t);
        });
      }),
  );
  tokenizerPromise.catch(() => (tokenizerPromise = undefined));
  return tokenizerPromise;
}

/* ------------------------------------------------------------ JLPT data */

type WordList = Record<string, [reading: string, level: number, en: string]>;
const getWordList = () => loadJson<WordList>('data/ja-jlpt.json').catch(() => ({}) as WordList);
const getKanjiLevels = () => loadJson<Record<string, number>>('data/ja-kanji-jlpt.json').catch(() => ({}));

const JLPT_BY_NUM: Record<number, JlptLevel> = { 5: 'N5', 4: 'N4', 3: 'N3', 2: 'N2', 1: 'N1' };
export const JLPT_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

function kanjiEstimate(surface: string, kanji: Record<string, number>): JlptLevel | undefined {
  let hardest = 6;
  for (const ch of surface) {
    if (!KANJI_RE.test(ch) || ch === '々') continue;
    hardest = Math.min(hardest, kanji[ch] ?? 1); // unknown kanji → treat as N1 (rare)
  }
  return hardest === 6 ? undefined : JLPT_BY_NUM[hardest];
}

/* ------------------------------------------------------ POS & conjugation */

function mapPos(t: KuromojiToken): PartOfSpeech {
  switch (t.pos) {
    case '名詞':
      if (t.pos_detail_1 === '代名詞') return 'pronoun';
      if (t.pos_detail_1 === '数') return 'numeral';
      if (t.pos_detail_1 === '形容動詞語幹') return 'adjective';
      if (t.pos_detail_1 === '接尾') return 'suffix';
      return 'noun';
    case '動詞': return 'verb';
    case '形容詞': return 'adjective';
    case '副詞': return 'adverb';
    case '助詞': return 'particle';
    case '助動詞': return 'auxiliary';
    case '接続詞': return 'conjunction';
    case '連体詞': return 'determiner';
    case '感動詞': case 'フィラー': return 'interjection';
    case '接頭詞': return 'prefix';
    case '記号': return 'symbol';
    default: return 'other';
  }
}

const AUX_LABEL: Record<string, string> = {
  ます: 'polite', た: 'past', だ: 'past', ない: 'negative', ぬ: 'negative', ん: 'negative',
  たい: 'desire', れる: 'passive/potential', られる: 'passive/potential', せる: 'causative',
  させる: 'causative', う: 'volitional', よう: 'volitional', て: 'te-form', で: 'te-form',
  ば: 'conditional', いる: 'progressive/state', しまう: 'completion', おく: 'preparation',
  みる: 'try', くる: 'change', いく: 'change', そう: 'appearance', たら: 'conditional',
};
const TE_AUX_VERBS = new Set(['いる', 'ある', 'おく', 'しまう', 'みる', 'くる', 'いく', 'ください', 'くださる']);

/** Should `next` be absorbed into the verb/adjective word that is being built? */
function absorbs(next: KuromojiToken, after: KuromojiToken | undefined): boolean {
  // です only continues an adjective (高いです); elsewhere it starts its own word (学生 | です)
  if (next.pos === '助動詞') return next.basic_form !== 'です' || after?.pos === '形容詞';
  if (next.pos === '動詞' && (next.pos_detail_1 === '接尾' || (next.pos_detail_1 === '非自立' && TE_AUX_VERBS.has(next.basic_form))))
    return true;
  if (next.pos === '形容詞' && next.pos_detail_1 === '非自立') return true;
  if (next.pos === '助詞' && next.pos_detail_1 === '接続助詞' && ['て', 'で', 'ば'].includes(next.surface_form)) return true;
  return false;
}

function mergeWords(raw: KuromojiToken[]): KuromojiToken[][] {
  const groups: KuromojiToken[][] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    const group = [t];
    const isHead = t.pos === '動詞' || t.pos === '形容詞' || t.pos === '助動詞';
    if (isHead) {
      while (i + 1 < raw.length && absorbs(raw[i + 1], group[group.length - 1])) group.push(raw[++i]);
    } else if (t.pos === '名詞' && t.pos_detail_1 === '数') {
      while (i + 1 < raw.length && raw[i + 1].pos === '名詞' && raw[i + 1].pos_detail_1 === '数') group.push(raw[++i]);
    }
    groups.push(group);
  }
  return groups;
}

function conjugationOf(group: KuromojiToken[]): string[] | undefined {
  if (group.length < 2) return undefined;
  const labels: string[] = [];
  for (const t of group.slice(1)) {
    const label = AUX_LABEL[t.basic_form] ?? AUX_LABEL[t.surface_form];
    if (label && !labels.includes(label)) labels.push(label);
  }
  // ます + ん = polite negative; "た" after "で" (te-form of だ) etc. are fine as-is
  return labels.length ? labels : undefined;
}

/** Known IPADIC reading choices that differ from standard modern usage. */
const READING_FIXES: Record<string, string> = { 日本: 'にほん', 日本人: 'にほんじん', 日本語: 'にほんご' };

/* --------------------------------------------------------------- adapter */

export interface JaAnalyzeContext extends AnalyzeContext {
  /** per-sentence reading overrides: surface → hiragana reading */
  readingOverrides?: Record<string, string>;
}

export async function analyzeJapanese(text: string, ctx: JaAnalyzeContext = {}): Promise<JaAnalysis> {
  const [tokenizer, wordList, kanjiLevels] = await Promise.all([getTokenizer(), getWordList(), getKanjiLevels()]);
  const lexicon = ctx.lexicon ?? {};
  const raw = tokenizer.tokenize(text);
  const tokens: JaToken[] = [];

  for (const group of mergeWords(raw)) {
    const head = group[0];
    const surface = group.map((t) => t.surface_form).join('');
    const pos = mapPos(head);
    const isWord = pos !== 'symbol' && surface.trim() !== '';
    const lemma = head.basic_form && head.basic_form !== '*' ? head.basic_form : head.surface_form;
    const lex: LexEntry | undefined = lexicon[lemma];
    const listed = wordList[lemma];

    let reading: string | undefined = group.every((t) => t.reading && t.reading !== '*')
      ? toHiragana(group.map((t) => t.reading).join(''))
      : undefined;
    if (READING_FIXES[surface]) reading = READING_FIXES[surface];
    // Prefer the curated reading for uninflected words (kuromoji reads 日本 as にっぽん).
    if (lex?.reading && surface === lemma) reading = lex.reading;
    if (ctx.readingOverrides?.[surface]) reading = ctx.readingOverrides[surface];

    const token: JaToken = { surface, isWord, lemma, pos };
    if (isWord) {
      if (reading && reading !== toHiragana(surface)) token.reading = reading;
      if (hasKanji(surface) && reading) token.ruby = alignFurigana(surface, reading);
      const conj = conjugationOf(group);
      if (conj) token.conjugation = conj;
      if (group.length > 1) token.parts = group.map((t) => ({ surface: t.surface_form, lemma: t.basic_form }));
      if (lex) token.lexKey = lemma;
      const lexLevel = lex?.level?.framework === 'jlpt' ? (lex.level.level as JlptLevel) : undefined;
      if (lexLevel) Object.assign(token, { jlpt: lexLevel, jlptSource: 'lexicon' });
      else if (listed) Object.assign(token, { jlpt: JLPT_BY_NUM[listed[1]], jlptSource: 'wordlist' });
      else if (hasKanji(surface)) {
        const est = kanjiEstimate(surface, kanjiLevels);
        if (est) Object.assign(token, { jlpt: est, jlptSource: 'kanji' });
      }
    }
    tokens.push(token);
  }
  return { lang: 'ja', tokens };
}

/** Hiragana reading of a whole analysed sentence (used for dictation). */
export function sentenceReading(a: JaAnalysis): string {
  return a.tokens.map((t) => (t.isWord ? t.reading ?? toHiragana(t.surface) : '')).join('');
}

export const jaAdapter: LanguageAdapter<JaAnalysis> = {
  code: 'ja',
  framework: 'jlpt',
  accents: ['ja-tokyo'],
  defaultAccent: 'ja-tokyo',

  splitSentences: (text) => splitByTerminators(text, /[。！？!?]+[」』）)]*/g),
  isSentenceFinal: (text) => /[。！？!?][」』）)]*\s*$/.test(text.trim()),

  analyze: (text, ctx) => analyzeJapanese(text, ctx),

  normalizeForDictation: (text) =>
    toHiragana(text.normalize('NFKC')).replace(/[\s、。！？!?「」『』（）(),.・…〜ー-]/g, ''),
  dictationUnits: (text) => [...text],

  estimateDifficulty(analyses): ProficiencyRef | undefined {
    const levels = analyses.flatMap((a) =>
      a.tokens.filter((t) => t.isWord && t.jlpt && t.pos !== 'particle' && t.pos !== 'auxiliary').map((t) => JLPT_ORDER.indexOf(t.jlpt!)),
    );
    if (levels.length < 5) return undefined;
    levels.sort((x, y) => x - y);
    const p90 = levels[Math.floor(levels.length * 0.9)];
    return { framework: 'jlpt', level: JLPT_ORDER[p90], estimated: true };
  },

  async lookup(token) {
    const list = await getWordList();
    const hit = token.lemma ? list[token.lemma] : undefined;
    if (!hit) return undefined;
    return {
      lang: 'ja', lemma: token.lemma!, reading: hit[0], pos: token.pos,
      meanings: { en: hit[2] }, level: { framework: 'jlpt', level: JLPT_BY_NUM[hit[1]] }, source: 'jlpt-list',
    };
  },
};
