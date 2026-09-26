import { memo, useEffect, useRef, useState } from 'react';
import { Flag, Mic, Star, LocateFixed } from 'lucide-react';
import { useT } from '@/app/i18n';
import type { Lesson, Sentence } from '@/domains/lesson/types';
import type { SentenceMark } from '@/domains/progress/types';
import type { DisplayPrefs } from '@/domains/user/profile';
import { getLanguageUI } from '@/languages/ui/registry';
import type { SupportLang } from '@/languages/types';

const Row = memo(function Row({
  s, active, lesson, display, mark, trLang, onSeek, onToken, selectedToken,
}: {
  s: Sentence;
  active: boolean;
  lesson: Lesson;
  display: DisplayPrefs;
  mark?: SentenceMark;
  trLang?: SupportLang;
  onSeek: (i: number) => void;
  onToken: (sentence: number, token: number) => void;
  selectedToken?: number;
}) {
  const UI = getLanguageUI(lesson.targetLanguage);
  return (
    <div
      className={`t-row${active ? ' active' : ''}`}
      data-index={s.index}
      onClick={() => onSeek(s.index)}
      role="button"
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onSeek(s.index)}
    >
      <span className="n">{s.index + 1}</span>
      <div className="body">
        <div className="txt" lang={lesson.targetLanguage}>
          <UI.SentenceView
            sentence={s}
            variant="list"
            display={display}
            accent={lesson.accent}
            selected={selectedToken}
            onToken={active ? (ti) => onToken(s.index, ti) : undefined}
          />
        </div>
        {display.showTranslation && trLang && s.translations[trLang] && (
          <div className="tr" lang={trLang}>{s.translations[trLang]}</div>
        )}
      </div>
      {(mark?.favorite || mark?.difficult || !!mark?.recordings) && (
        <div className="marks" aria-hidden>
          {mark?.favorite && <Star size={13} fill="currentColor" style={{ color: 'var(--text-primary)' }} />}
          {mark?.difficult && <Flag size={13} fill="currentColor" style={{ color: 'var(--coral)' }} />}
          {!!mark?.recordings && <Mic size={13} />}
        </div>
      )}
    </div>
  );
});

/** Synchronised transcript. Auto-scroll pauses while the learner scrolls. */
export function Transcript({
  lesson, index, display, marks, trLang, onSeek, onToken, selected,
}: {
  lesson: Lesson;
  index: number;
  display: DisplayPrefs;
  marks: Record<string, SentenceMark>;
  trLang?: SupportLang;
  onSeek: (i: number) => void;
  onToken: (sentence: number, token: number) => void;
  selected?: { sentence: number; token: number };
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const suspendedUntil = useRef(0);
  const [away, setAway] = useState(false);
  const mountedAt = useRef(Date.now());

  const scrollToActive = (smooth = true) => {
    const el = box.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    const c = box.current;
    if (!el || !c) return;
    const top = el.offsetTop - c.clientHeight / 3;
    c.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (Date.now() < suspendedUntil.current) {
      setAway(true);
      return;
    }
    scrollToActive(Date.now() - mountedAt.current > 1000); // jump instantly when opening a lesson
    setAway(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const c = box.current;
    if (!c) return;
    const suspend = () => {
      suspendedUntil.current = Date.now() + 6000;
    };
    c.addEventListener('wheel', suspend, { passive: true });
    c.addEventListener('touchmove', suspend, { passive: true });
    c.addEventListener('keydown', suspend);
    return () => {
      c.removeEventListener('wheel', suspend);
      c.removeEventListener('touchmove', suspend);
      c.removeEventListener('keydown', suspend);
    };
  }, []);

  return (
    <div className="transcript" ref={box} aria-label={t('player.transcript')}>
      {lesson.sentences.map((s) => (
        <Row
          key={s.id}
          s={s}
          active={s.index === index}
          lesson={lesson}
          display={display}
          mark={marks[s.id]}
          trLang={trLang}
          onSeek={onSeek}
          onToken={onToken}
          selectedToken={selected?.sentence === s.index ? selected.token : undefined}
        />
      ))}
      {away && (
        <button
          className="btn sm back-current"
          onClick={() => {
            suspendedUntil.current = 0;
            setAway(false);
            scrollToActive();
          }}
        >
          <LocateFixed size={14} /> {t('player.backToCurrent')}
        </button>
      )}
    </div>
  );
}
