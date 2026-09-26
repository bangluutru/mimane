import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useT, pick } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { listLessons } from '@/domains/lesson/repo';
import { listLessonProgress } from '@/domains/progress/repo';
import { searchLessons, type DurationBucket } from '@/domains/library/search';
import { CATEGORIES, type CategoryId } from '@/domains/library/taxonomy';
import { exploreLevels } from '@/languages/proficiency';
import { getAdapter, TARGET_LANGS } from '@/languages/registry';
import type { AccentId, TargetLang } from '@/languages/types';
import { useLive } from '@/ui/hooks';
import { LessonTile } from '@/ui/LessonTile';
import { FLAG } from '@/ui/format';

export default function LibraryPage() {
  const t = useT();
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const lang = (params.get('lang') as TargetLang) || profile.targetLanguage;
  const q = {
    text: params.get('q') ?? '',
    lang,
    level: params.get('level') ?? undefined,
    category: (params.get('category') as CategoryId) ?? undefined,
    duration: (params.get('duration') as DurationBucket) ?? undefined,
    accent: (params.get('accent') as AccentId) ?? undefined,
  };
  const set = (k: string, v?: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k === 'lang') {
      p.delete('level');
      p.delete('accent');
    }
    setParams(p, { replace: true });
  };

  const data = useLive(async () => ({ lessons: await listLessons(), progress: await listLessonProgress() }), [], ['lessons', 'progress']);
  const results = data ? searchLessons(data.lessons, q) : [];
  const done = new Map(data?.progress.map((p) => [p.lessonId, p]) ?? []);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1>{t('library.title')}</h1>
      <label className="row" style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, color: 'var(--muted)' }} aria-hidden />
        <input className="input" style={{ paddingLeft: 40 }} type="search" placeholder={t('library.search')} value={q.text} onChange={(e) => set('q', e.target.value)} aria-label={t('library.search')} />
      </label>

      <div className="stack" style={{ gap: 10 }}>
        <div className="row wrap">
          {TARGET_LANGS.map((l) => (
            <button key={l} className={`chip${lang === l ? ' on' : ''}`} onClick={() => set('lang', l)}>
              {FLAG[l]} {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        <div className="row wrap">
          <select className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 12px' }} value={q.level ?? ''} onChange={(e) => set('level', e.target.value)} aria-label={t('import.level')}>
            <option value="">{t('library.anyLevel')}</option>
            {exploreLevels(lang).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 12px' }} value={q.category ?? ''} onChange={(e) => set('category', e.target.value)} aria-label={t('import.categories')}>
            <option value="">{t('library.anyTopic')}</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {pick(c.label, profile.supportLanguage)}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 12px' }} value={q.duration ?? ''} onChange={(e) => set('duration', e.target.value)} aria-label="duration">
            <option value="">{t('library.anyLength')}</option>
            <option value="short">{t('library.short')}</option>
            <option value="medium">{t('library.medium')}</option>
            <option value="deep">{t('library.deep')}</option>
          </select>
          {getAdapter(lang).accents.length > 1 && (
            <select className="input" style={{ width: 'auto', minHeight: 36, padding: '4px 12px' }} value={q.accent ?? ''} onChange={(e) => set('accent', e.target.value)} aria-label={t('import.accent')}>
              <option value="">{t('library.anyAccent')}</option>
              {getAdapter(lang).accents.map((a) => <option key={a} value={a}>{t(`accent.${a}`)}</option>)}
            </select>
          )}
        </div>
      </div>

      <p className="muted small">{t('library.results', { n: results.length })}</p>
      {data && !results.length ? (
        <div className="empty">{t('library.none')}</div>
      ) : (
        <div className="lesson-grid">
          {results.map((l) => {
            const p = done.get(l.id);
            return <LessonTile key={l.id} lesson={l} progress={p ? (p.completed ? 100 : ((p.lastSentenceIndex + 1) / l.sentenceCount) * 100) : undefined} />;
          })}
        </div>
      )}
    </div>
  );
}
