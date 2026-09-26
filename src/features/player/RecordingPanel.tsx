import { ArrowLeftRight, Headphones, Play, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/app/i18n';
import type { Sentence } from '@/domains/lesson/types';
import type { Recording } from '@/domains/recording/types';
import { deleteRecording, listRecordings } from '@/domains/recording/repo';
import { useLive } from '@/ui/hooks';
import type { useRecorder } from './useRecorder';

export function Wave({ peaks, native }: { peaks: number[]; native?: boolean }) {
  const bars = peaks.length ? peaks : Array(48).fill(0.05);
  return (
    <div className={`wave${native ? ' native' : ''}`} aria-hidden>
      {bars.map((p, i) => (
        <i key={i} style={{ height: `${Math.max(6, p * 100)}%` }} />
      ))}
    </div>
  );
}

export function RecordingPanel({
  sentence, index, rec, onRecord,
}: {
  sentence: Sentence;
  index: number;
  rec: ReturnType<typeof useRecorder>;
  onRecord: () => void;
}) {
  const t = useT();
  const attempts = useLive(() => listRecordings(sentence.id), [sentence.id], ['recordings']) ?? [];
  const [sel, setSel] = useState<string>();
  useEffect(() => setSel(undefined), [sentence.id]);
  const current: Recording | undefined = attempts.find((a) => a.id === sel) ?? attempts[attempts.length - 1];

  if (rec.status === 'recording' && rec.target.current === index) {
    return (
      <div className="rec-panel" aria-live="polite">
        <div className="row">
          <span className="small" style={{ color: 'var(--danger)', fontWeight: 650 }}>● {t('rec.recording')}</span>
          <div className="meter"><i style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>
          <button className="btn sm" onClick={rec.stop}>
            <Square size={14} fill="currentColor" /> {t('rec.stop')}
          </button>
        </div>
        <p className="xs muted" style={{ marginTop: 6 }}>
          <Headphones size={12} style={{ verticalAlign: '-2px' }} /> {t('player.headphones')}
        </p>
      </div>
    );
  }

  if (!current) {
    return rec.error ? (
      <p className="error" style={{ marginTop: 8 }}>{t(rec.error === 'denied' ? 'rec.micDenied' : rec.error === 'unsupported' ? 'rec.unsupported' : 'common.error')}</p>
    ) : null;
  }

  const busy = rec.status === 'comparing' || rec.status === 'playing';
  return (
    <div className="rec-panel">
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="small" style={{ fontWeight: 650 }}>{t('rec.title')}</span>
        <div className="rec-attempts grow">
          {attempts.map((a) => (
            <button key={a.id} className={`chip${a.id === current.id ? ' on' : ''}`} style={{ height: 26, padding: '0 8px', fontSize: '0.75rem' }} onClick={() => setSel(a.id)}>
              {a.attempt}
            </button>
          ))}
        </div>
      </div>
      <Wave peaks={current.peaks} />
      <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
        <button className="btn sm primary" onClick={() => (busy ? rec.stop() : rec.compare(index, current))}>
          {rec.status === 'comparing' ? <Square size={14} fill="currentColor" /> : <ArrowLeftRight size={16} />} {t('rec.compare')}
        </button>
        <button className="btn sm" onClick={() => (busy ? rec.stop() : rec.playMe(current))}>
          {rec.status === 'playing' ? <Square size={14} fill="currentColor" /> : <Play size={14} />} {t('rec.playMe')}
        </button>
        <button className="btn sm ghost" onClick={onRecord}>
          <RotateCcw size={14} /> {t('rec.rerecord')}
        </button>
        <span className="spacer" />
        <button className="icon-btn sm" aria-label={t('rec.delete')} onClick={() => deleteRecording(current.id)}>
          <Trash2 size={16} />
        </button>
      </div>
      <p className="xs muted" style={{ marginTop: 6 }}>{t('rec.noScore')}</p>
    </div>
  );
}
