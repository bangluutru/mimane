import type { AnalyzeContext, EnAnalysis, EnToken, LanguageAdapter, LexEntry, ProficiencyRef } from '../types';
import { loadJson } from '../shared/data';
import { splitByTerminators } from '../shared/text';
import { arpabetToIpa, type Pronunciation } from './arpabet';

type IpaDict = Record<string, string>; // word → ARPAbet
const getIpaDict = () => loadJson<IpaDict>('data/en-cmu.json').catch(() => ({}) as IpaDict);

const TOKEN_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*|\d+(?:[.,]\d+)*%?|\s+|[^A-Za-z\d\s]+/g;
const MAX_PHRASE = 6;

/** Common irregular inflections (lexicon `forms` extend this per lesson). */
const IRREGULAR: Record<string, string> = {
  was: 'be', were: 'be', is: 'be', are: 'be', am: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', did: 'do', does: 'do', done: 'do', went: 'go', gone: 'go',
  made: 'make', took: 'take', taken: 'take', got: 'get', gotten: 'get', said: 'say',
  came: 'come', knew: 'know', known: 'know', thought: 'think', saw: 'see', seen: 'see',
  gave: 'give', given: 'give', found: 'find', told: 'tell', felt: 'feel', left: 'leave',
  kept: 'keep', began: 'begin', begun: 'begin', brought: 'bring', bought: 'buy',
  ran: 'run', slept: 'sleep', spent: 'spend', held: 'hold', met: 'meet', paid: 'pay',
  children: 'child', people: 'person', men: 'man', women: 'woman', better: 'good',
  best: 'good', worse: 'bad', worst: 'bad', ate: 'eat', eaten: 'eat', drank: 'drink',
  wrote: 'write', written: 'write', sent: 'send', built: 'build', stood: 'stand',
  doing: 'do', going: 'go', having: 'have', saying: 'say', dying: 'die', lying: 'lie',
  understood: 'understand', meant: 'mean', led: 'lead', lost: 'lose', woke: 'wake', woken: 'wake',
};

const WEAK_FORMS: Record<string, string> = {
  a: 'ə', an: 'ən', the: 'ðə', to: 'tə', of: 'əv', and: 'ən', for: 'fɚ', can: 'kən',
  are: 'ɚ', you: 'jə', your: 'jɚ', at: 'ət', from: 'frəm', have: 'həv', has: 'həz',
  was: 'wəz', were: 'wɚ', some: 'səm', them: 'ðəm', than: 'ðən', but: 'bət', or: 'ɚ',
  as: 'əz', do: 'də', does: 'dəz', would: 'wəd', could: 'kəd', should: 'ʃəd', just: 'dʒəst',
};

function lemmaCandidates(w: string): string[] {
  const c = [w];
  if (IRREGULAR[w]) c.push(IRREGULAR[w]);
  const add = (s: string) => s.length > 1 && c.push(s);
  if (w.endsWith("'s") || w.endsWith('’s')) add(w.slice(0, -2));
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  // stem + e first for C-V-C stems (making → make, using → use), else bare stem (doing → do)
  const cvc = (stem: string) => /(^|[^aeiou])[aeiou][^aeiouwxy]$/.test(stem);
  for (const suf of ['ed', 'ing']) {
    if (!w.endsWith(suf)) continue;
    const stem = w.slice(0, -suf.length);
    if (/(.)\1$/.test(stem)) add(stem.slice(0, -1)); // stopped → stop, running → run
    if (cvc(stem)) { add(stem + 'e'); add(stem); } else { add(stem); add(stem + 'e'); }
    if (suf === 'ed') add(w.slice(0, -1)); // used → use
  }
  if (w.endsWith('er')) add(w.slice(0, -2));
  if (w.endsWith('est')) add(w.slice(0, -3));
  if (w.endsWith('ly')) add(w.slice(0, -2));
  return c;
}

function lemmatize(w: string, lexicon: Record<string, LexEntry>, forms: Record<string, string>, dict: IpaDict): string {
  if (forms[w]) return forms[w];
  const cands = lemmaCandidates(w);
  return cands.find((x) => lexicon[x]) ?? (IRREGULAR[w] || cands.slice(1).find((x) => dict[x] && x.length > 1) || w);
}

