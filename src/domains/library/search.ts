import { rankItems, type RankOptions } from '@chotto/search';
import type { LessonMeta } from '@/domains/lesson/types';
import type { AccentId, TargetLang } from '@/languages/types';
import { CATEGORY_BY_ID, type CategoryId } from './taxonomy';

export type DurationBucket = 'short' | 'medium' | 'deep';
export const durationBucket = (sec: number): DurationBucket => (sec < 180 ? 'short' : sec < 600 ? 'medium' : 'deep');

export interface LessonQuery {
  text?: string;
  lang?: TargetLang;
  level?: string;
  category?: CategoryId;
  tag?: string;
  duration?: DurationBucket;
  accent?: AccentId;
}

/**
 * So khớp chữ là của @chotto/search, dùng chung với mọi site Chotto. Bản fold
 * tự viết trước đây quên đ→d ("duong" không khớp "Đường"), bỏ luôn dấu ゛ của
 * kana (がくせい thành かくせい, khớp nhầm) và không chuẩn hoá NFKC.
 *
 * Tiêu đề (mọi ngôn ngữ) là trường ưu tiên: bài khớp ở tiêu đề đứng trước bài
 * chỉ khớp ở mô tả, tag, chủ đề hay trình độ. Cùng hạng thì giữ thứ tự gốc.
 */
const TEXT_FIELDS: RankOptions<LessonMeta>['fields'] = [
  (l) => Object.values(l.title),
  (l) => [
    ...Object.values(l.description ?? {}),
    ...l.tags,
    ...l.categories.flatMap((c) => Object.values(CATEGORY_BY_ID[c]?.label ?? {})),
    l.difficulty?.level ?? '',
  ],
];

/** Lọc theo các bộ lọc có cấu trúc, rồi theo chữ nếu có. */
export function searchLessons(lessons: LessonMeta[], q: LessonQuery): LessonMeta[] {
  const filtered = lessons.filter((l) => {
    if (q.lang && l.targetLanguage !== q.lang) return false;
    if (q.level && l.difficulty?.level !== q.level) return false;
    if (q.category && !l.categories.includes(q.category)) return false;
    if (q.tag && !l.tags.includes(q.tag)) return false;
    if (q.duration && durationBucket(l.durationSec) !== q.duration) return false;
    if (q.accent && l.accent !== q.accent) return false;
    return true;
  });
  return q.text?.trim() ? rankItems(filtered, q.text, { fields: TEXT_FIELDS }) : filtered;
}
