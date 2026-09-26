import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Repeat, Repeat1, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react';
import { useT } from '@/app/i18n';
import type { StudyEngine, StudyState } from '@/domains/study/engine';
import type { RecStatus } from './useRecorder';

export const RATES = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.1, 1.25];

export function Controls({
  engine, state, recStatus, onRecord, onRate, onLoop,
}: {
  engine?: StudyEngine;
  state: StudyState;
  recStatus: RecStatus;
  onRecord: () => void;
  onRate: (r: number) => void;
  onLoop: () => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const h = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('pointerdown', h);
    return () => window.removeEventListener('pointerdown', h);
  }, [menu]);

  const rate = state.settings.rate;
  const rec = recStatus === 'recording';
  const loop = state.settings.loop;
  return (
    <div className="controls" role="toolbar" aria-label="Playback">
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button className="icon-btn rate-btn" onClick={() => setMenu((m) => !m)} aria-label={`${t('player.speed')} ${rate}×`} aria-expanded={menu}>
          {rate}×
        </button>
        {menu && (
          <div className="menu" role="menu">
            {[...RATES].reverse().map((r) => (
              <button key={r} role="menuitemradio" aria-checked={r === rate} className={r === rate ? 'on' : ''} onClick={() => { onRate(r); setMenu(false); }}>
                {r}×
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="icon-btn" onClick={() => engine?.prev()} aria-label={t('player.prev')} disabled={!engine}>
        <SkipBack size={22} />
      </button>
      <button className="icon-btn" onClick={() => engine?.replay()} aria-label={t('player.replay')} disabled={!engine}>
        <RotateCcw size={22} />
      </button>
      <button className="icon-btn play-btn" onClick={() => engine?.toggle()} aria-label={state.playing ? t('player.pause') : t('player.play')} disabled={!engine}>
        {state.playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: 3 }} />}
      </button>
      <button className="icon-btn" onClick={() => engine?.next()} aria-label={t('player.next')} disabled={!engine}>
        <SkipForward size={22} />
      </button>
      <button className={`icon-btn${loop ? ' on' : ''}`} onClick={onLoop} aria-label={t('player.loop')} aria-pressed={loop}>
        {loop ? <Repeat1 size={22} /> : <Repeat size={22} />}
      </button>
      <button className={`icon-btn rec-btn${rec ? ' live' : ''}`} onClick={onRecord} aria-label={rec ? t('player.stop') : t('player.record')} aria-pressed={rec} disabled={!engine || recStatus === 'saving'}>
        {rec ? <Square size={18} fill="currentColor" /> : <Mic size={22} />}
      </button>
    </div>
  );
}
