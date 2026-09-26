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

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Simple, forgiving search: every query word must appear somewhere. */
export function searchLessons(lessons: LessonMeta[], q: LessonQuery): LessonMeta[] {
  const words = q.text ? fold(q.text).split(/\s+/).filter(Boolean) : [];
  return lessons.filter((l) => {
    if (q.lang && l.targetLanguage !== q.lang) return false;
    if (q.level && l.difficulty?.level !== q.level) return false;
    if (q.category && !l.categories.includes(q.category)) return false;
    if (q.tag && !l.tags.includes(q.tag)) return false;
    if (q.duration && durationBucket(l.durationSec) !== q.duration) return false;
    if (q.accent && l.accent !== q.accent) return false;
    if (!words.length) return true;
    const hay = fold(
      [
        ...Object.values(l.title),
        ...Object.values(l.description ?? {}),
        ...l.tags,
        ...l.categories.flatMap((c) => Object.values(CATEGORY_BY_ID[c]?.label ?? {})),
        l.difficulty?.level ?? '',
      ].join(' '),
    );
    return words.every((w) => hay.includes(w));
  });
}
