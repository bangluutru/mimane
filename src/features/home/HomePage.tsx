import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT, pick } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { listLessons } from '@/domains/lesson/repo';
import { listLessonProgress } from '@/domains/progress/repo';
import { heuristicRecommender } from '@/domains/recommendation/recommender';
import { CATEGORY_BY_ID, FEATURED_TOPICS } from '@/domains/library/taxonomy';
import { exploreLevels } from '@/languages/proficiency';
import { useLive } from '@/ui/hooks';
import { LessonTile } from '@/ui/LessonTile';
import type { LessonMeta } from '@/domains/lesson/types';
import type { LessonProgress } from '@/domains/progress/types';

const pct = (p: LessonProgress | undefined, l: LessonMeta) =>
  p ? (p.completed ? 100 : Math.round(((p.lastSentenceIndex + 1) / Math.max(1, l.sentenceCount)) * 100)) : 0;

export function HomePage() {
  const t = useT();
  const profile = useProfile();
  const nav = useNavigate();
  const lang = profile.targetLanguage;
  const data = useLive(async () => ({ lessons: await listLessons(), progress: await listLessonProgress() }), [], ['lessons', 'progress']);

  if (!data) return <div className="center"><div className="spin" /></div>;
  const lessons = data.lessons.filter((l) => l.targetLanguage === lang);
  const byId = new Map(data.progress.map((p) => [p.lessonId, p]));

  const continuing = data.progress
    .filter((p) => !p.completed)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
    .map((p) => lessons.find((l) => l.id === p.lessonId))
    .filter((l): l is LessonMeta => !!l)
    .slice(0, 6);
  const recs = heuristicRecommender.recommend(data.lessons, profile, data.progress, 8);
  const short = lessons.filter((l) => l.durationSec < 180);
  const deep = lessons.filter((l) => l.durationSec >= 600);
  const topicsWithContent = FEATURED_TOPICS.filter((c) => lessons.some((l) => l.categories.includes(c)));
  const topics = [...topicsWithContent, ...FEATURED_TOPICS.filter((c) => !topicsWithContent.includes(c))];

  return (
    <div>
      <h1 style={{ marginTop: 4 }}>{t('home.greeting')}</h1>

      {continuing.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>{t('home.continue')}</h2></div>
          <div className="hscroll">
            {continuing.map((l) => <LessonTile key={l.id} lesson={l} progress={pct(byId.get(l.id), l)} />)}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>{t('home.recommended')}</h2>
          <Link to={`/library?lang=${lang}`} className="small">{t('common.seeAll')}</Link>
        </div>
        {recs.length ? (
          <div className="hscroll">
            {recs.map((r) => (
              <LessonTile key={r.lesson.id} lesson={r.lesson} progress={pct(byId.get(r.lesson.id), r.lesson)} reason={r.reasons[0] ? t(`reasons.${r.reasons[0]}`) : undefined} />
            ))}
          </div>
        ) : (
          <div className="empty">{t('home.empty')}</div>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>{t('home.topics')}</h2></div>
        <div className="topic-grid">
          {topics.map((c) => (
            <button key={c} className="topic" onClick={() => nav(`/library?lang=${lang}&category=${c}`)}>
              <span className="ico" aria-hidden>{CATEGORY_BY_ID[c].icon}</span>
              {pick(CATEGORY_BY_ID[c].label, profile.supportLanguage)}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>{t('home.level')}</h2></div>
        <div className="row wrap">
          {exploreLevels(lang).map((lv) => {
            const n = lessons.filter((l) => l.difficulty?.level === lv.id).length;
            return (
              <button key={lv.id} className={`chip${profile.levels[lang] === lv.id ? ' on' : ''}`} onClick={() => nav(`/library?lang=${lang}&level=${lv.id}`)}>
                {lv.short}
                <span className="muted xs">{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t('home.short')}</h2>
          <span className="muted small">{t('home.shortHint')}</span>
        </div>
        {short.length ? (
          <div className="hscroll">
            {short.map((l) => <LessonTile key={l.id} lesson={l} progress={pct(byId.get(l.id), l)} />)}
          </div>
        ) : (
          <div className="empty">{t('home.empty')}</div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t('home.deep')}</h2>
          <span className="muted small">{t('home.deepHint')}</span>
        </div>
        {deep.length ? (
          <div className="hscroll">
            {deep.map((l) => <LessonTile key={l.id} lesson={l} progress={pct(byId.get(l.id), l)} />)}
          </div>
        ) : (
          <div className="empty">
            <p>{t('home.deepEmpty')}</p>
            <Link to="/import" className="btn sm" style={{ marginTop: 12 }}>
              <Plus size={16} /> {t('home.importCta')}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
