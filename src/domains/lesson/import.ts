import type { AccentId, ProficiencyRef, SentenceAnalysis, SupportLang, TargetLang } from '@/languages/types';
import { getAdapter } from '@/languages/registry';
import type { CategoryId } from '@/domains/library/taxonomy';
import { hasTimings, parseTranscript, type Cue } from '@/domains/transcript/parse';
import { alignTranslations, mergeCuesIntoSentences, splitUntimed } from '@/domains/transcript/segment';
import { uid } from '@/domains/storage/db';
import { sentenceId, type Lesson, type MediaSource } from './types';

export interface ImportInput {
  title: string;
  targetLanguage: TargetLang;
  media: MediaSource;
  mediaDuration?: number;
  transcript: { text: string; fileName?: string };
  translation?: { text: string; fileName?: string; lang: SupportLang };
  mergeSentences: boolean;
  categories: CategoryId[];
  tags: string[];
  difficulty?: ProficiencyRef;
  accent?: AccentId;
  sourceUrl?: string;
  /** set when the transcript was produced by automatic speech recognition */
  transcriber?: string;
}

/** Parse → segment → align translations → analyse (deterministic, on-device). */
export async function buildImportedLesson(input: ImportInput, onProgress?: (done: number, total: number) => void): Promise<Lesson> {
  const adapter = getAdapter(input.targetLanguage);
  let cues: Cue[] = parseTranscript(input.transcript.text, input.transcript.fileName?.endsWith('.json') ? 'json' : undefined);
  const timed = hasTimings(cues);
  if (timed) {
    if (input.mergeSentences) {
      cues = mergeCuesIntoSentences(cues, adapter.isSentenceFinal, { joiner: input.targetLanguage === 'ja' ? '' : ' ' });
    }
    if (input.translation?.text) {
      const tr = parseTranscript(input.translation.text);
      if (hasTimings(tr)) cues = alignTranslations(cues, tr, input.translation.lang);
    }
  } else {
    cues = splitUntimed(cues, adapter.splitSentences);
  }
  if (!cues.length) throw new Error('empty-transcript');

  const id = `u-${uid().slice(0, 8)}`;
  const analyses: SentenceAnalysis[] = [];
  for (let i = 0; i < cues.length; i++) {
    analyses.push(await adapter.analyze(cues[i].text));
    onProgress?.(i + 1, cues.length);
    if (i % 10 === 9) await new Promise((r) => setTimeout(r)); // keep the UI responsive
  }
  const supportLanguages = [...new Set(cues.flatMap((c) => Object.keys(c.translations ?? {})))] as SupportLang[];
  const now = new Date().toISOString();
  const last = cues[cues.length - 1];
  return {
    id,
    schemaVersion: 1,
    origin: 'user',
    title: { original: input.title.trim() || cues[0].text.slice(0, 40) },
    targetLanguage: input.targetLanguage,
    supportLanguages,
    media: input.media,
    durationSec: input.mediaDuration ?? (timed ? last.end : 0),
    sentenceCount: cues.length,
    categories: input.categories.length ? input.categories : ['other'],
    tags: input.tags,
    difficulty: input.difficulty ?? adapter.estimateDifficulty?.(analyses as never),
    accent: input.accent ?? adapter.defaultAccent,
    source: {
      kind: 'user-import',
      url: input.sourceUrl,
      transcript: input.transcriber ? 'auto' : 'provided',
      transcriber: input.transcriber,
    },
    createdAt: now,
    updatedAt: now,
    sentences: cues.map((c, i) => ({
      id: sentenceId(id, i),
      index: i,
      start: timed ? c.start : 0,
      end: timed ? c.end : 0,
      text: c.text,
      translations: c.translations ?? {},
      analysis: analyses[i],
    })),
    glossary: {},
    needsSync: !timed,
  };
}
