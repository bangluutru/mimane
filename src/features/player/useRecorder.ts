import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lesson } from '@/domains/lesson/types';
import type { StudyEngine } from '@/domains/study/engine';
import { computePeaks, isRecordingSupported, playBlob, startRecording, type RecorderHandle } from '@/domains/recording/recorder';
import { addRecording } from '@/domains/recording/repo';
import type { Recording } from '@/domains/recording/types';
import { countPractice, markPracticed } from '@/domains/progress/repo';

export type RecStatus = 'idle' | 'recording' | 'saving' | 'comparing' | 'playing';

/**
 * Per-sentence recording + Native ↔ Me comparison.
 *  - Shadow mode: recording runs while the native sentence plays (speak along).
 *  - Other modes: media pauses, learner speaks, recording stops on tap
 *    (or automatically after a generous limit).
 */
export function useRecorder(engine: StudyEngine | undefined, lesson: Lesson) {
  const [status, setStatus] = useState<RecStatus>('idle');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<'denied' | 'unsupported' | 'failed'>();
  const handle = useRef<RecorderHandle | undefined>(undefined);
  const target = useRef<number>(0);
  const abort = useRef<AbortController | undefined>(undefined);
  const autoStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const finish = useCallback(async () => {
    const h = handle.current;
    if (!h) return;
    handle.current = undefined;
    clearTimeout(autoStop.current);
    setStatus('saving');
    try {
      const { blob, mime, durationMs } = await h.stop();
      const { peaks, durationMs: decoded } = await computePeaks(blob).catch(() => ({ peaks: [], durationMs }));
      const s = lesson.sentences[target.current];
      const rec = await addRecording({ lessonId: lesson.id, sentenceId: s.id, blob, mime, durationMs: decoded || durationMs, peaks });
      await countPractice(lesson.id, s.id, 'recordings');
      await markPracticed(lesson.id, s.id, lesson.sentences.length);
      setStatus('idle');
      return rec;
    } catch {
      setError('failed');
      setStatus('idle');
    }
  }, [lesson]);

  const start = useCallback(
    async (index: number, mode: 'shadow' | 'solo') => {
      if (!engine) return;
      if (!isRecordingSupported()) return setError('unsupported');
      setError(undefined);
      target.current = index;
      abort.current?.abort();
      if (mode === 'solo') engine.pause();
      try {
        handle.current = await startRecording();
      } catch {
        setError('denied');
        return;
      }
      setStatus('recording');
      const s = lesson.sentences[index];
      const dur = (s.end - s.start) / engine.getState().settings.rate;
      if (mode === 'shadow') {
        await engine.playSegment(index);
        await new Promise((r) => setTimeout(r, 450));
        if (handle.current) await finish();
      } else {
        autoStop.current = setTimeout(() => finish(), Math.max(4000, dur * 2500 + 2000));
      }
    },
    [engine, lesson, finish],
  );

  // live input meter
  useEffect(() => {
    if (status !== 'recording') return;
    let id = 0;
    const loop = () => {
      setLevel(handle.current?.level() ?? 0);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [status]);

  const stopAll = useCallback(() => {
    abort.current?.abort();
    abort.current = undefined;
    if (handle.current) finish();
    else setStatus('idle');
  }, [finish]);

  const playMe = useCallback(async (rec: Recording) => {
    abort.current?.abort();
    const ac = (abort.current = new AbortController());
    engine?.pause();
    setStatus('playing');
    await playBlob(rec.blob, 1, ac.signal).catch(() => {});
    if (!ac.signal.aborted) setStatus('idle');
  }, [engine]);

  /** Native → Me → Native → Me */
  const compare = useCallback(
    async (index: number, rec: Recording, rounds = 2) => {
      if (!engine) return;
      abort.current?.abort();
      const ac = (abort.current = new AbortController());
      setStatus('comparing');
      for (let i = 0; i < rounds && !ac.signal.aborted; i++) {
        const completed = await engine.playSegment(index);
        if (!completed || ac.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 250));
        await playBlob(rec.blob, 1, ac.signal).catch(() => {});
        await new Promise((r) => setTimeout(r, 350));
      }
      setStatus((s) => (s === 'comparing' ? 'idle' : s));
    },
    [engine],
  );

  useEffect(() => () => {
    abort.current?.abort();
    handle.current?.cancel();
    clearTimeout(autoStop.current);
  }, []);

  return { status, level, error, start, stop: stopAll, playMe, compare, target };
}
