/**
 * Compile prepared lessons: content/lessons/*.json → public/lessons/*.json
 *
 *  1. synthesise demo audio per sentence with macOS `say` (cached by hash),
 *     trim silence, concatenate with gaps → public/media/<id>.mp3
 *  2. sentence timestamps come from the measured clip durations (exact sync)
 *  3. run the deterministic language adapter on every sentence and embed the
 *     analysis + a glossary of the words used → the app only renders.
 *
 * Usage: npm run lessons:build [-- <lesson-id> ...]
 */
import { root } from './node-env';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { getAdapter } from '../src/languages/registry';
import { normalizeLexicon, type Lexicon, type RawLexEntry } from '../src/domains/vocabulary/lexicon';
import { sentenceId, toMeta, type Lesson, type LessonMeta, type Sentence } from '../src/domains/lesson/types';
import type { AnyToken, LexEntry, Localized, SupportLang, TargetLang } from '../src/languages/types';
import type { CategoryId } from '../src/domains/library/taxonomy';

interface SourceLesson {
  id: string;
  targetLanguage: TargetLang;
  title: Localized & { original: string };
  description?: Localized;
  categories: CategoryId[];
  tags: string[];
  difficulty: { framework: 'jlpt' | 'cefr' | 'vi-level'; level: string };
  accent: Lesson['accent'];
  voice: string;
  rate?: number;
  sentences: { text: string; translations: Localized; note?: Localized; readings?: Record<string, string> }[];
}

const LEAD_IN = 0.4;
const GAP = 0.6;
const ttsCache = path.join(root, '.cache/tts');
fs.mkdirSync(ttsCache, { recursive: true });
fs.mkdirSync(path.join(root, 'public/lessons'), { recursive: true });
fs.mkdirSync(path.join(root, 'public/media'), { recursive: true });

function run(cmd: string, args: string[]) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function duration(file: string): number {
  return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
}

/** TTS one sentence → trimmed 24 kHz mono WAV; cached by (voice, rate, text). */
function synth(text: string, voice: string, rate?: number): string {
  const hash = crypto.createHash('sha1').update(`${voice}|${rate ?? ''}|${text}`).digest('hex').slice(0, 16);
  const wav = path.join(ttsCache, `${hash}.wav`);
  if (fs.existsSync(wav)) return wav;
  const aiff = path.join(ttsCache, `${hash}.aiff`);
  run('say', ['-v', voice, ...(rate ? ['-r', String(rate)] : []), '-o', aiff, text]);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03';
  run('ffmpeg', ['-y', '-v', 'error', '-i', aiff, '-af', `${trim},areverse,${trim},areverse`, '-ar', '24000', '-ac', '1', wav]);
  fs.unlinkSync(aiff);
  return wav;
}

