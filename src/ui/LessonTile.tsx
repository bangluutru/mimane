import { Link } from 'react-router-dom';
import type { LessonMeta } from '@/domains/lesson/types';
import { CATEGORY_BY_ID } from '@/domains/library/taxonomy';
import { levelLabel } from '@/languages/proficiency';
import { pick, useT } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { FLAG, fmtDuration } from './format';

const PALETTES = [
  ['#dfeee8', '#b9d8cc'], ['#f3e6d3', '#e6caa2'], ['#e3e8f4', '#bfcbe6'], ['#f2e0e0', '#e0bcbc'],
  ['#e6e9dc', '#c9d1b0'], ['#ece3f1', '#d2c0e0'], ['#dcebf0', '#b3d3de'], ['#f1e9d8', '#dccb9f'],
];

export function coverStyle(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
}

export function coverIcon(l: Pick<LessonMeta, 'categories'>) {
  return CATEGORY_BY_ID[l.categories[0]]?.icon ?? '🎧';
}

export function LessonTile({ lesson, progress, wide, reason }: { lesson: LessonMeta; progress?: number; wide?: boolean; reason?: string }) {
  const ui = useProfile((p) => p.supportLanguage);
  const t = useT();
  const secondary = pick(lesson.title, ui, '') !== lesson.title.original ? pick(lesson.title, ui) : pick(lesson.description, ui);
  return (
    <Link to={`/lesson/${encodeURIComponent(lesson.id)}`} className={`lesson-tile${wide ? ' wide' : ''}`}>
      <div className="cover" style={lesson.thumbnail ? undefined : coverStyle(lesson.id)}>
        {lesson.thumbnail ? <img src={lesson.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span aria-hidden>{coverIcon(lesson)}</span>}
        <span className="flag" aria-hidden>{FLAG[lesson.targetLanguage]}</span>
        <span className="dur">{fmtDuration(lesson.durationSec)}</span>
        {progress !== undefined && progress > 0 && <span className="prog" style={{ width: `${Math.min(100, progress)}%` }} />}
      </div>
      <div className={wide ? 'grow stack' : 'stack'} style={{ gap: 4 }}>
        <div className="t1" lang={lesson.targetLanguage}>{lesson.title.original}</div>
        {secondary && <div className="t2">{secondary}</div>}
        <div className="meta">
          {lesson.difficulty && <span className="badge accent">{levelLabel(lesson.difficulty, true)}</span>}
          {lesson.categories.slice(0, 2).map((c) => (
            <span key={c} className="badge">{CATEGORY_BY_ID[c] ? pick(CATEGORY_BY_ID[c].label, ui) : c}</span>
          ))}
          {lesson.origin === 'user' && <span className="badge warn">{t('lesson.mine')}</span>}
          {reason && <span className="xs muted">· {reason}</span>}
        </div>
      </div>
    </Link>
  );
}
