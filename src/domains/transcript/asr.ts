import type { TargetLang } from '@/languages/types';
import type { Cue } from './parse';

/**
 * Automatic transcription (ASR) boundary. Providers return Whisper-style
 * segments with word timestamps; sentence segmentation is deterministic and
 * shared, so every provider yields the same kind of Sentence Learning Units.
 */
export interface AsrWord {
  start: number;
  end: number;
  word: string; // may carry a leading space (Latin scripts)
  p?: number; // confidence 0..1
}

export interface AsrSegment {
  start: number;
  end: number;
  text: string;
  words: AsrWord[];
}

export interface TranscriptionResult {
  language: string;
  duration: number;
  model: string;
  segments: AsrSegment[];
}

export type AsrStage = 'queued' | 'downloading' | 'loading-model' | 'transcribing' | 'done';

export interface TranscribeInput {
  file?: Blob;
  youtubeUrl?: string;
  language?: TargetLang;
  quality: 'accurate' | 'fast';
}

export interface TranscriptionProvider {
  id: 'local-server' | 'browser';
  /** true when this provider can handle the input right now */
  supports(input: TranscribeInput): boolean;
  available(): Promise<boolean>;
  transcribe(input: TranscribeInput, onProgress: (p: number, stage: AsrStage) => void, signal?: AbortSignal): Promise<TranscriptionResult>;
}

const FINAL = /[.!?。！？…]["”’」』)）]*$/;

/**
 * Split recognised words into speakable sentences:
 *  - end of sentence punctuation
 *  - otherwise a clear pause (Whisper often omits Japanese punctuation)
 *  - never longer than `maxDuration` (split at the longest pause inside)
 */
export function wordsToCues(result: TranscriptionResult, opts: { maxDuration?: number; pause?: number } = {}): Cue[] {
  const { maxDuration = 12, pause = 0.7 } = opts;
  const words = result.segments.flatMap((s) =>
    // segment-level providers: treat each segment as one unit
    s.words.length ? s.words : [{ start: s.start, end: s.end, word: ` ${s.text}` }],
  );
  const groups: AsrWord[][] = [];
  let cur: AsrWord[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const gap = next ? next.start - w.end : Infinity;
    const text = w.word.trim();
    if (FINAL.test(text) || gap >= pause) {
      groups.push(cur);
      cur = [];
    }
  });
  if (cur.length) groups.push(cur);

  const out: AsrWord[][] = [];
  for (const g of groups) out.push(...splitLong(g, maxDuration));
  return out
    .map((g) => ({ start: g[0].start, end: g[g.length - 1].end, text: joinWords(g) }))
    .filter((c) => c.text);
}

function splitLong(g: AsrWord[], max: number): AsrWord[][] {
  if (g.length < 2 || g[g.length - 1].end - g[0].start <= max) return [g];
  // prefer a comma, else the longest pause
  let best = -1;
  let bestScore = -1;
  for (let i = 1; i < g.length - 1; i++) {
    const gap = g[i + 1].start - g[i].end;
    const comma = /[,，、;；:]$/.test(g[i].word.trim()) ? 1 : 0;
    const balance = 1 - Math.abs(i / g.length - 0.5); // avoid tiny fragments
    const score = comma * 2 + gap * 3 + balance;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [...splitLong(g.slice(0, best + 1), max), ...splitLong(g.slice(best + 1), max)];
}

const CJK = '\u3000-\u30ff\u3400-\u9fff\uff00-\uffef';
function joinWords(ws: AsrWord[]): string {
  return ws
    .map((w) => w.word)
    .join('')
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`([${CJK}]) (?=[${CJK}])`, 'g'), '$1') // no spaces inside Japanese
    .trim();
}

function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** Editable SRT the learner can review before creating the lesson. */
export function cuesToSrt(cues: Cue[]): string {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
}
