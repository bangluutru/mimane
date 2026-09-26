import { describe, expect, it } from 'vitest';
import { parseSyllable, withTone } from './vi/syllable';
import { segmentVietnamese } from './vi/adapter';
import { alignFurigana } from './ja/furigana';
import { arpabetToIpa } from './en/arpabet';
import { showFurigana } from './ui/ja';

describe('Vietnamese syllables', () => {
  const cases: [string, string][] = [
    ['nguyễn', 'ng|u|yê|n|nga'], ['giữ', 'gi||ư||nga'], ['gì', 'gi||i||huyen'], ['quốc', 'qu||ô|c|sac'],
    ['thuyền', 'th|u|yê|n|huyen'], ['khuỷu', 'kh|u|y|u|hoi'], ['người', 'ng||ươ|i|huyen'], ['hoa', 'h|o|a||ngang'],
    ['của', 'c||ua||hoi'], ['xoong', 'x||oo|ng|ngang'], ['ơn', '||ơ|n|ngang'], ['bạn', 'b||a|n|nang'],
  ];
  it.each(cases)('%s → %s', (w, expected) => {
    const s = parseSyllable(w)!;
    expect([s.initial, s.medial, s.nucleus, s.final, s.tone].join('|')).toBe(expected);
  });
  it('rejects non-syllables', () => {
    expect(parseSyllable('xyz')).toBeNull();
    expect(parseSyllable('TP')).toBeNull();
  });
  it('re-applies tones', () => {
    expect(withTone('ma', 'nga')).toBe('mã');
    expect(withTone('hoa', 'sac')).toBe('hoá');
    expect(withTone('người', 'ngang')).toBe('ngươi');
  });
  it('segments compounds greedily from the lexicon', () => {
    const toks = segmentVietnamese('Cảm ơn bạn rất nhiều!', { 'cảm ơn': 1, 'rất nhiều': 1 }).filter((t) => t.isWord);
    expect(toks.map((t) => t.surface)).toEqual(['Cảm ơn', 'bạn', 'rất nhiều']);
    expect(toks[0].syllables?.map((s) => s.tone)).toEqual(['hoi', 'ngang']);
  });
});

describe('Japanese furigana', () => {
  it('aligns okurigana', () => {
    expect(alignFurigana('忙しかった', 'いそがしかった')).toEqual([{ text: '忙', rt: 'いそが' }, { text: 'しかった' }]);
    expect(alignFurigana('お茶', 'オチャ')).toEqual([{ text: 'お' }, { text: '茶', rt: 'ちゃ' }]);
    expect(alignFurigana('日本', 'にほん')).toEqual([{ text: '日本', rt: 'にほん' }]);
  });
  it('filters by JLPT threshold', () => {
    const t = { surface: '波長', isWord: true, jlpt: 'N2' as const };
    expect(showFurigana(t, 'N3')).toBe(true);
    expect(showFurigana(t, 'N2')).toBe(true);
    expect(showFurigana(t, 'rare')).toBe(false);
    expect(showFurigana({ ...t, jlpt: 'N5' }, 'N4')).toBe(false);
    expect(showFurigana({ ...t, jlpt: undefined }, 'N3')).toBe(true);
    expect(showFurigana(t, 'off')).toBe(false);
  });
});

describe('English IPA', () => {
  it('converts ARPAbet with stress at the syllable onset', () => {
    expect(arpabetToIpa('AH0 CH IY1 V M AH0 N T').ipa).toBe('əˈtʃivmənt');
    expect(arpabetToIpa('IH2 N T ER0 N AE1 SH AH0 N AH0 L').ipa).toBe('ɪntɚˈnæʃənəl');
    expect(arpabetToIpa('K AE1 T').ipa).toBe('kæt');
  });
});
