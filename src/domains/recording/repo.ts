import { db, notify, uid } from '@/domains/storage/db';
import type { Recording } from './types';

export async function listRecordings(sentenceId: string) {
  const all = await (await db()).getAllFromIndex('recordings', 'sentenceId', sentenceId);
  return all.sort((a, b) => a.attempt - b.attempt);
}

export async function listAllRecordings() {
  const all = await (await db()).getAll('recordings');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addRecording(r: Omit<Recording, 'id' | 'attempt' | 'createdAt' | 'userId'>) {
  const existing = await listRecordings(r.sentenceId);
  const rec: Recording = {
    ...r,
    id: uid(),
    userId: 'local',
    attempt: (existing[existing.length - 1]?.attempt ?? 0) + 1,
    createdAt: new Date().toISOString(),
  };
  await (await db()).put('recordings', rec);
  notify('recordings');
  return rec;
}

export async function deleteRecording(id: string) {
  await (await db()).delete('recordings', id);
  notify('recordings');
}

export async function deleteAllRecordings() {
  await (await db()).clear('recordings');
  notify('recordings');
}
