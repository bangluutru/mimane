import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Lesson } from '@/domains/lesson/types';
import type { LessonProgress, SentenceMark } from '@/domains/progress/types';
import type { Recording } from '@/domains/recording/types';
import type { SavedWord } from '@/domains/vocabulary/types';

/**
 * Local-first persistence. All access goes through domain repositories, so a
 * sync backend can be added later without touching features.
 */
interface MimaneDB extends DBSchema {
  lessonProgress: { key: string; value: LessonProgress };
  sentenceMarks: { key: string; value: SentenceMark; indexes: { lessonId: string } };
  recordings: { key: string; value: Recording; indexes: { sentenceId: string; lessonId: string } };
  vocab: { key: string; value: SavedWord; indexes: { lang: string } };
  userLessons: { key: string; value: Lesson };
  blobs: { key: string; value: { id: string; blob: Blob; name?: string } };
}

let dbp: Promise<IDBPDatabase<MimaneDB>> | undefined;

export function db() {
  dbp ??= openDB<MimaneDB>('mimane', 1, {
    upgrade(d) {
      d.createObjectStore('lessonProgress', { keyPath: 'lessonId' });
      const marks = d.createObjectStore('sentenceMarks', { keyPath: 'sentenceId' });
      marks.createIndex('lessonId', 'lessonId');
      const rec = d.createObjectStore('recordings', { keyPath: 'id' });
      rec.createIndex('sentenceId', 'sentenceId');
      rec.createIndex('lessonId', 'lessonId');
      const vocab = d.createObjectStore('vocab', { keyPath: 'id' });
      vocab.createIndex('lang', 'lang');
      d.createObjectStore('userLessons', { keyPath: 'id' });
      d.createObjectStore('blobs', { keyPath: 'id' });
    },
  });
  return dbp;
}

/* Tiny change bus so views re-query after writes. */
export type Topic = 'progress' | 'marks' | 'recordings' | 'vocab' | 'lessons';
const subs = new Map<Topic, Set<() => void>>();
export function notify(topic: Topic) {
  subs.get(topic)?.forEach((f) => f());
}
export function onChange(topics: Topic[], cb: () => void) {
  for (const t of topics) {
    if (!subs.has(t)) subs.set(t, new Set());
    subs.get(t)!.add(cb);
  }
  return () => topics.forEach((t) => subs.get(t)?.delete(cb));
}

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
