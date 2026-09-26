import { describe, expect, it } from 'vitest';
import { cuesToSrt, wordsToCues, type TranscriptionResult } from './asr';
import { parseSrt } from './parse';

const w = (start: number, end: number, word: string) => ({ start, end, word });
const res = (segments: TranscriptionResult['segments']): TranscriptionResult => ({ language: 'x', duration: 60, model: 'm', segments });

describe('wordsToCues', () => {
  it('splits a long Whisper segment at sentence punctuation', () => {
    const cues = wordsToCues(res([{
      start: 0, end: 4, text: '',
      words: [w(0, 0.4, ' Phở'), w(0.4, 0.6, ' là'), w(0.6, 1.2, ' ngon.'), w(1.3, 1.6, ' Tôi'), w(1.6, 2, ' thích'), w(2, 2.5, ' phở!')],
    }]));
    expect(cues.map((c) => c.text)).toEqual(['Phở là ngon.', 'Tôi thích phở!']);
    expect(cues[1]).toMatchObject({ start: 1.3, end: 2.5 });
  });

  it('uses pauses when Japanese punctuation is missing, without inserting spaces', () => {
    const cues = wordsToCues(res([{
      start: 0, end: 5, text: '',
      words: [w(0, 0.5, '今日は'), w(0.5, 1.2, '晴れです'), w(2.2, 2.8, '散歩'), w(2.8, 3.5, 'します')],
    }]));
    expect(cues.map((c) => c.text)).toEqual(['今日は晴れです', '散歩します']);
  });

  it('caps sentence length, preferring commas', () => {
    const words = Array.from({ length: 30 }, (_, i) => w(i * 0.5, i * 0.5 + 0.45, i === 14 ? ' and,' : ' word'));
    const cues = wordsToCues(res([{ start: 0, end: 15, text: '', words }]), { maxDuration: 10 });
    expect(cues.length).toBe(2);
    expect(cues[0].text.endsWith('and,')).toBe(true);
  });

  it('falls back to segment timing and round-trips through SRT', () => {
    const cues = wordsToCues(res([
      { start: 0, end: 2, text: 'Hello there.', words: [] },
      { start: 2.1, end: 4, text: 'How are you?', words: [] },
    ]));
    expect(cues.map((c) => c.text)).toEqual(['Hello there.', 'How are you?']);
    expect(parseSrt(cuesToSrt(cues))).toEqual(cues);
  });
});
