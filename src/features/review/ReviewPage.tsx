import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Mic, Play, Star, Trash2 } from 'lucide-react';
import { pick, useT } from '@/app/i18n';
import { useProfile, translationLang } from '@/domains/user/profile';
import { getLesson, listLessons } from '@/domains/lesson/repo';
import { listMarks } from '@/domains/progress/repo';
import { listWords, removeWord } from '@/domains/vocabulary/repo';
import { deleteAllRecordings, deleteRecording, listAllRecordings } from '@/domains/recording/repo';
import { playBlob } from '@/domains/recording/recorder';
import type { Lesson } from '@/domains/lesson/types';
import { getLanguageUI } from '@/languages/ui/registry';
import { useLive } from '@/ui/hooks';
import { Wave } from '@/features/player/RecordingPanel';
import { LangMark } from '@/ui/brand';

type Tab = 'difficult' | 'favorites' | 'vocabulary' | 'recordings';

/** Load full lessons for the given ids (cached by the repository). */
async function lessonsById(ids: string[]) {
  const out = new Map<string, Lesson>();
  await Promise.all([...new Set(ids)].map((id) => getLesson(id).then((l) => out.set(id, l)).catch(() => {})));
  return out;
}

function SentenceItem({ lesson, sentenceId, icon }: { lesson: Lesson; sentenceId: string; icon: React.ReactNode }) {
  const { display, supportLanguage } = useProfile();
  const s = lesson.sentences.find((x) => x.id === sentenceId);
  const t = useT();
  if (!s) return null;
  const UI = getLanguageUI(lesson.targetLanguage);
  const tr = translationLang(supportLanguage, lesson.targetLanguage, lesson.supportLanguages);
  return (
    <div className="review-item">
      <span style={{ paddingTop: 4 }}>{icon}</span>
      <div className="grow">
        <div className="txt" lang={lesson.targetLanguage}>
          <UI.SentenceView sentence={s} variant="list" display={display} accent={lesson.accent} />
        </div>
        {tr && s.translations[tr] && <p className="small muted">{s.translations[tr]}</p>}
        <p className="xs muted row" style={{ marginTop: 6 }}><LangMark lang={lesson.targetLanguage} /> {lesson.title.original}</p>
      </div>
      <Link className="btn sm" to={`/lesson/${encodeURIComponent(lesson.id)}?s=${s.index}&mode=shadow`}>
        <Play size={14} /> {t('review.practice')}
      </Link>
    </div>
  );
}

