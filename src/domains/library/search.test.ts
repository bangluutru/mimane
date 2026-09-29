import { describe, expect, it } from 'vitest';
import type { LessonMeta } from '@/domains/lesson/types';
import { searchLessons } from './search';

const lesson = (id: string, title: Partial<LessonMeta['title']> & { original: string }, extra: Partial<LessonMeta> = {}) =>
  ({
    id,
    title,
    targetLanguage: 'vi',
    categories: [],
    tags: [],
    durationSec: 60,
    ...extra,
  }) as unknown as LessonMeta;

const LESSONS = [
  lesson('vi-duong', { original: 'Hỏi đường ở Hà Nội', en: 'Asking for directions in Hanoi' }),
  lesson('vi-tag', { original: 'Đi chợ' }, { tags: ['meetings'] }),
  lesson('ja-gakusei', { original: '学生の一日', ja: 'がくせいのいちにち' }, { targetLanguage: 'ja' }),
  lesson('ja-kakusei', { original: '覚醒', ja: 'かくせい' }, { targetLanguage: 'ja' }),
  lesson('en-meetings', { original: 'How to Run Better Meetings', vi: 'Cách tổ chức cuộc họp' }, { targetLanguage: 'en' }),
];

const ids = (text: string, lang?: LessonMeta['targetLanguage']) => searchLessons(LESSONS, { text, lang }).map((l) => l.id);

// So khớp là của @chotto/search. Mấy ca dưới là đúng những chỗ bản fold tự
// viết trước đây làm sai.
describe('searchLessons', () => {
  it('gõ không dấu khớp cả đ', () => {
    expect(ids('duong')).toEqual(['vi-duong']);
  });
  it('giữ dấu ゛ của kana: がくせい không khớp かくせい', () => {
    expect(ids('がくせい')).toEqual(['ja-gakusei']);
    expect(ids('かくせい')).toEqual(['ja-kakusei']);
  });
  it('chữ toàn khổ được coi như nửa khổ', () => {
    expect(ids('ＨＡＮＯＩ')).toEqual(['vi-duong']);
  });
  it('tìm theo tiêu đề ở mọi ngôn ngữ', () => {
    expect(ids('cuoc hop')).toEqual(['en-meetings']);
    expect(ids('directions')).toEqual(['vi-duong']);
  });
  it('bài khớp ở tiêu đề đứng trước bài chỉ khớp tag', () => {
    expect(ids('meetings')).toEqual(['en-meetings', 'vi-tag']);
  });
  it('bộ lọc có cấu trúc vẫn áp trước', () => {
    expect(ids('meetings', 'vi')).toEqual(['vi-tag']);
    expect(ids('', 'ja')).toEqual(['ja-gakusei', 'ja-kakusei']);
  });
});
