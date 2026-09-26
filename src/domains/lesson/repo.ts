import { db, notify } from '@/domains/storage/db';
import { toMeta, type Lesson, type LessonMeta } from './types';

const base = import.meta.env.BASE_URL;
let catalogPromise: Promise<LessonMeta[]> | undefined;
const lessonCache = new Map<string, Promise<Lesson>>();

/** Prepared lessons (static, pre-analysed). */
export function getCatalog(): Promise<LessonMeta[]> {
  catalogPromise ??= fetch(`${base}lessons/catalog.json`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return catalogPromise;
}

/** Catalog + the learner's own imported lessons. */
export async function listLessons(): Promise<LessonMeta[]> {
  const [catalog, user] = await Promise.all([getCatalog(), (await db()).getAll('userLessons')]);
  return [...user.map(toMeta), ...catalog];
}

export function getLesson(id: string): Promise<Lesson> {
  let p = lessonCache.get(id);
  if (!p) {
    p = (async () => {
      const user = await (await db()).get('userLessons', id);
      if (user) return user;
      const res = await fetch(`${base}lessons/${encodeURIComponent(id)}.json`);
      if (!res.ok) throw new Error(`Lesson not found: ${id}`);
      return (await res.json()) as Lesson;
    })();
    p.catch(() => lessonCache.delete(id));
    lessonCache.set(id, p);
  }
  return p;
}

export async function saveUserLesson(lesson: Lesson) {
  await (await db()).put('userLessons', { ...lesson, updatedAt: new Date().toISOString() });
  lessonCache.delete(lesson.id);
  notify('lessons');
}

export async function deleteUserLesson(id: string) {
  const d = await db();
  const l = await d.get('userLessons', id);
  if (l?.media.kind === 'blob') await d.delete('blobs', l.media.blobId);
  await d.delete('userLessons', id);
  lessonCache.delete(id);
  notify('lessons');
}

export async function putBlob(id: string, blob: Blob, name?: string) {
  await (await db()).put('blobs', { id, blob, name });
}

export async function getBlob(id: string) {
  return (await (await db()).get('blobs', id))?.blob;
}

/** Resolve a playable URL for file-like media sources. Caller revokes blob URLs. */
export async function mediaUrl(lesson: Pick<Lesson, 'media'>): Promise<string | undefined> {
  const m = lesson.media;
  if (m.kind === 'file') return /^https?:/.test(m.url) ? m.url : base + m.url;
  if (m.kind === 'url') return m.url;
  if (m.kind === 'blob') {
    const b = await getBlob(m.blobId);
    return b ? URL.createObjectURL(b) : undefined;
  }
  return undefined;
}
