/** A learner's attempt at one Sentence Learning Unit. Stored on-device only. */
export interface Recording {
  id: string;
  userId: string; // 'local' until accounts exist
  lessonId: string;
  sentenceId: string;
  attempt: number; // 1-based per sentence
  blob: Blob;
  mime: string;
  durationMs: number;
  peaks: number[]; // normalised 0..1 for the waveform
  createdAt: string;
}
