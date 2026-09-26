import type { RubySegment } from '../types';
import { KANJI_RE, hasKanji, toHiragana } from './kana';

/**
 * Align a surface form with its hiragana reading into ruby segments,
 * so furigana sits only above kanji (okurigana stays bare):
 *   忙しかった / いそがしかった → [忙|いそが] [しかった]
 */
export function alignFurigana(surface: string, reading: string): RubySegment[] {
  if (!hasKanji(surface) || !reading) return [{ text: surface }];
  const hira = toHiragana(reading);

  // Split surface into alternating kanji / kana runs
  const runs: { text: string; kanji: boolean }[] = [];
  for (const ch of surface) {
    const k = KANJI_RE.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.kanji === k) last.text += ch;
    else runs.push({ text: ch, kanji: k });
  }

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = runs.map((r) => (r.kanji ? '(.+?)' : `(${escape(toHiragana(r.text))})`)).join('');
  const m = new RegExp(`^${pattern}$`).exec(hira);
  if (!m) return [{ text: surface, rt: hira }];

  return runs.map((r, i) => (r.kanji ? { text: r.text, rt: m[i + 1] } : { text: r.text }));
}
