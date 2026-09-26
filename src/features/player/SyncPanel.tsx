import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pause, Play, Undo2 } from 'lucide-react';
import { useT } from '@/app/i18n';
import type { Lesson } from '@/domains/lesson/types';
import { saveUserLesson } from '@/domains/lesson/repo';
import { useMediaPlayer } from './usePlayer';
import { MediaStage } from './MediaStage';

/**
 * Tap-to-sync for transcripts without timestamps: the learner taps when each
 * sentence starts. End times = next start (last = media end).
 */
export function SyncPanel({ lesson, onDone }: { lesson: Lesson; onDone: (l: Lesson) => void }) {
  const t = useT();
  const nav = useNavigate();
  const { mediaRef, ytRef, src, player } = useMediaPlayer(lesson);
  const [starts, setStarts] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const n = lesson.sentences.length;

  useEffect(() => {
    if (!player) return;
    const a = player.on('play', () => setPlaying(true));
    const b = player.on('pause', () => setPlaying(false));
    return () => {
      a();
      b();
    };
  }, [player]);

  const mark = () => {
    if (!player || starts.length >= n) return;
    if (!playing) player.play();
    setStarts([...starts, Math.max(0, player.getCurrentTime() - 0.15)]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        mark();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const finish = async () => {
    if (!player) return;
    const dur = player.getDuration() || lesson.durationSec;
    const sentences = lesson.sentences.map((s, i) => ({
      ...s,
      start: starts[i] ?? dur,
      end: Math.max((starts[i + 1] ?? dur) - 0.05, (starts[i] ?? dur) + 0.3),
    }));
    const updated: Lesson = { ...lesson, sentences, needsSync: false, durationSec: dur };
    await saveUserLesson(updated);
    player.pause();
    onDone(updated);
  };

  const next = lesson.sentences[starts.length];
  return (
    <div className="onboard" style={{ paddingTop: 12 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft size={22} /></button>
        <h1 className="grow" style={{ fontSize: '1.2rem' }}>{t('sync.title')}</h1>
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>{t('sync.hint')}</p>
      <MediaStage lesson={lesson} mediaRef={mediaRef} ytRef={ytRef} src={src} player={player} playing={playing} index={Math.max(0, starts.length - 1)} />
      <div className="panel" style={{ marginTop: 16 }}>
        <p className="xs muted">{t('sync.progress', { i: starts.length, n })}</p>
        <p className="current-text" style={{ fontSize: '1.2rem', minHeight: 60 }} lang={lesson.targetLanguage}>{next?.text ?? '✓'}</p>
      </div>
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button className="icon-btn" onClick={() => (playing ? player?.pause() : player?.play())} aria-label={playing ? t('player.pause') : t('player.play')}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="btn primary grow" onClick={mark} disabled={!player || starts.length >= n}>
          {t('sync.mark')}
        </button>
        <button className="icon-btn" onClick={() => setStarts(starts.slice(0, -1))} disabled={!starts.length} aria-label={t('sync.undo')}>
          <Undo2 size={20} />
        </button>
      </div>
      <button className="btn" style={{ marginTop: 16, width: '100%' }} onClick={finish} disabled={starts.length < n}>
        {t('sync.done')}
      </button>
    </div>
  );
}
