/**
 * Compile curated YouTube video lessons from original-language SRT files.
 *
 * Source metadata: content/video-lessons.json
 * Source captions: content/subtitles/*.srt
 * Output: public/lessons/*.json, public/lessons/catalog.json,
 *         public/subtitles/*.srt
 *
 * The video itself remains hosted by YouTube and is embedded by video ID.
 */
import { root } from './node-env';
import fs from 'node:fs';
import path from 'node:path';
import { getAdapter } from '../src/languages/registry';
import { normalizeLexicon, type Lexicon, type RawLexEntry } from '../src/domains/vocabulary/lexicon';
import { hasTimings, parseSrt } from '../src/domains/transcript/parse';
import { mergeCuesIntoSentences } from '../src/domains/transcript/segment';
import { CATEGORIES, type CategoryId } from '../src/domains/library/taxonomy';
import { sentenceId, toMeta, type Lesson, type LessonMeta } from '../src/domains/lesson/types';
import type { AnyToken, LexEntry, SentenceAnalysis, TargetLang } from '../src/languages/types';

interface VideoSource {
  id: string;
  targetLanguage: TargetLang;
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  subtitleFile: string;
  subtitleLanguage: string;
  subtitleType: 'manual' | 'auto';
  categories: CategoryId[];
  tags: string[];
}

const sourceFile = path.join(root, 'content/video-lessons.json');
const sources = JSON.parse(fs.readFileSync(sourceFile, 'utf8')) as VideoSource[];
const sourceSrtDir = path.join(root, 'content/subtitles');
const publicSrtDir = path.join(root, 'public/subtitles');
const publicLessonDir = path.join(root, 'public/lessons');
const catalogFile = path.join(publicLessonDir, 'catalog.json');
const managedAttribution = 'Video library (YouTube): ';
const categoryIds = new Set(CATEGORIES.map((c) => c.id));
const nonSpeechCue = /^[\[(（]\s*(?:music|applause|laughter?|laughing|cheering|clapping|sighing|sobbing|音楽|拍手|歓声|笑い(?:声)?)\s*[\])）]$/iu;
fs.mkdirSync(publicSrtDir, { recursive: true });
fs.mkdirSync(publicLessonDir, { recursive: true });

const lexicons = new Map<TargetLang, Lexicon>();
function lexiconFor(lang: TargetLang): Lexicon {
  if (!lexicons.has(lang)) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, `content/lexicon/${lang}.json`), 'utf8')) as Record<string, RawLexEntry>;
    lexicons.set(lang, normalizeLexicon(lang, raw));
  }
  return lexicons.get(lang)!;
}

function assertSource(video: VideoSource, ids: Set<string>) {
  if (!/^[a-z0-9-]+$/.test(video.id)) throw new Error(`Invalid lesson id: ${video.id}`);
  if (ids.has(video.id)) throw new Error(`Duplicate lesson id: ${video.id}`);
  ids.add(video.id);
  if (!/^[\w-]{11}$/.test(video.videoId)) throw new Error(`Invalid YouTube video id: ${video.videoId}`);
  if (!Number.isFinite(video.durationSec) || video.durationSec < 240) throw new Error(`${video.id} is under the 4-minute minimum`);
  if (!video.categories.length || video.categories.some((c) => !categoryIds.has(c))) throw new Error(`Invalid categories: ${video.id}`);
  if (video.subtitleLanguage !== video.targetLanguage) throw new Error(`Subtitle language does not match lesson language: ${video.id}`);
}

const existingCatalog = fs.existsSync(catalogFile)
  ? JSON.parse(fs.readFileSync(catalogFile, 'utf8')) as LessonMeta[]
  : [];
const catalog: Record<string, LessonMeta> = Object.fromEntries(
  existingCatalog
    .filter((m) => !(m.media.kind === 'youtube' && m.source.attribution?.startsWith(managedAttribution)))
    .map((m) => [m.id, m]),
);

const ids = new Set<string>();
const now = new Date().toISOString();
let totalSentences = 0;