function silence(sec: number): string {
  const f = path.join(ttsCache, `silence-${sec}.wav`);
  if (!fs.existsSync(f)) run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`, '-t', String(sec), f]);
  return f;
}

const lexicons = new Map<TargetLang, Lexicon>();
function lexiconFor(lang: TargetLang): Lexicon {
  if (!lexicons.has(lang)) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, `content/lexicon/${lang}.json`), 'utf8')) as Record<string, RawLexEntry>;
    lexicons.set(lang, normalizeLexicon(lang, raw));
  }
  return lexicons.get(lang)!;
}

async function build(file: string): Promise<LessonMeta> {
  const src = JSON.parse(fs.readFileSync(file, 'utf8')) as SourceLesson;
  const adapter = getAdapter(src.targetLanguage);
  const lexicon = lexiconFor(src.targetLanguage);
  console.log(`• ${src.id} (${src.sentences.length} sentences, ${src.voice})`);

  // 1–2. audio + timings
  const parts: string[] = [silence(LEAD_IN)];
  let t = LEAD_IN;
  const timings: { start: number; end: number }[] = [];
  src.sentences.forEach((s, i) => {
    const wav = synth(s.text, src.voice, src.rate);
    const d = duration(wav);
    timings.push({ start: +t.toFixed(3), end: +(t + d).toFixed(3) });
    t += d;
    parts.push(wav);
    if (i < src.sentences.length - 1) {
      parts.push(silence(GAP));
      t += GAP;
    }
  });
  parts.push(silence(0.8));
  t += 0.8;
  const listFile = path.join(ttsCache, `${src.id}.txt`);
  fs.writeFileSync(listFile, parts.map((p) => `file '${p}'`).join('\n'));
  const mp3 = path.join(root, `public/media/${src.id}.mp3`);
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'libmp3lame', '-b:a', '64k', mp3]);

  // 3. analysis + glossary
  const glossary: Record<string, LexEntry> = {};
  const missing = new Set<string>();
  const sentences: Sentence[] = [];
  for (const [i, s] of src.sentences.entries()) {
    const analysis = await adapter.analyze(s.text, { lexicon, readingOverrides: s.readings } as never);
    for (const tok of analysis.tokens as AnyToken[]) {
      for (const key of [tok.lexKey, (tok as { phraseKey?: string }).phraseKey]) {
        if (key && lexicon[key]) {
          const { forms: _f, ...entry } = lexicon[key];
          glossary[key] = entry;
        }
      }
      if (tok.isWord && !tok.lexKey && !['particle', 'auxiliary', 'symbol'].includes(tok.pos ?? '')) missing.add(tok.surface);
    }
    sentences.push({
      id: sentenceId(src.id, i),
      index: i,
      ...timings[i],
      text: s.text,
      translations: s.translations,
      analysis,
      ...(s.note ? { note: s.note } : {}),
    });
  }
  if (missing.size) console.log(`  (no glossary entry: ${[...missing].slice(0, 20).join(', ')}${missing.size > 20 ? '…' : ''})`);

  const now = new Date().toISOString();
  const supportLanguages = (['vi', 'en', 'ja'] as SupportLang[]).filter(
    (l) => l !== src.targetLanguage && src.sentences.every((s) => s.translations[l]),
  );
  const lesson: Lesson = {
    id: src.id,
    schemaVersion: 1,
    origin: 'catalog',
    title: src.title,
    description: src.description,
    targetLanguage: src.targetLanguage,
    supportLanguages,
    media: { kind: 'file', mediaType: 'audio', url: `media/${src.id}.mp3` },
    durationSec: +t.toFixed(2),
    sentenceCount: sentences.length,
    categories: src.categories,
    tags: src.tags,
    difficulty: src.difficulty,
    accent: src.accent,
    speakers: [src.voice],
    source: {
      kind: 'prepared',
      synthetic: true,
      attribution: `Mimane demo lesson · synthesized voice (${src.voice})`,
      license: 'CC BY 4.0',
    },
    author: 'Mimane',
    createdAt: now,
    updatedAt: now,
    sentences,
    glossary,
  };
  fs.writeFileSync(path.join(root, `public/lessons/${src.id}.json`), JSON.stringify(lesson));
  return toMeta(lesson);
}

const only = process.argv.slice(2);
const dir = path.join(root, 'content/lessons');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!only.length || only.includes(f.replace('.json', ''))));
const catalogFile = path.join(root, 'public/lessons/catalog.json');
const catalog: Record<string, LessonMeta> = only.length && fs.existsSync(catalogFile)
  ? Object.fromEntries((JSON.parse(fs.readFileSync(catalogFile, 'utf8')) as LessonMeta[]).map((m) => [m.id, m]))
  : {};
for (const f of files) {
  const meta = await build(path.join(dir, f));
  catalog[meta.id] = meta;
}
fs.writeFileSync(catalogFile, JSON.stringify(Object.values(catalog).sort((a, b) => a.id.localeCompare(b.id)), null, 1));
console.log(`✓ ${files.length} lessons → public/lessons (catalog: ${Object.keys(catalog).length})`);
