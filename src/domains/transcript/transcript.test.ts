import { describe, expect, it } from 'vitest';
import { detectFormat, parseSrt, parseTxt, parseVtt } from './parse';
import { alignTranslations, mergeCuesIntoSentences } from './segment';

const srt = `1
00:00:01,000 --> 00:00:02,500
<i>Hello there,</i>

2
00:00:02,600 --> 00:00:04,000
how are you?

3
00:00:05,000 --> 00:00:06,000
Fine.
`;

describe('transcript parsing', () => {
  it('parses SRT and strips markup', () => {
    const cues = parseSrt(srt);
    expect(cues).toHaveLength(3);
    expect(cues[0]).toMatchObject({ start: 1, end: 2.5, text: 'Hello there,' });
  });

  it('parses VTT with cue settings and ids', () => {
    const vtt = 'WEBVTT\n\nintro\n00:01.000 --> 00:02.000 align:start\nこんにちは。\n';
    expect(parseVtt(vtt)).toEqual([{ start: 1, end: 2, text: 'こんにちは。' }]);
    expect(detectFormat(vtt)).toBe('vtt');
  });

  it('parses LRC-style TXT and untimed TXT', () => {
    const lrc = parseTxt('[00:01.00] Xin chào.\n[00:03.50] Cảm ơn.');
    expect(lrc[0]).toMatchObject({ start: 1, end: 3.5 });
    expect(Number.isNaN(parseTxt('one\ntwo')[0].start)).toBe(true);
  });

  it('merges cues into sentences and aligns a translation track', () => {
    const merged = mergeCuesIntoSentences(parseSrt(srt), (t) => /[.!?]$/.test(t));
    expect(merged.map((c) => c.text)).toEqual(['Hello there, how are you?', 'Fine.']);
    const tr = alignTranslations(merged, [
      { start: 1, end: 4, text: 'Xin chào, bạn khỏe không?' },
      { start: 5, end: 6, text: 'Khỏe.' },
    ], 'vi');
    expect(tr[1].translations?.vi).toBe('Khỏe.');
  });

  it('does not put spaces between Japanese cues', () => {
    const m = mergeCuesIntoSentences(
      [{ start: 0, end: 1, text: '今日は' }, { start: 1, end: 2, text: '忙しいです。' }],
      (t) => /。$/.test(t),
    );
    expect(m[0].text).toBe('今日は忙しいです。');
  });
});

import { diffUnits, markAccentErrors, accuracy } from '@/domains/study/dictation';
describe('dictation diff', () => {
  it('flags tone-only mistakes separately', () => {
    const ops = markAccentErrors(diffUnits(['xin', 'chào'], ['xin', 'chao']));
    expect(ops.map((o) => o.type)).toEqual(['ok', 'accent']);
    expect(accuracy(ops)).toEqual({ correct: 1, total: 2 });
  });
});
