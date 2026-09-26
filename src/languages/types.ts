/**
 * Language layer contracts.
 *
 * Every target language gets its own analysis/token shape (discriminated by
 * `lang`) instead of one rigid linguistic schema. Core domains only depend on
 * `BaseToken` + `LanguageAdapter`; language-specific fields are read by that
 * language's UI module.
 */

export type TargetLang = 'ja' | 'en' | 'vi';
/** Languages we can show translations / UI in. Extensible (e.g. 'ko', 'zh'). */
export type SupportLang = 'vi' | 'en' | 'ja';

export type PartOfSpeech =
  | 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'particle'
  | 'conjunction' | 'auxiliary' | 'interjection' | 'determiner'
  | 'preposition' | 'numeral' | 'classifier' | 'phrase' | 'expression'
  | 'prefix' | 'suffix' | 'symbol' | 'other';

export type Localized = Partial<Record<SupportLang, string>>;

export interface ProficiencyRef {
  framework: FrameworkId;
  level: string;
  /** true when computed by an estimator rather than set by an author */
  estimated?: boolean;
}

export type FrameworkId = 'jlpt' | 'cefr' | 'vi-level';

export type AccentId = 'ja-tokyo' | 'en-us' | 'en-gb' | 'vi-north' | 'vi-central' | 'vi-south';

/** Dictionary knowledge about a lemma (shared by lessons + saved vocabulary). */
export interface LexEntry {
  lang: TargetLang;
  lemma: string;
  reading?: string;
  pos?: PartOfSpeech;
  meanings: Localized;
  level?: ProficiencyRef;
  ipa?: string;
  note?: Localized;
  regional?: Partial<Record<AccentId, string>>;
  source?: 'lesson' | 'jlpt-list' | 'cmu' | 'user';
}

/* ------------------------------------------------------------------ tokens */

export interface BaseToken {
  surface: string;
  /** false for whitespace / punctuation */
  isWord: boolean;
  lemma?: string;
  pos?: PartOfSpeech;
  /** key into the lesson glossary / shared lexicon */
  lexKey?: string;
}

export interface RubySegment {
  /** base text (kanji run or kana) */
  text: string;
  /** reading in hiragana when `text` contains kanji */
  rt?: string;
}

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface JaToken extends BaseToken {
  reading?: string; // hiragana reading of the surface
  ruby?: RubySegment[];
  conjugation?: string[]; // e.g. ['past'], ['polite', 'negative']
  jlpt?: JlptLevel;
  jlptSource?: 'lexicon' | 'wordlist' | 'kanji';
  /** morphemes merged into this word, e.g. 忙しかっ + た */
  parts?: { surface: string; lemma: string }[];
}

export interface EnToken extends BaseToken {
  ipa?: string; // without slashes, with ˈ primary stress
  syllables?: number;
  stressIndex?: number; // 0-based syllable carrying primary stress
  cefr?: string;
  /** index of the first token of a lexicon phrase this token belongs to */
  phraseStart?: number;
  phraseKey?: string;
  linksToNext?: boolean; // consonant → vowel linking across the boundary
  weakForm?: string; // e.g. "to" → "tə"
}

export type ViToneId = 'ngang' | 'huyen' | 'sac' | 'hoi' | 'nga' | 'nang';

export interface ViSyllable {
  text: string;
  initial: string; // '' when none
  medial: string; // 'o' | 'u' | ''  (âm đệm)
  nucleus: string; // vowel with quality marks, without tone mark
  final: string; // '' when none
  tone: ViToneId;
}

export interface ViToken extends BaseToken {
  syllables?: ViSyllable[];
}

export interface JaAnalysis { lang: 'ja'; tokens: JaToken[] }
export interface EnAnalysis { lang: 'en'; tokens: EnToken[] }
export interface ViAnalysis { lang: 'vi'; tokens: ViToken[] }
export type SentenceAnalysis = JaAnalysis | EnAnalysis | ViAnalysis;
export type AnyToken = JaToken | EnToken | ViToken;

/* ----------------------------------------------------------------- adapter */

export interface AnalyzeContext {
  /** curated lexicon available for this lesson (keys are adapter lookup keys) */
  lexicon?: Record<string, LexEntry>;
}

export interface LanguageAdapter<A extends SentenceAnalysis = SentenceAnalysis> {
  code: TargetLang;
  framework: FrameworkId;
  accents: AccentId[];
  defaultAccent: AccentId;
  /** Split free text (TXT / paste import) into sentences. */
  splitSentences(text: string): string[];
  /** Punctuation that ends a sentence — used to merge subtitle cues. */
  isSentenceFinal(text: string): boolean;
  /** Deterministic analysis. May lazy-load data (tokenizer, dictionaries). */
  analyze(text: string, ctx?: AnalyzeContext): Promise<A>;
  /** Normalise text before comparing dictation answers. */
  normalizeForDictation(text: string): string;
  /** Split into comparison units for dictation diff (chars for ja, words otherwise). */
  dictationUnits(text: string): string[];
  /** Optional deterministic difficulty estimate from analysed sentences. */
  estimateDifficulty?(analyses: A[]): ProficiencyRef | undefined;
  /** Look up a lexicon entry outside the lesson glossary (lazy data). */
  lookup?(token: BaseToken): Promise<LexEntry | undefined>;
}
