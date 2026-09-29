import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBoxView, type SearchItem } from '@chotto/search';
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
import { LangMark } from '@/ui/brand';
import { useMimaneSearch, useSearchLabels } from '@/ui/search/useMimaneSearch';

const SUGGEST_LIMIT = 8;

export default function LibraryPage() {
  const t = useT();
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  // ?q= chỉ ĐỌC một lần lúc mở trang, để link cũ đã chia sẻ vẫn lọc đúng. Sau
  // đó từ khoá sống trong state của ô: gõ gì cũng không ghi lên URL (lịch sử
  // trình duyệt, link chép gửi nhau). Các bộ lọc chọn sẵn thì vẫn ở URL.
  const [initialQuery] = useState(() => params.get('q') ?? '');
  useEffect(() => {
    if (!params.has('q')) return;
    const p = new URLSearchParams(params);
    p.delete('q');
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lang = (params.get('lang') as TargetLang) || profile.targetLanguage;
  const q = {
    lang,
    level: params.get('level') ?? undefined,
    category: (params.get('category') as CategoryId) ?? undefined,
    duration: (params.get('duration') as DurationBucket) ?? undefined,
    accent: (params.get('accent') as AccentId) ?? undefined,
  };
  const set = (k: string, v?: string) => {
    const p = new URLSearchParams(params);
    p.delete('q');
    if (v) p.set(k, v);
    else p.delete(k);
    if (k === 'lang') {
      p.delete('level');
      p.delete('accent');
    }
    setParams(p, { replace: true });
  };

  const data = useLive(async () => ({ lessons: await listLessons(), progress: await listLessonProgress() }), [], ['lessons', 'progress']);
  const ui = profile.supportLanguage;
  // Gợi ý lấy từ đúng tập đã qua các bộ lọc đang chọn, nên không gợi ý bài
  // mà lưới bên dưới không có.
  const search = useMemo(() => {
    const pool = data ? searchLessons(data.lessons, q) : [];
    return (text: string): SearchItem[] =>
      searchLessons(pool, { text })
        .slice(0, SUGGEST_LIMIT)
        .map((l) => {
          const local = pick(l.title, ui, '');
          return {
            key: l.id,
            title: l.title.original,
            subtitle: [local !== l.title.original ? local : '', l.difficulty?.level ?? ''].filter(Boolean).join(' · '),
            href: `/lesson/${l.id}`,
          };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ui, q.lang, q.level, q.category, q.duration, q.accent]);
  // Ô lọc (mode 'filter'): Enter khi chưa chọn gợi ý thì giữ từ khoá và đóng
  // bảng — lưới bên dưới đã lọc theo đúng từ khoá đó.
  const box = useMimaneSearch({ mode: 'filter', search, initialQuery, onSubmit: () => {} });
  const results = data ? searchLessons(data.lessons, { ...q, text: box.query }) : [];
  const done = new Map(data?.progress.map((p) => [p.lessonId, p]) ?? []);
  const count = t('library.results', { n: results.length });
  const labels = useSearchLabels({ seeAll: () => t('library.seeAll', { n: results.length }) });

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1>{t('library.title')}</h1>
      <SearchBoxView
        state={box}
        placeholder={t('library.search')}
        ariaLabel={t('library.searchLabel')}
        labels={labels}
        count={data ? count : undefined}
      />

      <div className="stack" style={{ gap: 10 }}>
        <div className="row wrap">
          {TARGET_LANGS.map((l) => (
            <button key={l} className={`chip${lang === l ? ' on' : ''}`} onClick={() => set('lang', l)}>
              <LangMark lang={l} /> {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        <div className="row wrap">
          <select className="input" style={{ width: 'auto', minHeight: 40, padding: '6px 12px', fontSize: 14 }} value={q.level ?? ''} onChange={(e) => set('level', e.target.value)} aria-label={t('import.level')}>
            <option value="">{t('library.anyLevel')}</option>
            {exploreLevels(lang).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minHeight: 40, padding: '6px 12px', fontSize: 14 }} value={q.category ?? ''} onChange={(e) => set('category', e.target.value)} aria-label={t('import.categories')}>
            <option value="">{t('library.anyTopic')}</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{pick(c.label, profile.supportLanguage)}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', minHeight: 40, padding: '6px 12px', fontSize: 14 }} value={q.duration ?? ''} onChange={(e) => set('duration', e.target.value)} aria-label="duration">
            <option value="">{t('library.anyLength')}</option>
            <option value="short">{t('library.short')}</option>
            <option value="medium">{t('library.medium')}</option>
            <option value="deep">{t('library.deep')}</option>
          </select>
          {getAdapter(lang).accents.length > 1 && (
            <select className="input" style={{ width: 'auto', minHeight: 40, padding: '6px 12px', fontSize: 14 }} value={q.accent ?? ''} onChange={(e) => set('accent', e.target.value)} aria-label={t('import.accent')}>
              <option value="">{t('library.anyAccent')}</option>
              {getAdapter(lang).accents.map((a) => <option key={a} value={a}>{t(`accent.${a}`)}</option>)}
            </select>
          )}
        </div>
      </div>

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
