import { db, notify } from '@/domains/storage/db';
import type { StudyMode } from '@/domains/study/engine';
import type { LessonProgress, SentenceMark, Stats } from './types';

const nowIso = () => new Date().toISOString();

export async function getLessonProgress(lessonId: string) {
  return (await db()).get('lessonProgress', lessonId);
}

export async function listLessonProgress() {
  return (await db()).getAll('lessonProgress');
}

async function updateLesson(lessonId: string, fn: (p: LessonProgress) => void) {
  const d = await db();
  const tx = d.transaction('lessonProgress', 'readwrite');
  const p: LessonProgress = (await tx.store.get(lessonId)) ?? {
    lessonId, lastSentenceIndex: 0, practicedSentenceIds: [], completed: false,
    listenedMs: 0, shadowedMs: 0, startedAt: nowIso(), lastOpenedAt: nowIso(),
  };
  fn(p);
  await tx.store.put(p);
  await tx.done;
  notify('progress');
  return p;
}

export const touchLesson = (lessonId: string) => updateLesson(lessonId, (p) => (p.lastOpenedAt = nowIso()));
export const savePosition = (lessonId: string, index: number) =>
  updateLesson(lessonId, (p) => (p.lastSentenceIndex = index));

/** Mark practiced; completes the lesson when ≥ 80 % of sentences were practiced. */
export function markPracticed(lessonId: string, sentenceId: string, total: number) {
  return updateLesson(lessonId, (p) => {
    if (!p.practicedSentenceIds.includes(sentenceId)) p.practicedSentenceIds.push(sentenceId);
    if (!p.completed && total > 0 && p.practicedSentenceIds.length >= Math.ceil(total * 0.8)) {
      p.completed = true;
      p.completedAt = nowIso();
    }
  });
}

export const setCompleted = (lessonId: string, completed: boolean) =>
  updateLesson(lessonId, (p) => {
    p.completed = completed;
    p.completedAt = completed ? nowIso() : undefined;
  });

/* Play time is accumulated in memory and flushed periodically (cheap writes). */
const pending = new Map<string, { listened: number; shadowed: number }>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export function addPlayTime(lessonId: string, mode: StudyMode, ms: number) {
  const p = pending.get(lessonId) ?? { listened: 0, shadowed: 0 };
  if (mode === 'shadow' || mode === 'repeat') p.shadowed += ms;
  else p.listened += ms;
  pending.set(lessonId, p);
  flushTimer ??= setTimeout(flushPlayTime, 5000);
}

export async function flushPlayTime() {
  flushTimer = undefined;
  const entries = [...pending];
  pending.clear();
  for (const [lessonId, t] of entries) {
    await updateLesson(lessonId, (p) => {
      p.listenedMs += t.listened;
      p.shadowedMs += t.shadowed;
    });
  }
}

/* ------------------------------------------------------------- marks */

export async function getMarks(lessonId: string): Promise<Record<string, SentenceMark>> {
  const all = await (await db()).getAllFromIndex('sentenceMarks', 'lessonId', lessonId);
  return Object.fromEntries(all.map((m) => [m.sentenceId, m]));
}

export async function listMarks() {
  return (await db()).getAll('sentenceMarks');
}

export async function updateMark(lessonId: string, sentenceId: string, fn: (m: SentenceMark) => void) {
  const d = await db();
  const tx = d.transaction('sentenceMarks', 'readwrite');
  const m: SentenceMark = (await tx.store.get(sentenceId)) ?? {
    sentenceId, lessonId, favorite: false, difficult: false, plays: 0, repeats: 0, recordings: 0,
  };
  fn(m);
  await tx.store.put(m);
  await tx.done;
  notify('marks');
  return m;
}

export const toggleFavorite = (lessonId: string, sentenceId: string) =>
  updateMark(lessonId, sentenceId, (m) => (m.favorite = !m.favorite));
export const toggleDifficult = (lessonId: string, sentenceId: string) =>
  updateMark(lessonId, sentenceId, (m) => (m.difficult = !m.difficult));

export function countPractice(lessonId: string, sentenceId: string, kind: 'plays' | 'repeats' | 'recordings') {
  return updateMark(lessonId, sentenceId, (m) => {
    m[kind] += 1;
    m.lastPracticedAt = nowIso();
  });
}

export async function getStats(): Promise<Stats> {
  const d = await db();
  const [progress, words, recs] = await Promise.all([d.getAll('lessonProgress'), d.count('vocab'), d.count('recordings')]);
  return {
    minutesListened: Math.round(progress.reduce((n, p) => n + p.listenedMs, 0) / 60000),
    minutesShadowed: Math.round(progress.reduce((n, p) => n + p.shadowedMs, 0) / 60000),
    sentencesPracticed: progress.reduce((n, p) => n + p.practicedSentenceIds.length, 0),
    lessonsCompleted: progress.filter((p) => p.completed).length,
    wordsSaved: words,
    recordings: recs,
  };
}
