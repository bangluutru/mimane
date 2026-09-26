import type { Cue } from './parse';

/**
 * Subtitle cues ≠ sentences. Merge consecutive cues until the text ends a
 * sentence, so each Sentence Learning Unit is a speakable sentence.
 * Guards keep units shadowable (max duration) and respect long silences.
 */
export function mergeCuesIntoSentences(
  cues: Cue[],
  isSentenceFinal: (text: string) => boolean,
  opts: { maxDuration?: number; maxGap?: number; joiner?: string } = {},
): Cue[] {
  const { maxDuration = 12, maxGap = 1.5, joiner = ' ' } = opts;
  const out: Cue[] = [];
  let cur: Cue | undefined;
  for (const c of cues) {
    if (cur) {
      const gap = c.start - cur.end;
      const tooLong = c.end - cur.start > maxDuration;
      if (isSentenceFinal(cur.text) || gap > maxGap || tooLong) {
        out.push(cur);
        cur = undefined;
      }
    }
    if (!cur) cur = { ...c };
    else {
      cur.text = joinText(cur.text, c.text, joiner);
      cur.end = c.end;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function joinText(a: string, b: string, joiner: string) {
  // No space between CJK characters
  if (/[　-鿿＀-￯]$/.test(a) && /^[　-鿿＀-￯]/.test(b)) return a + b;
  return a + joiner + b;
}

/** Split plain-text cues into sentences (TXT/paste import without timings). */
export function splitUntimed(cues: Cue[], split: (text: string) => string[]): Cue[] {
  return cues.flatMap((c) => split(c.text).map((text) => ({ ...c, text })));
}

/**
 * Attach a translation track (a second subtitle file) to sentences by time
 * overlap: every translation cue goes to the sentence it overlaps most.
 */
export function alignTranslations(sentences: Cue[], translation: Cue[], lang: string): Cue[] {
  const buckets: string[][] = sentences.map(() => []);
  for (const t of translation) {
    let best = -1;
    let bestOverlap = 0;
    sentences.forEach((s, i) => {
      const o = Math.min(s.end, t.end) - Math.max(s.start, t.start);
      if (o > bestOverlap) {
        bestOverlap = o;
        best = i;
      }
    });
    if (best >= 0) buckets[best].push(t.text);
  }
  return sentences.map((s, i) =>
    buckets[i].length ? { ...s, translations: { ...s.translations, [lang]: buckets[i].join(' ') } } : s,
  );
}