for (const video of sources) {
  assertSource(video, ids);
  const srtPath = path.join(sourceSrtDir, video.subtitleFile);
  if (!fs.existsSync(srtPath)) throw new Error(`Missing SRT: ${srtPath}`);
  const rawSrt = fs.readFileSync(srtPath, 'utf8');
  const cues = parseSrt(rawSrt)
    .filter((cue) => cue.start < video.durationSec && cue.end > 0)
    .map((cue) => ({
      ...cue,
      start: Math.max(0, cue.start),
      end: Math.min(video.durationSec, cue.end),
    }))
    .filter((cue) => cue.end > cue.start);
  if (!hasTimings(cues) || !cues.length) throw new Error(`SRT has no usable timed cues: ${video.subtitleFile}`);

  // TED subtitle tracks include credits, and some tracks label non-speech audio.
  const spokenCues = cues.filter((c) =>
    !/^(?:translator|reviewer):/i.test(c.text.trim()) && !nonSpeechCue.test(c.text.trim()),
  );
  const adapter = getAdapter<SentenceAnalysis>(video.targetLanguage);
  const sentences = mergeCuesIntoSentences(spokenCues, adapter.isSentenceFinal, {
    maxDuration: 12,
    maxGap: 1.5,
    joiner: video.targetLanguage === 'ja' ? '' : ' ',
  });
  if (!sentences.length || sentences.some((s) => !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.end <= s.start)) {
    throw new Error(`Could not segment timed subtitles: ${video.subtitleFile}`);
  }

  const lexicon = lexiconFor(video.targetLanguage);
  const analyses: SentenceAnalysis[] = [];
  const glossary: Record<string, LexEntry> = {};
  for (const sentence of sentences) {
    const analysis = await adapter.analyze(sentence.text, { lexicon });
    analyses.push(analysis);
    for (const token of analysis.tokens as AnyToken[]) {
      for (const key of [token.lexKey, (token as { phraseKey?: string }).phraseKey]) {
        if (key && lexicon[key]) {
          const { forms: _forms, ...entry } = lexicon[key];
          glossary[key] = entry;
        }
      }
    }
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const lesson: Lesson = {
    id: video.id,
    schemaVersion: 1,
    origin: 'catalog',
    title: { original: video.title },
    targetLanguage: video.targetLanguage,
    supportLanguages: [],
    media: { kind: 'youtube', videoId: video.videoId },
    durationSec: video.durationSec,
    sentenceCount: sentences.length,
    categories: video.categories,
    tags: video.tags,
    difficulty: adapter.estimateDifficulty?.(analyses) ?? undefined,
    accent: adapter.defaultAccent,
    source: {
      kind: 'prepared',
      url: youtubeUrl,
      attribution: `${managedAttribution}${video.channel} · ${video.subtitleLanguage} ${video.subtitleType} captions`,
      transcript: 'provided',
    },
    author: video.channel,
    createdAt: now,
    updatedAt: now,
    sentences: sentences.map((cue, index) => ({
      id: sentenceId(video.id, index),
      index,
      start: cue.start,
      end: cue.end,
      text: cue.text,
      translations: {},
      analysis: analyses[index],
    })),
    glossary,
  };

  fs.writeFileSync(path.join(publicLessonDir, `${video.id}.json`), JSON.stringify(lesson));
  fs.copyFileSync(srtPath, path.join(publicSrtDir, video.subtitleFile));
  catalog[lesson.id] = toMeta(lesson);
  totalSentences += lesson.sentenceCount;
  console.log(`• ${video.id}: ${lesson.sentenceCount} timed sentences (${video.subtitleType} ${video.subtitleLanguage})`);
}

fs.writeFileSync(catalogFile, JSON.stringify(Object.values(catalog).sort((a, b) => a.id.localeCompare(b.id)), null, 1));
console.log(`✓ ${sources.length} video lessons, ${totalSentences} timed sentences, ${sources.length} SRT files → public/lessons and public/subtitles`);
