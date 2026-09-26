import { Link } from 'react-router-dom';
import type { LessonMeta } from '@/domains/lesson/types';
import { CATEGORY_BY_ID } from '@/domains/library/taxonomy';
import { levelLabel } from '@/languages/proficiency';
import { pick, useT } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { fmtDuration } from './format';
import { CoverArt, LangMark, TopicIcon } from './brand';

export function LessonTile({ lesson, progress, wide, reason }: { lesson: LessonMeta; progress?: number; wide?: boolean; reason?: string }) {
  const ui = useProfile((p) => p.supportLanguage);
  const t = useT();
  const secondary = pick(lesson.title, ui, '') !== lesson.title.original ? pick(lesson.title, ui) : pick(lesson.description, ui);
  return (
    <Link to={`/lesson/${encodeURIComponent(lesson.id)}`} className={`lesson-tile${wide ? ' wide' : ''}`}>
      <div className="cover">
        {lesson.thumbnail ? (
          <img src={lesson.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <CoverArt id={lesson.id} />
            <span className="icon-box"><TopicIcon id={lesson.categories[0] ?? 'other'} size={wide ? 18 : 22} /></span>
          </>
        )}
        <LangMark lang={lesson.targetLanguage} />
        <span className="dur">{fmtDuration(lesson.durationSec)}</span>
        {progress !== undefined && progress > 0 && <span className="prog" style={{ width: `${Math.min(100, progress)}%` }} />}
      </div>
      <div className={wide ? 'grow stack' : 'stack'} style={{ gap: 6 }}>
        <div className="t1" lang={lesson.targetLanguage}>{lesson.title.original}</div>
        {secondary && <div className="t2">{secondary}</div>}
        <div className="meta">
          {lesson.difficulty && <span className="badge accent">{levelLabel(lesson.difficulty, true)}</span>}
          {lesson.categories.slice(0, 1).map((c) => (
            <span key={c} className="badge">{CATEGORY_BY_ID[c] ? pick(CATEGORY_BY_ID[c].label, ui) : c}</span>
          ))}
          {lesson.origin === 'user' && <span className="badge">{t('lesson.mine')}</span>}
          {reason && <span className="xs muted">{reason}</span>}
        </div>
      </div>
    </Link>
  );
}
