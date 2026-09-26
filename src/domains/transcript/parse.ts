/**
 * Subtitle / transcript parsing. Deterministic, no network.
 * Supported: SRT, WebVTT, TXT (plain lines, or LRC-style "[mm:ss.xx] text"),
 * internal JSON (array of cues or { sentences: [...] }).
 */
export interface Cue {
  start: number; // seconds; NaN when unknown (plain text)
  end: number;
  text: string;
  translations?: Record<string, string>;
}

export type TranscriptFormat = 'srt' | 'vtt' | 'txt' | 'json';

const TS = /(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;

export function parseTimestamp(s: string): number {
  const m = TS.exec(s.trim());
  if (!m) return NaN;
  const [, h, mi, se, ms] = m;
  return (Number(h ?? 0) * 3600) + Number(mi) * 60 + Number(se) + (ms ? Number(ms.padEnd(3, '0')) / 1000 : 0);
}

const cleanText = (s: string) =>
  s
    .replace(/<[^>]+>/g, '') // <i>, <c.color>, <00:00:01.000>
    .replace(/\{\\[^}]+\}/g, '') // {\an8}
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .trim();

export function detectFormat(text: string, fileName = ''): TranscriptFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'srt' || ext === 'vtt' || ext === 'json' || ext === 'txt') return ext;
  const t = text.trimStart();
  if (t.startsWith('WEBVTT')) return 'vtt';
  if (t.startsWith('{') || t.startsWith('[{') || t.startsWith('[\n')) return 'json';
  if (/\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->/.test(t)) return 'srt';
  return 'txt';
}

function parseBlocks(text: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const start = parseTimestamp(a);
    const end = parseTimestamp(b.trim().split(/\s+/)[0]);
    const body = cleanText(lines.slice(i + 1).join(' '));
    if (body && Number.isFinite(start) && Number.isFinite(end)) cues.push({ start, end, text: body });
  }
  return dedupeRolling(cues);
}

/**
 * YouTube-style auto captions repeat text across rolling cues
 * ("hello world" → "hello world how" …). Drop cues whose text is contained in
 * the next one and trim prefixes that repeat the previous cue.
 */
function dedupeRolling(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  for (const c of cues) {
    const prev = out[out.length - 1];
    if (prev && c.text === prev.text) {
      prev.end = Math.max(prev.end, c.end);
      continue;
    }
    if (prev && c.text.startsWith(prev.text + ' ') && c.start < prev.end + 0.05) {
      c.text = c.text.slice(prev.text.length + 1);
    }
    out.push(c);
  }
  return out;
}

export const parseSrt = parseBlocks;
export const parseVtt = (text: string) => parseBlocks(text.replace(/^WEBVTT[^\n]*\n/, ''));

export function parseTxt(text: string): Cue[] {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const lrc = /^\[?((?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s*[-–]?\s*(.+)$/;
  const timed = lines.map((l) => lrc.exec(l));
  if (timed.length && timed.filter(Boolean).length >= lines.length * 0.8) {
    const cues = timed
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => ({ start: parseTimestamp(m[1]), end: NaN, text: cleanText(m[2]) }));
    cues.forEach((c, i) => (c.end = cues[i + 1]?.start ?? c.start + 4));
    return cues;
  }
  return lines.map((text) => ({ start: NaN, end: NaN, text: cleanText(text) }));
}

export function parseJson(text: string): Cue[] {
  const data = JSON.parse(text) as unknown;
  const arr = Array.isArray(data) ? data : ((data as { sentences?: unknown[]; cues?: unknown[] }).sentences ?? (data as { cues?: unknown[] }).cues);
  if (!Array.isArray(arr)) throw new Error('JSON must be an array of cues or { sentences: [...] }');
  return arr.map((raw) => {
    const r = raw as Record<string, unknown>;
    const start = typeof r.start === 'number' ? r.start : parseTimestamp(String(r.start ?? ''));
    const end = typeof r.end === 'number' ? r.end : parseTimestamp(String(r.end ?? ''));
    return {
      start,
      end,
      text: cleanText(String(r.text ?? '')),
      translations: (r.translations as Record<string, string>) ?? undefined,
    };
  }).filter((c) => c.text);
}

export function parseTranscript(text: string, format: TranscriptFormat = detectFormat(text)): Cue[] {
  switch (format) {
    case 'srt': return parseSrt(text);
    case 'vtt': return parseVtt(text);
    case 'json': return parseJson(text);
    default: return parseTxt(text);
  }
}

export const hasTimings = (cues: Cue[]) => cues.length > 0 && cues.every((c) => Number.isFinite(c.start) && Number.isFinite(c.end));
