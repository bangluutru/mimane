export const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
export const KANA_RE = /[ぁ-ゖァ-ヺー]/;

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function hasKanji(s: string): boolean {
  return KANJI_RE.test(s);
}

export function isJapaneseText(s: string): boolean {
  return /[぀-ヿ]/.test(s) || (KANJI_RE.test(s) && !/[a-zA-Z]{3,}/.test(s));
}
