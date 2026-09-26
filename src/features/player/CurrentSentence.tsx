import { useEffect, useState } from 'react';
import { Eye, Flag, Lightbulb, Star } from 'lucide-react';
import { pick, useT } from '@/app/i18n';
import type { Lesson } from '@/domains/lesson/types';
import type { SentenceMark } from '@/domains/progress/types';
import type { StudyState } from '@/domains/study/engine';
import { toggleDifficult, toggleFavorite } from '@/domains/progress/repo';
import { translationLang, useProfile } from '@/domains/user/profile';
import { getLanguageUI } from '@/languages/ui/registry';
import { RecordingPanel } from './RecordingPanel';
import type { useRecorder } from './useRecorder';

function GapIndicator({ state }: { state: StudyState }) {
  const t = useT();
  if (state.phase !== 'gap') return null;
  return (
    <span className="turn" aria-live="polite">
      🗣 {t('player.yourTurn')}
      <span className="bar">
        <i key={state.gapStartedAt} style={{ animation: `shrink ${state.gapDuration}s linear forwards` }} />
      </span>
    </span>
  );
}

export function CurrentSentence({
  lesson, state, mark, selectedToken, onToken, rec, onRecord, children,
}: {
  lesson: Lesson;
  state: StudyState;
  mark?: SentenceMark;
  selectedToken?: number;
  onToken: (i: number) => void;
  rec: ReturnType<typeof useRecorder>;
  onRecord: () => void;
  children?: React.ReactNode;
}) {
  const t = useT();
  const { display, supportLanguage } = useProfile();
  const s = lesson.sentences[state.index];
  const UI = getLanguageUI(lesson.targetLanguage);
  const [reveal, setReveal] = useState(false);
  const [showNote, setShowNote] = useState(false);
  useEffect(() => {
    setReveal(false);
    setShowNote(false);
  }, [state.index]);
  if (!s) return <section className="current" />;

  const mode = state.mode;
  const trLang = translationLang(supportLanguage, lesson.targetLanguage, lesson.supportLanguages);
  const translation = trLang ? s.translations[trLang] : undefined;
  const hide = mode === 'dictation' || ((mode === 'listen' || mode === 'shadow') && display.hideSubtitle && !reveal);
  // Listen mode is about the ear: plain subtitle, no aids / translation.
  const aids = mode === 'listen' ? { ...display, showPronunciation: false } : display;
  const showTr = mode !== 'listen' && mode !== 'dictation' && display.showTranslation;
  const note = pick(s.note, supportLanguage);

  return (
    <section className="current" aria-label="Current sentence">
      {children}
      {!children && (hide ? (
        mode === 'dictation' ? null : (
          <button className="hidden-sub" onClick={() => setReveal(true)}>
            <Eye size={18} /> {t('player.hidden')}
          </button>
        )
      ) : (
        <div className="current-text" lang={lesson.targetLanguage}>
          <UI.SentenceView sentence={s} variant="current" display={aids} accent={lesson.accent} selected={selectedToken} onToken={mode === 'listen' ? undefined : onToken} />
        </div>
      ))}
      {!children && !hide && UI.CurrentExtras && mode !== 'listen' && <UI.CurrentExtras display={display} t={t} accent={lesson.accent} />}
      {showTr && !hide && translation && <p className="current-trans" lang={trLang}>{translation}</p>}
      <div className="current-meta">
        <span className="idx">
          {state.index + 1} / {lesson.sentences.length}
          {state.settings.loop && state.playCount > 0 && ` · ${t('player.loopOn')} ${state.playCount}${state.settings.loopCount ? `/${state.settings.loopCount}` : ''}`}
        </span>
        <GapIndicator state={state} />
        {note && mode !== 'dictation' && (
          <button className={`icon-btn sm${showNote ? ' on' : ''}`} onClick={() => setShowNote((v) => !v)} aria-label={t('player.note')} aria-pressed={showNote}>
            <Lightbulb size={18} />
          </button>
        )}
        <button className={`icon-btn sm${mark?.favorite ? ' on' : ''}`} onClick={() => toggleFavorite(lesson.id, s.id)} aria-label={t('player.favorite')} aria-pressed={!!mark?.favorite}>
          <Star size={18} fill={mark?.favorite ? 'currentColor' : 'none'} />
        </button>
        <button className={`icon-btn sm${mark?.difficult ? ' on' : ''}`} onClick={() => toggleDifficult(lesson.id, s.id)} aria-label={t('player.difficult')} aria-pressed={!!mark?.difficult} style={mark?.difficult ? { color: 'var(--warn)', background: 'var(--warn-soft)' } : undefined}>
          <Flag size={18} fill={mark?.difficult ? 'currentColor' : 'none'} />
        </button>
      </div>
      {showNote && note && <div className="note-box">{note}</div>}
      {mode !== 'dictation' && <RecordingPanel sentence={s} index={state.index} rec={rec} onRecord={onRecord} />}
    </section>
  );
}
