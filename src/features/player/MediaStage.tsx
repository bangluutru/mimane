import type { RefObject } from 'react';
import type { Lesson } from '@/domains/lesson/types';
import type { MediaPlayer } from '@/domains/media/types';
import type { StudyEngine } from '@/domains/study/engine';
import { indexAt } from '@/domains/study/engine';
import { coverIcon, coverStyle } from '@/ui/LessonTile';
import { fmtTime } from '@/ui/format';
import { useMediaTime } from './usePlayer';
import { useT } from '@/app/i18n';

export function MediaStage({
  lesson, mediaRef, ytRef, src, player, engine, playing, index, compact,
}: {
  lesson: Lesson;
  mediaRef: RefObject<HTMLMediaElement | null>;
  ytRef: RefObject<HTMLDivElement | null>;
  src?: string;
  player?: MediaPlayer;
  engine?: StudyEngine;
  playing: boolean;
  index: number;
  compact?: boolean;
}) {
  const t = useT();
  const m = lesson.media;
  const isVideo = m.kind === 'youtube' || ('mediaType' in m && m.mediaType === 'video');

  if (m.kind === 'youtube') {
    return (
      <div className="video-box">
        <div ref={ytRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className="stack" style={{ gap: 4 }}>
        <div className="video-box">
          <video ref={mediaRef as RefObject<HTMLVideoElement>} src={src} playsInline preload="auto" />
        </div>
        <Scrub lesson={lesson} player={player} engine={engine} playing={playing} index={index} />
      </div>
    );
  }
  return (
    <div className="audio-stage" style={coverStyle(lesson.id)}>
      <audio ref={mediaRef as RefObject<HTMLAudioElement>} src={src} preload="auto" />
      {!compact && <div className="art" aria-hidden style={{ background: 'rgb(255 255 255 / 0.45)' }}>{coverIcon(lesson)}</div>}
      <div className="info" style={{ color: '#1f2328' }}>
        {lesson.source.synthetic && <div className="xs" style={{ opacity: 0.7, marginBottom: 2 }} title={t('lesson.syntheticHint')}>🔊 {t('lesson.synthetic')}</div>}
        <Scrub lesson={lesson} player={player} engine={engine} playing={playing} index={index} light />
      </div>
    </div>
  );
}

/** Timeline with the active sentence highlighted; clicks snap to sentence starts. */
function Scrub({ lesson, player, engine, playing, index, light }: { lesson: Lesson; player?: MediaPlayer; engine?: StudyEngine; playing: boolean; index: number; light?: boolean }) {
  const t = useMediaTime(player, playing);
  const dur = player?.getDuration() || lesson.durationSec || 1;
  const s = lesson.sentences[index];
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!engine) return;
    const r = e.currentTarget.getBoundingClientRect();
    const time = ((e.clientX - r.left) / r.width) * dur;
    engine.goTo(indexAt(lesson.sentences, time), { autoplay: playing });
  };
  return (
    <div>
      <div className="scrub" onPointerDown={onPointer} role="slider" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} aria-label="timeline" tabIndex={-1}>
        <div className="track" style={light ? { background: 'rgb(0 0 0 / 0.12)' } : undefined}>
          {s && <div className="seg-active" style={{ left: `${(s.start / dur) * 100}%`, width: `${((s.end - s.start) / dur) * 100}%` }} />}
          <div className="fill" style={{ width: `${Math.min(100, (t / dur) * 100)}%` }} />
        </div>
      </div>
      <div className="times" style={light ? { color: 'rgb(0 0 0 / 0.55)' } : undefined}>
        <span>{fmtTime(t)}</span>
        <span>{fmtTime(dur)}</span>
      </div>
    </div>
  );
}
