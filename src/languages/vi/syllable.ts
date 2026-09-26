import type { ViSyllable, ViToneId } from '../types';

/**
 * Deterministic Vietnamese syllable parser (orthographic analysis):
 *   syllable = initial + (medial) + nucleus + (final) + tone
 * Works on written form; phonetic realisation varies by region and is handled
 * in `regional.ts`, never here.
 */

const TONE_MARKS: Record<string, ViToneId> = {
  '̀': 'huyen', // à
  '́': 'sac', // á
  '̉': 'hoi', // ả
  '̃': 'nga', // ã
  '̣': 'nang', // ạ
};

const INITIALS = [
  'ngh', 'ng', 'nh', 'ch', 'tr', 'th', 'ph', 'kh', 'gh', 'gi', 'qu',
  'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x',
];
const FINAL_CONSONANTS = ['ng', 'nh', 'ch', 'c', 'm', 'n', 'p', 't'];
const SEMIVOWEL_FINALS = new Set(['i', 'y', 'o', 'u']);
const VOWELS = new Set([...'aăâeêioôơuưy']);

export const TONE_ORDER: ViToneId[] = ['ngang', 'huyen', 'sac', 'hoi', 'nga', 'nang'];

const TONE_MARK_OF: Record<ViToneId, string> = {
  ngang: '', huyen: '̀', sac: '́', hoi: '̉', nga: '̃', nang: '̣',
};

/** Split a syllable into toneless (NFC) letters and its tone. */
export function stripTone(syllable: string): { base: string; tone: ViToneId } {
  let tone: ViToneId = 'ngang';
  let base = '';
  for (const ch of syllable.normalize('NFD')) {
    const t = TONE_MARKS[ch];
    if (t) tone = t;
    else base += ch;
  }
  return { base: base.normalize('NFC'), tone };
}

export function isVietnameseSyllable(word: string): boolean {
  return parseSyllable(word) !== null;
}

export function parseSyllable(input: string): ViSyllable | null {
  const text = input.normalize('NFC');
  const { base: raw, tone } = stripTone(text.toLowerCase());
  if (!raw || !/^[a-zđăâêôơư]+$/.test(raw)) return null;

  // 1. initial consonant (longest match)
  let initial = '';
  for (const ini of INITIALS) {
    if (raw.startsWith(ini)) {
      initial = ini;
      break;
    }
  }
  let rest = raw.slice(initial.length);

  // "gi" before a consonant / end: the i is the nucleus (gì, gìn)
  if (initial === 'gi' && (rest === '' || !VOWELS.has(rest[0]))) rest = 'i' + rest;
  // "g" + "i..." is caught above as "gi"; "qu" keeps the u inside the initial.
  if (!rest || !VOWELS.has(rest[0])) {
    // no vowel → not a syllable (e.g. abbreviations)
    return null;
  }

  // 2. final: consonant, else semivowel
  let final = '';
  for (const f of FINAL_CONSONANTS) {
    if (rest.endsWith(f) && rest.length > f.length) {
      final = f;
      break;
    }
  }
  let vowels = final ? rest.slice(0, -final.length) : rest;
  if (!final && vowels.length > 1) {
    const last = vowels[vowels.length - 1];
    const isUy = vowels === 'uy'; // medial u + nucleus y (huy, thúy)
    const isOo = vowels === 'oo'; // xoong, boong
    if (SEMIVOWEL_FINALS.has(last) && !isUy && !isOo) {
      final = last;
      vowels = vowels.slice(0, -1);
    }
  }
  if ([...vowels].some((c) => !VOWELS.has(c))) return null;

  // 3. medial (âm đệm)
  let medial = '';
  if (initial !== 'qu' && vowels.length > 1) {
    const [v0, v1] = [vowels[0], vowels.slice(1)];
    if (v0 === 'o' && /^[aăe]/.test(v1)) medial = 'o';
    else if (v0 === 'u' && /^(â|ê|y|ơ)/.test(v1)) medial = 'u';
  }
  const nucleus = vowels.slice(medial.length);
  if (!nucleus) return null;

  return { text, initial, medial, nucleus, final, tone };
}

/** Rebuild a syllable string with a different tone (used by tone drills later). */
export function withTone(syllable: string, tone: ViToneId): string {
  const { base } = stripTone(syllable);
  const p = parseSyllable(base);
  if (!p) return syllable;
  const mark = TONE_MARK_OF[tone];
  if (!mark) return base;
  // Tone placement (modern style): on the vowel with a quality mark, else
  // second vowel of a nucleus cluster when there is a final, else first.
  const chars = [...base];
  const start = p.initial.length + (p.initial === 'gi' && base[2] && !VOWELS.has(base[2]) ? -1 : 0);
  const vowelIdx: number[] = [];
  for (let i = Math.max(0, start); i < chars.length; i++) if (VOWELS.has(chars[i].toLowerCase())) vowelIdx.push(i);
  let target = vowelIdx.find((i) => /[ăâêôơư]/i.test(chars[i]));
  if (target === undefined) {
    const nuc = vowelIdx.slice(p.medial ? 1 : 0);
    const nucVowelsOnly = nuc.filter((i) => i < chars.length - p.final.length || !SEMIVOWEL_FINALS.has(p.final));
    target = p.final && nucVowelsOnly.length > 1 ? nucVowelsOnly[1] : nucVowelsOnly[0] ?? vowelIdx[0];
  }
  chars[target] = (chars[target] + mark).normalize('NFC');
  return chars.join('');
}

/** Syllables ending in p/t/c/ch can only carry sắc or nặng (checked syllables). */
export function isCheckedSyllable(s: ViSyllable): boolean {
  return ['p', 't', 'c', 'ch'].includes(s.final);
}
