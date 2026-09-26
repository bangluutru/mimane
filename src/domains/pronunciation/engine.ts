import type { SentenceAnalysis, TargetLang } from '@/languages/types';

/**
 * Pronunciation analysis boundary (Phase 3).
 *
 * Planned per-language analysers:
 *   ja — mora timing, vowel length, pitch accent, rhythm, phoneme alignment
 *   en — phonemes, word stress, connected speech, rhythm, intonation
 *   vi — initial / vowel / final, tone contour, rhythm, regional variants
 *
 * Rule: no numeric score is shown unless the method behind it is reliable.
 * Speech-to-text similarity is NOT a pronunciation score.
 */
export interface PronunciationFeedback {
  available: boolean;
  reason?: string;
  /** Future: aligned segments with observations, never a bare number. */
  observations?: { start: number; end: number; unit: string; note: string }[];
}

export interface PronunciationEngine {
  readonly lang: TargetLang;
  analyze(input: { native?: Blob; learner: Blob; text: string; analysis?: SentenceAnalysis }): Promise<PronunciationFeedback>;
}

export class NotYetAvailableEngine implements PronunciationEngine {
  constructor(readonly lang: TargetLang) {}
  async analyze(): Promise<PronunciationFeedback> {
    return { available: false, reason: 'Automatic pronunciation feedback is not available yet. Compare Native ↔ Me by ear.' };
  }
}

export const getPronunciationEngine = (lang: TargetLang): PronunciationEngine => new NotYetAvailableEngine(lang);
