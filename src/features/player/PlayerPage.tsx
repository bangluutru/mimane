import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Captions, CaptionsOff, SlidersHorizontal } from 'lucide-react';
import { pick, useT } from '@/app/i18n';
import type { Lesson } from '@/domains/lesson/types';
import { deleteUserLesson, getLesson } from '@/domains/lesson/repo';
import type { StudyMode } from '@/domains/study/engine';
import { translationLang, useProfile } from '@/domains/user/profile';
import {
  addPlayTime, countPractice, flushPlayTime, getLessonProgress, getMarks, markPracticed, savePosition, setCompleted, touchLesson,
} from '@/domains/progress/repo';
import { useLive } from '@/ui/hooks';
import { toast } from '@/ui/toast';
import { MediaStage } from './MediaStage';
import { Controls } from './Controls';
import { CurrentSentence } from './CurrentSentence';
import { Transcript } from './Transcript';
import { SettingsSheet } from './SettingsSheet';
import { VocabSheet } from './VocabSheet';
import { Dictation } from './Dictation';
import { SyncPanel } from './SyncPanel';
import { useEngineState, useMediaPlayer, useStudyEngine } from './usePlayer';
import { useRecorder } from './useRecorder';

const MODES: StudyMode[] = ['listen', 'read', 'repeat', 'shadow', 'dictation'];

