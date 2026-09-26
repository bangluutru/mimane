import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Lesson } from '@/domains/lesson/types';
import type { MediaPlayer } from '@/domains/media/types';
import { Html5MediaPlayer } from '@/domains/media/html5';
import { YouTubePlayer } from '@/domains/media/youtube';
import { mediaUrl } from '@/domains/lesson/repo';
import { DEFAULT_SETTINGS, StudyEngine, type StudyMode, type StudySettings, type StudyState } from '@/domains/study/engine';

/** Creates the MediaPlayer adapter for a lesson's media source. */
export function useMediaPlayer(lesson: Lesson) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const ytRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string>();
  const [player, setPlayer] = useState<MediaPlayer>();
  const [error, setError] = useState<string>();

  // Resolve a URL for file / blob / url sources
  useEffect(() => {
    if (lesson.media.kind === 'youtube') return;
    let url: string | undefined;
    let alive = true;
    mediaUrl(lesson).then((u) => {
      url = u;
      if (!alive) return;
      if (u) setSrc(u);
      else setError('missing-media');
    });
    return () => {
      alive = false;
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [lesson]);

  useEffect(() => {
    let p: MediaPlayer | undefined;
    if (lesson.media.kind === 'youtube') {
      if (!ytRef.current) return;
      p = new YouTubePlayer(ytRef.current, lesson.media.videoId);
    } else {
      if (!src || !mediaRef.current) return;
      p = new Html5MediaPlayer(mediaRef.current);
    }
    const off = p.on('error', () => setError('media-error'));
    setPlayer(p);
    return () => {
      off();
      p!.destroy();
      if (ytRef.current) ytRef.current.innerHTML = '';
      setPlayer(undefined);
    };
  }, [lesson, src]);

  return { mediaRef, ytRef, src, player, error };
}

export function useStudyEngine(
  player: MediaPlayer | undefined,
  lesson: Lesson,
  opts: { mode: StudyMode; settings: Partial<StudySettings>; startIndex: number },
) {
  const [engine, setEngine] = useState<StudyEngine>();
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!player) return;
    const { mode, settings, startIndex } = optsRef.current;
    // The resume point is applied on the first play() (seeking an unstarted
    // YouTube player would start playback on its own).
    const e = new StudyEngine(player, lesson.sentences, { mode, settings, startIndex });
    setEngine(e);
    return () => {
      e.destroy();
      setEngine(undefined);
    };
  }, [player, lesson]);

  useEffect(() => engine?.setMode(opts.mode), [engine, opts.mode]);
  useEffect(() => engine?.setSettings(opts.settings), [engine, opts.settings]);

  return engine;
}

const IDLE: StudyState = {
  index: 0, playing: false, phase: 'idle', playCount: 0, gapDuration: 0, gapStartedAt: 0, mode: 'read', settings: DEFAULT_SETTINGS,
};
const noop = () => () => {};

export function useEngineState(engine: StudyEngine | undefined): StudyState {
  return useSyncExternalStore(engine?.subscribe ?? noop, engine?.getState ?? (() => IDLE));
}

/** Current media time, updated per animation frame while playing. */
export function useMediaTime(player: MediaPlayer | undefined, playing: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!player) return;
    setT(player.getCurrentTime());
    if (!playing) return;
    let id = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last > 200) {
        last = now;
        setT(player.getCurrentTime());
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [player, playing]);
  return t;
}
