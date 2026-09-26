import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Compass, Headphones, History, Plus, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useT, pick } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { listLessons } from '@/domains/lesson/repo';
import { listLessonProgress } from '@/domains/progress/repo';
import { heuristicRecommender } from '@/domains/recommendation/recommender';
import { CATEGORY_BY_ID, FEATURED_TOPICS } from '@/domains/library/taxonomy';
import { exploreLevels } from '@/languages/proficiency';
import { useLive } from '@/ui/hooks';
import { LessonTile } from '@/ui/LessonTile';
import { ChottoBand, TopicIcon } from '@/ui/brand';
import type { LessonMeta } from '@/domains/lesson/types';
import type { LessonProgress } from '@/domains/progress/types';

const pct = (p: LessonProgress | undefined, l: LessonMeta) =>
  p ? (p.completed ? 100 : Math.round(((p.lastSentenceIndex + 1) / Math.max(1, l.sentenceCount)) * 100)) : 0;

/** Chotto SectionHead: icon box + section title + one-line description + "see all". */
function SectionHead({ icon, title, desc, action }: { icon: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="icon-box" aria-hidden>{icon}</span>
      <div className="titles">
        <h2>{title}</h2>
        {desc && <p className="desc">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

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
      <section className="home-hero">
        <span className="motif ring hero-ring" aria-hidden />
        <span className="motif dot hero-dot" aria-hidden />
        <p className="eyebrow">{t(`lang.${lang}`)} · {t('app.tagline')}</p>
        <h1>{t('home.greeting')}</h1>
        <p className="lead">{t('home.lead')}</p>
      </section>

      {continuing.length > 0 && (
        <section className="section">
          <SectionHead icon={<History size={22} />} title={t('home.continue')} />
          <div className="hscroll">
            {continuing.map((l) => <LessonTile key={l.id} lesson={l} progress={pct(byId.get(l.id), l)} />)}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHead
          icon={<Sparkles size={22} />}
          title={t('home.recommended')}
          desc={t('home.recommendedDesc')}
          action={<Link to={`/library?lang=${lang}`}>{t('common.seeAll')}</Link>}
        />
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
        <SectionHead icon={<Compass size={22} />} title={t('home.topics')} desc={t('home.topicsDesc')} />
        <div className="topic-grid">
          {topics.map((c) => (
            <button key={c} className="topic" onClick={() => nav(`/library?lang=${lang}&category=${c}`)}>
              <span className="icon-box" aria-hidden><TopicIcon id={c} size={20} /></span>
              {pick(CATEGORY_BY_ID[c].label, profile.supportLanguage)}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHead icon={<TrendingUp size={22} />} title={t('home.level')} />
        <div className="row wrap">
          {exploreLevels(lang).map((lv) => {
            const n = lessons.filter((l) => l.difficulty?.level === lv.id).length;
            return (
              <button key={lv.id} className={`chip${profile.levels[lang] === lv.id ? ' on' : ''}`} onClick={() => nav(`/library?lang=${lang}&level=${lv.id}`)}>
                {lv.short}
                <span className="count">{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <SectionHead icon={<Zap size={22} />} title={t('home.short')} desc={t('home.shortHint')} />
        {short.length ? (
          <div className="hscroll">
            {short.map((l) => <LessonTile key={l.id} lesson={l} progress={pct(byId.get(l.id), l)} />)}
          </div>
        ) : (
          <div className="empty">{t('home.empty')}</div>
        )}
      </section>

      <section className="section">
        <SectionHead icon={<Headphones size={22} />} title={t('home.deep')} desc={t('home.deepHint')} />
        {deep.length ? (
          <div className="hscroll">
            {deep.map((l) => <LessonTile key={l.id} lesson={l} progress={pct(byId.get(l.id), l)} />)}
          </div>
        ) : (
          <div className="empty">
            <p>{t('home.deepEmpty')}</p>
            <Link to="/import" className="btn sm" style={{ marginTop: 14 }}>
              <Plus size={16} /> {t('home.importCta')}
            </Link>
          </div>
        )}
      </section>

      <section className="section">
        <ChottoBand />
        <p className="xs muted" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} aria-hidden /> {t('home.privacy')}
        </p>
      </section>
    </div>
  );
}
