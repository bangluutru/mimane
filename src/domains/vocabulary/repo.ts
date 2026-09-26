import { db, notify } from '@/domains/storage/db';
import type { SavedWord } from './types';

export const wordId = (lang: string, lemma: string) => `${lang}:${lemma}`;

export async function getWord(id: string) {
  return (await db()).get('vocab', id);
}

export async function listWords(lang?: string) {
  const d = await db();
  const all = lang ? await d.getAllFromIndex('vocab', 'lang', lang) : await d.getAll('vocab');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveWord(w: Omit<SavedWord, 'createdAt' | 'contexts'> & { context?: SavedWord['contexts'][number] }) {
  const d = await db();
  const existing = await d.get('vocab', w.id);
  const { context, ...rest } = w;
  const contexts = existing?.contexts ?? [];
  if (context && !contexts.some((c) => c.sentenceId === context.sentenceId)) contexts.push(context);
  const word: SavedWord = { ...existing, ...rest, contexts, createdAt: existing?.createdAt ?? new Date().toISOString() };
  await d.put('vocab', word);
  notify('vocab');
  return word;
}

export async function removeWord(id: string) {
  await (await db()).delete('vocab', id);
  notify('vocab');
}