export default function PlayerPage() {
  const { id = '' } = useParams();
  const t = useT();
  const [lesson, setLesson] = useState<Lesson | null>();
  const [start, setStart] = useState<number>();
  const [params] = useSearchParams();

  useEffect(() => {
    let alive = true;
    setLesson(undefined);
    Promise.all([getLesson(id), getLessonProgress(id)])
      .then(([l, p]) => {
        if (!alive) return;
        const fromUrl = params.get('s');
        setStart(fromUrl !== null ? Number(fromUrl) : p?.lastSentenceIndex ?? 0);
        setLesson(l);
        touchLesson(l.id);
      })
      .catch(() => alive && setLesson(null));
    return () => {
      alive = false;
      flushPlayTime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (lesson === null) return <div className="center"><p>{t('lesson.notFound')}</p></div>;
  if (!lesson || start === undefined) return <div className="center"><div className="spin" /><p className="muted small">{t('player.loading')}</p></div>;
  if (lesson.needsSync) return <SyncPanel lesson={lesson} onDone={setLesson} />;
  return <PlayerView key={lesson.id} lesson={lesson} startIndex={start} />;
}

function PlayerView({ lesson, startIndex }: { lesson: Lesson; startIndex: number }) {
  const t = useT();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const profile = useProfile();
  const { display, study, supportLanguage, setDisplay, setStudy } = profile;
  const mode = (MODES.includes(params.get('mode') as StudyMode) ? params.get('mode') : 'read') as StudyMode;
  const setMode = (m: StudyMode) => {
    const p = new URLSearchParams(params);
    p.set('mode', m);
    p.delete('s');
    setParams(p, { replace: true });
  };

  const { mediaRef, ytRef, src, player, error } = useMediaPlayer(lesson);
  const settings = useMemo(() => study, [study]);
  const engine = useStudyEngine(player, lesson, { mode, settings, startIndex });
  const state = useEngineState(engine);
  const rec = useRecorder(engine, lesson);
  const marks = useLive(() => getMarks(lesson.id), [lesson.id], ['marks']) ?? {};
  const [sheet, setSheet] = useState<'settings' | null>(null);
  const [vocab, setVocab] = useState<{ sentence: number; token: number }>();
  const trLang = translationLang(supportLanguage, lesson.targetLanguage, lesson.supportLanguages);

  /* ---- progress tracking ------------------------------------------------ */
  useEffect(() => {
    if (!engine) return;
    const off = engine.onPlayTime((ms, m) => addPlayTime(lesson.id, m, ms));
    return () => void off();
  }, [engine, lesson.id]);

  const prev = useRef(state);
  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (!engine) return;
    const s = lesson.sentences[p.index];
    const speaking = state.mode === 'repeat' || state.mode === 'shadow';
    // a sentence was spoken along with / repeated
    if (speaking && s && ((state.phase === 'gap' && p.phase !== 'gap') || (state.index !== p.index && p.playing) || state.playCount > p.playCount)) {
      countPractice(lesson.id, s.id, 'repeats');
      markPracticed(lesson.id, s.id, lesson.sentences.length);
    }
    if (state.index !== p.index) savePosition(lesson.id, state.index);
    // reached the end of the lesson
    const last = lesson.sentences.length - 1;
    if (state.index === last && p.playing && !state.playing && player && player.getCurrentTime() >= lesson.sentences[last].end - 0.1) {
      setCompleted(lesson.id, true);
    }
  }, [state, engine, lesson, player]);

  /* ---- actions ------------------------------------------------------------ */
  const onRecord = useCallback(() => {
    if (rec.status === 'recording') return rec.stop();
    if (mode === 'shadow') toast(t('player.headphones'));
    rec.start(state.index, mode === 'shadow' ? 'shadow' : 'solo');
  }, [rec, mode, state.index, t]);

  const onSeek = useCallback((i: number) => engine?.goTo(i), [engine]);
  const onToken = useCallback((sentence: number, token: number) => {
    engine?.pause();
    setVocab({ sentence, token });
  }, [engine]);

  const toggleLoop = () => setStudy({ loop: !study.loop });
  const setRate = (r: number) => setStudy({ rate: r });

  /* ---- keyboard shortcuts (desktop) -------------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!engine) return;
      const k = e.key.toLowerCase();
      // a focused button would also receive the Space "click": drop focus first
      if (k === ' ') { e.preventDefault(); if (el.closest('button, [role="button"]')) (el as HTMLElement).blur(); engine.toggle(); }
      else if (k === 'arrowleft') { e.preventDefault(); engine.prev(); }
      else if (k === 'arrowright') { e.preventDefault(); engine.next(); }
      else if (k === 'r') engine.replay();
      else if (k === 'l') setStudy({ loop: !useProfile.getState().study.loop });
      else if (k === 'm') onRecord();
      else if (k === 'escape') setVocab(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, onRecord, setStudy]);

  const showList = mode !== 'listen' && mode !== 'dictation';
  const isUser = lesson.origin === 'user';

  return (
    <div className="player">
      <div style={{ gridArea: 'top' }}>
        <div className="player-top">
          <button className="icon-btn" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="title">
            <div className="t1" lang={lesson.targetLanguage}>
              {lesson.source.transcript === 'auto' && (
                <span className="badge warn" style={{ marginRight: 6, verticalAlign: 1 }} title={t('asr.review')}>{t('asr.auto')}</span>
              )}
              {lesson.title.original}
            </div>
            <div className="t2">{pick(lesson.title, supportLanguage, '') !== lesson.title.original ? pick(lesson.title, supportLanguage) : t(`mode.${mode}Hint`)}</div>
          </div>
          {(mode === 'listen' || mode === 'shadow') && (
            <button className={`icon-btn${display.hideSubtitle ? '' : ' on'}`} onClick={() => setDisplay({ hideSubtitle: !display.hideSubtitle })} aria-label={t('player.hideSubtitle')} aria-pressed={display.hideSubtitle}>
              {display.hideSubtitle ? <CaptionsOff size={20} /> : <Captions size={20} />}
            </button>
          )}
          <button className="icon-btn" onClick={() => setSheet('settings')} aria-label={t('player.settings')}>
            <SlidersHorizontal size={20} />
          </button>
        </div>
        <div className="player-modes">
          <div className="seg" role="tablist" aria-label="Study mode">
            {MODES.map((m) => (
              <button key={m} role="tab" aria-selected={m === mode} className={m === mode ? 'on' : ''} onClick={() => setMode(m)} title={t(`mode.${m}Hint`)}>
                {t(`mode.${m}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="player-media">
        <MediaStage lesson={lesson} mediaRef={mediaRef} ytRef={ytRef} src={src} player={player} engine={engine} playing={state.playing} index={state.index} />
        {error && <p className="error" style={{ marginTop: 6 }}>{t('player.mediaError')}</p>}
      </div>

      <CurrentSentence
        lesson={lesson}
        state={state}
        mark={marks[lesson.sentences[state.index]?.id]}
        selectedToken={vocab?.sentence === state.index ? vocab.token : undefined}
        onToken={(ti) => onToken(state.index, ti)}
        rec={rec}
        onRecord={onRecord}
      >
        {mode === 'dictation' ? <Dictation lesson={lesson} engine={engine} index={state.index} /> : undefined}
      </CurrentSentence>

      {showList ? (
        <Transcript
          lesson={lesson}
          index={state.index}
          display={display}
          marks={marks}
          trLang={trLang}
          onSeek={onSeek}
          onToken={onToken}
          selected={vocab}
        />
      ) : (
        <div className="transcript" style={{ display: 'grid', placeItems: 'center' }}>
          <p className="muted small" style={{ maxWidth: 320, textAlign: 'center' }}>{t(`mode.${mode}Hint`)}</p>
        </div>
      )}

      <Controls engine={engine} state={state} recStatus={rec.status} onRecord={onRecord} onRate={setRate} onLoop={toggleLoop} />

      {sheet === 'settings' && (
        <SettingsSheet
          lesson={lesson}
          onClose={() => setSheet(null)}
          onDelete={isUser ? async () => {
            if (!confirm(t('lesson.deleteConfirm'))) return;
            await deleteUserLesson(lesson.id);
            nav('/', { replace: true });
          } : undefined}
        />
      )}
      {vocab && (
        <VocabSheet
          lesson={lesson}
          sentenceIndex={vocab.sentence}
          tokenIndex={vocab.token}
          onClose={() => setVocab(undefined)}
          onPlaySentence={() => engine?.playSegment(vocab.sentence)}
        />
      )}
    </div>
  );
}
