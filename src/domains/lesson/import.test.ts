import { describe, expect, it } from 'vitest';
import '../../../scripts/node-env';
import { buildImportedLesson } from './import';
import type { EnAnalysis, JaAnalysis } from '@/languages/types';

const srt = `1
00:00:01,000 --> 00:00:02,400
So, what are you

2
00:00:02,400 --> 00:00:03,900
doing this weekend?

3
00:00:04,500 --> 00:00:06,000
I'm going hiking.
`;
const viSrt = `1
00:00:01,000 --> 00:00:03,900
Vậy cuối tuần này bạn làm gì?

2
00:00:04,500 --> 00:00:06,000
Mình đi leo núi.
`;

describe('buildImportedLesson', () => {
  it('merges cues, aligns the translation track and analyses sentences', async () => {
    const lesson = await buildImportedLesson({
      title: 'Weekend',
      targetLanguage: 'en',
      media: { kind: 'youtube', videoId: 'abcdefghijk' },
      transcript: { text: srt, fileName: 'x.srt' },
      translation: { text: viSrt, lang: 'vi' },
      mergeSentences: true,
      categories: ['daily-life'],
      tags: [],
    });
    expect(lesson.sentences.map((s) => s.text)).toEqual(['So, what are you doing this weekend?', "I'm going hiking."]);
    expect(lesson.sentences[0]).toMatchObject({ start: 1, end: 3.9, translations: { vi: 'Vậy cuối tuần này bạn làm gì?' } });
    expect(lesson.supportLanguages).toEqual(['vi']);
    const a = lesson.sentences[1].analysis as EnAnalysis;
    expect(a.tokens.find((t) => t.surface === 'hiking')?.ipa).toBe('ˈhaɪkɪŋ');
    expect(lesson.needsSync).toBe(false);
  });

  it('marks untimed text for tap-to-sync and splits Japanese sentences', async () => {
    const lesson = await buildImportedLesson({
      title: '',
      targetLanguage: 'ja',
      media: { kind: 'youtube', videoId: 'abcdefghijk' },
      transcript: { text: '今日はとても忙しかったです。明日は休みます。' },
      mergeSentences: true,
      categories: [],
      tags: [],
    });
    expect(lesson.needsSync).toBe(true);
    expect(lesson.sentences).toHaveLength(2);
    const tok = (lesson.sentences[0].analysis as JaAnalysis).tokens.find((t) => t.lemma === '忙しい');
    expect(tok).toMatchObject({ surface: '忙しかった', conjugation: ['past'] });
    expect(tok?.ruby?.[0]).toEqual({ text: '忙', rt: 'いそが' });
  });
});