export default function ReviewPage() {
  const t = useT();
  const ui = useProfile((p) => p.supportLanguage);
  const [tab, setTab] = useState<Tab>('difficult');

  const marks = useLive(async () => {
    const all = await listMarks();
    const lessons = await lessonsById(all.map((m) => m.lessonId));
    return { all, lessons };
  }, [], ['marks']);
  const words = useLive(() => listWords(), [], ['vocab']);
  const recs = useLive(async () => {
    const all = await listAllRecordings();
    return { all, lessons: await lessonsById(all.map((r) => r.lessonId)) };
  }, [], ['recordings']);
  const metas = useLive(() => listLessons(), [], ['lessons']);

  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: 'difficult', label: t('review.difficult'), n: marks?.all.filter((m) => m.difficult).length },
    { id: 'favorites', label: t('review.favorites'), n: marks?.all.filter((m) => m.favorite).length },
    { id: 'vocabulary', label: t('review.vocabulary'), n: words?.length },
    { id: 'recordings', label: t('review.recordings'), n: recs?.all.length },
  ];

  return (
    <div>
      <h1>{t('review.title')}</h1>
      <div className="tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} className={`chip${tab === x.id ? ' on' : ''}`} onClick={() => setTab(x.id)}>
            {x.label} {x.n ? <span className="xs" style={{ opacity: 0.7 }}>{x.n}</span> : null}
          </button>
        ))}
      </div>

      {(tab === 'difficult' || tab === 'favorites') && marks && (() => {
        const list = marks.all.filter((m) => (tab === 'difficult' ? m.difficult : m.favorite))
          .sort((a, b) => (b.lastPracticedAt ?? '').localeCompare(a.lastPracticedAt ?? ''));
        if (!list.length) return <div className="empty">{t(tab === 'difficult' ? 'review.emptyDifficult' : 'review.emptyFavorites')}</div>;
        return (
          <div className="stack">
            {list.map((m) => {
              const l = marks.lessons.get(m.lessonId);
              return l ? (
                <SentenceItem key={m.sentenceId} lesson={l} sentenceId={m.sentenceId}
                  icon={tab === 'difficult' ? <Flag size={16} style={{ color: 'var(--coral)' }} fill="currentColor" /> : <Star size={16} style={{ color: 'var(--text-primary)' }} fill="currentColor" />} />
              ) : null;
            })}
          </div>
        );
      })()}

      {tab === 'vocabulary' && words && (
        words.length ? (
          <div className="stack">
            {words.map((w) => {
              const ctx = w.contexts[0];
              const lessonMeta = metas?.find((m) => m.id === ctx?.lessonId);
              const meaning = w.entry?.meanings[ui] ?? w.meaning;
              return (
                <div key={w.id} className="review-item">
                  <LangMark lang={w.lang} />
                  <div className="grow">
                    <div className="row" style={{ gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.2rem' }} lang={w.lang}>{w.lemma}</strong>
                      {w.reading && <span className="muted" lang={w.lang}>{w.reading}</span>}
                      {w.entry?.level && <span className="badge accent">{w.entry.level.level}</span>}
                    </div>
                    {meaning && <p>{meaning}</p>}
                    {ctx && <p className="small muted" lang={w.lang} style={{ marginTop: 4 }}>“{ctx.text}”</p>}
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    {ctx && lessonMeta && (
                      <Link className="icon-btn sm" aria-label={t('review.practice')} to={`/lesson/${encodeURIComponent(ctx.lessonId)}?s=${ctx.sentenceId.split('#').pop()}`}>
                        <Play size={16} />
                      </Link>
                    )}
                    <button className="icon-btn sm" aria-label={t('vocab.remove')} onClick={() => removeWord(w.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="empty">{t('review.emptyVocab')}</div>
      )}

      {tab === 'recordings' && recs && (
        recs.all.length ? (
          <div className="stack">
            <p className="small muted">{t('rec.private')}</p>
            {recs.all.map((r) => {
              const l = recs.lessons.get(r.lessonId);
              const s = l?.sentences.find((x) => x.id === r.sentenceId);
              return (
                <div key={r.id} className="review-item">
                  <Mic size={16} style={{ marginTop: 4 }} />
                  <div className="grow stack" style={{ gap: 6 }}>
                    {s && <div className="txt" lang={l!.targetLanguage}>{s.text}</div>}
                    <div className="rec-panel" style={{ marginTop: 0, padding: 6 }}><Wave peaks={r.peaks} /></div>
                    <p className="xs muted">{t('rec.attempt', { n: r.attempt })} · {new Date(r.createdAt).toLocaleString(ui)} · {(r.durationMs / 1000).toFixed(1)}s {l && `· ${pick(l.title, ui, l.title.original)}`}</p>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <button className="icon-btn sm" aria-label={t('rec.playMe')} onClick={() => playBlob(r.blob)}>
                      <Play size={16} />
                    </button>
                    {l && s && (
                      <Link className="icon-btn sm" aria-label={t('review.practice')} to={`/lesson/${encodeURIComponent(l.id)}?s=${s.index}&mode=shadow`}>
                        <Mic size={16} />
                      </Link>
                    )}
                    <button className="icon-btn sm" aria-label={t('rec.delete')} onClick={() => deleteRecording(r.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            <button className="btn danger sm" style={{ alignSelf: 'flex-start' }} onClick={() => confirm(t('review.deleteAllConfirm')) && deleteAllRecordings()}>
              <Trash2 size={14} /> {t('review.deleteAll')}
            </button>
          </div>
        ) : <div className="empty">{t('review.emptyRecordings')}</div>
      )}
    </div>
  );
}
