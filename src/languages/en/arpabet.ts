/**
 * ARPAbet (CMU Pronouncing Dictionary) → IPA (General American), with primary
 * stress mark placed before the stressed syllable's onset.
 */

const VOWELS: Record<string, string> = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', ER: 'ɝ',
  EY: 'eɪ', IH: 'ɪ', IY: 'i', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
};
const CONSONANTS: Record<string, string> = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't',
  TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

/** Legal English onsets (for placing the stress mark at a syllable boundary). */
const ONSETS = new Set([
  'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'tʃ', 'dʒ', 'm', 'n', 'l', 'r', 'w', 'j',
  'pl', 'pr', 'bl', 'br', 'tr', 'dr', 'kl', 'kr', 'ɡl', 'ɡr', 'fl', 'fr', 'θr', 'ʃr', 'sp', 'st', 'sk', 'sm', 'sn',
  'sl', 'sw', 'kw', 'tw', 'dw', 'spl', 'spr', 'str', 'skr', 'skw', 'pj', 'bj', 'kj', 'fj', 'mj', 'hj', 'vj', 'nj',
]);

export interface Pronunciation {
  ipa: string;
  syllables: number;
  stressIndex: number; // -1 when no primary stress (e.g. function words)
  /** phones as IPA symbols, useful for linking analysis */
  phones: string[];
  vowelFlags: boolean[];
}

export function arpabetToIpa(arpabet: string): Pronunciation {
  const phonesRaw = arpabet.trim().split(/\s+/);
  const phones: string[] = [];
  const isVowel: boolean[] = [];
  const stress: number[] = [];
  for (const p of phonesRaw) {
    const m = /^([A-Z]+)([012])?$/.exec(p);
    if (!m) continue;
    const [, base, st] = m;
    if (VOWELS[base]) {
      let v = VOWELS[base];
      if (base === 'AH' && st === '0') v = 'ə';
      if (base === 'ER' && st === '0') v = 'ɚ';
      phones.push(v);
      isVowel.push(true);
      stress.push(Number(st ?? 0));
    } else {
      phones.push(CONSONANTS[base] ?? base.toLowerCase());
      isVowel.push(false);
      stress.push(-1);
    }
  }
  const vowelIdx = phones.map((_, i) => i).filter((i) => isVowel[i]);
  const syllables = vowelIdx.length;
  const primary = vowelIdx.findIndex((i) => stress[i] === 1);

  // Insert ˈ before the onset of the stressed syllable (maximal legal onset),
  // only for words with more than one syllable.
  let insertAt = -1;
  if (syllables > 1 && primary >= 0) {
    const v = vowelIdx[primary];
    const prevV = primary > 0 ? vowelIdx[primary - 1] : -1;
    insertAt = v;
    for (let start = prevV + 1; start < v; start++) {
      const cluster = phones.slice(start, v).join('');
      if (ONSETS.has(cluster)) {
        insertAt = start;
        break;
      }
    }
    if (primary === 0) insertAt = 0;
  }
  const ipa = phones.map((p, i) => (i === insertAt ? 'ˈ' : '') + p).join('');
  return { ipa, syllables, stressIndex: primary, phones, vowelFlags: isVowel };
}