export async function analyzeEnglish(text: string, ctx: AnalyzeContext = {}): Promise<EnAnalysis> {
  const dict = await getIpaDict();
  const lexicon = ctx.lexicon ?? {};
  const forms: Record<string, string> = {};
  for (const [key, e] of Object.entries(lexicon)) {
    for (const f of (e as LexEntry & { forms?: string[] }).forms ?? []) forms[f.toLowerCase()] = key;
  }

  const raw = text.match(TOKEN_RE) ?? [];
  const tokens: EnToken[] = raw.map((surface) => {
    const isWord = /[A-Za-z\d]/.test(surface);
    if (!isWord) return { surface, isWord };
    const lower = surface.toLowerCase().replace(/’/g, "'");
    const lemma = /^\d/.test(lower) ? lower : lemmatize(lower, lexicon, forms, dict);
    const t: EnToken = { surface, isWord, lemma };
    const lex = lexicon[lemma];
    if (lex) {
      t.lexKey = lemma;
      t.pos = lex.pos;
      if (lex.level?.framework === 'cefr') t.cefr = lex.level.level;
    }
    const arpa = dict[lower] ?? dict[lemma];
    if (arpa && dict[lower]) {
      const p = arpabetToIpa(arpa);
      Object.assign(t, { ipa: p.ipa, syllables: p.syllables, stressIndex: p.stressIndex });
    }
    return t;
  });

  markPhrases(tokens, lexicon);
  markConnectedSpeech(tokens, dict);
  return { lang: 'en', tokens };
}

/** Mark multi-word lexicon entries ("follow up", "stay on track"). */
function markPhrases(tokens: EnToken[], lexicon: Record<string, LexEntry>) {
  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i].isWord) continue;
    for (let n = MAX_PHRASE; n >= 2; n--) {
      const idx: number[] = [];
      let j = i;
      while (idx.length < n && j < tokens.length) {
        if (idx.length > 0) {
          if (!/^ $/.test(tokens[j]?.surface ?? '')) break;
          j++;
        }
        if (!tokens[j]?.isWord) break;
        idx.push(j++);
      }
      if (idx.length !== n) continue;
      const bySurface = idx.map((k) => tokens[k].surface.toLowerCase()).join(' ');
      const byLemma = idx.map((k) => tokens[k].lemma).join(' ');
      const mixed = [tokens[idx[0]].lemma, ...idx.slice(1).map((k) => tokens[k].surface.toLowerCase())].join(' ');
      const key = [bySurface, byLemma, mixed].find((k) => lexicon[k]);
      if (key) {
        for (const k of idx) {
          tokens[k].phraseStart = i;
          tokens[k].phraseKey = key;
        }
        i = idx[idx.length - 1];
        break;
      }
    }
  }
}

function pron(t: EnToken, dict: IpaDict): Pronunciation | undefined {
  const a = dict[t.surface.toLowerCase().replace(/’/g, "'")];
  return a ? arpabetToIpa(a) : undefined;
}

/** Deterministic connected-speech hints: consonant→vowel linking, weak forms. */
function markConnectedSpeech(tokens: EnToken[], dict: IpaDict) {
  const words = tokens.map((t, i) => ({ t, i })).filter((x) => x.t.isWord);
  words.forEach(({ t, i }, w) => {
    const next = words[w + 1];
    const lower = t.surface.toLowerCase();
    const between = next ? tokens.slice(i + 1, next.i).map((x) => x.surface).join('') : '';
    const adjacent = next && /^ $/.test(between);
    if (adjacent) {
      const a = pron(t, dict);
      const b = pron(next.t, dict);
      if (a && b && !a.vowelFlags[a.vowelFlags.length - 1] && b.vowelFlags[0] && a.phones[a.phones.length - 1] !== 'h') {
        t.linksToNext = true;
      }
    }
    // Function words are usually reduced unless they end a phrase / sentence.
    if (WEAK_FORMS[lower] && adjacent) {
      t.weakForm = lower === 'the' && next && pron(next.t, dict)?.vowelFlags[0] ? 'ði' : WEAK_FORMS[lower];
    }
  });
}

export const enAdapter: LanguageAdapter<EnAnalysis> = {
  code: 'en',
  framework: 'cefr',
  accents: ['en-us', 'en-gb'],
  defaultAccent: 'en-us',

  splitSentences: (text) => splitByTerminators(text, /(?<!\b(?:Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e))[.!?]+["”’)]*\s+/g),
  isSentenceFinal: (text) => /[.!?]["”’)]*\s*$/.test(text.trim()),

  analyze: (text, ctx) => analyzeEnglish(text, ctx),

  normalizeForDictation: (text) =>
    text.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim(),
  dictationUnits: (text) => text.split(' ').filter(Boolean),

  estimateDifficulty(analyses): ProficiencyRef | undefined {
    const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const lv = analyses.flatMap((a) => a.tokens.filter((t) => t.cefr).map((t) => order.indexOf(t.cefr!))).filter((x) => x >= 0);
    if (lv.length < 5) return undefined;
    lv.sort((x, y) => x - y);
    return { framework: 'cefr', level: order[lv[Math.floor(lv.length * 0.9)]], estimated: true };
  },

  async lookup(token) {
    const dict = await getIpaDict();
    const w = token.lemma ?? token.surface.toLowerCase();
    const arpa = dict[w];
    if (!arpa) return undefined;
    return { lang: 'en', lemma: w, ipa: arpabetToIpa(arpa).ipa, meanings: {}, source: 'cmu' };
  },
};
