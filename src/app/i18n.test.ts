import { describe, expect, it } from 'vitest';
import { makeT } from './i18n';

describe('makeT: số ít/số nhiều', () => {
  const en = makeT('en');
  it('1 lesson, 2 lessons, 0 lessons', () => {
    expect(en('library.results', { n: 1 })).toBe('1 lesson');
    expect(en('library.results', { n: 2 })).toBe('2 lessons');
    expect(en('library.results', { n: 0 })).toBe('0 lessons');
  });
  it('tiếng Việt, tiếng Nhật không đổi', () => {
    expect(makeT('vi')('library.results', { n: 1 })).toBe('1 bài');
    expect(makeT('ja')('library.results', { n: 1 })).toBe('1件');
  });
  it('không còn chuỗi tiếng Anh nào ghép "{n} <danh từ số nhiều>" cứng', async () => {
    const src = (await import('node:fs')).readFileSync('src/app/i18n.ts', 'utf8');
    const enBlock = src.slice(0, src.indexOf('const vi'));
    expect(enBlock.match(/\{n\} (lessons|sentences|lines|words|minutes)\b/g) ?? []).toEqual([]);
  });
});
