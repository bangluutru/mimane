import { useT } from '@/app/i18n';
import { getStats, listLessonProgress } from '@/domains/progress/repo';
import { listLessons } from '@/domains/lesson/repo';
import { useLive } from '@/ui/hooks';
import { LessonTile } from '@/ui/LessonTile';

export default function ProgressPage() {
  const t = useT();
  const data = useLive(async () => ({ stats: await getStats(), progress: await listLessonProgress(), lessons: await listLessons() }), [], ['progress', 'vocab', 'recordings', 'marks']);
  if (!data) return <div className="center"><div className="spin" /></div>;
  const { stats } = data;
  const items = [
    { v: stats.minutesListened, l: t('progress.listened') },
    { v: stats.minutesShadowed, l: t('progress.shadowed') },
    { v: stats.sentencesPracticed, l: t('progress.sentences') },
    { v: stats.lessonsCompleted, l: t('progress.lessons') },
    { v: stats.wordsSaved, l: t('progress.words') },
  ];
  const recent = [...data.progress].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt)).slice(0, 10);
  return (
    <div>
      <h1>{t('progress.title')}</h1>
      <div className="stat-grid" style={{ marginTop: 16 }}>
        {items.map((i) => (
          <div key={i.l} className="stat">
            <div className="v">{i.v}</div>
            <div className="l">{i.l}</div>
          </div>
        ))}
      </div>
      <section className="section">
        <div className="section-head"><h2>{t('progress.history')}</h2></div>
        {recent.length ? (
          <div className="lesson-list">
            {recent.map((p) => {
              const l = data.lessons.find((x) => x.id === p.lessonId);
              if (!l) return null;
              const pct = p.completed ? 100 : ((p.lastSentenceIndex + 1) / l.sentenceCount) * 100;
              return (
                <div key={p.lessonId} className="row" style={{ gap: 12 }}>
                  <div className="grow"><LessonTile lesson={l} wide progress={pct} /></div>
                  <span className="xs muted" style={{ textAlign: 'right', minWidth: 72 }}>
                    {p.completed ? `✓ ${t('lesson.completed')}` : t('lesson.progress', { n: Math.round((p.practicedSentenceIds.length / l.sentenceCount) * 100) })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : <div className="empty">{t('progress.none')}</div>}
      </section>
    </div>
  );
}
