import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileAudio, MonitorPlay, Upload, X } from 'lucide-react';
import { pick, useT } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { parseYouTubeId } from '@/domains/media/youtube';
import { buildImportedLesson } from '@/domains/lesson/import';
import { putBlob, saveUserLesson } from '@/domains/lesson/repo';
import { hasTimings, parseTranscript } from '@/domains/transcript/parse';
import { CATEGORIES, type CategoryId } from '@/domains/library/taxonomy';
import { FRAMEWORKS, FRAMEWORK_FOR } from '@/languages/proficiency';
import { detectLanguage, getAdapter, TARGET_LANGS } from '@/languages/registry';
import type { AccentId, SupportLang, TargetLang } from '@/languages/types';
import { uid } from '@/domains/storage/db';
import type { MediaSource } from '@/domains/lesson/types';
import { AutoTranscribe } from './AutoTranscribe';

function mediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
    const url = URL.createObjectURL(file);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      resolve(Number.isFinite(el.duration) ? el.duration : undefined);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => resolve(undefined);
    el.src = url;
  });
}

function FileDrop({ accept, label, onFile, icon }: { accept: string; label: string; onFile: (f: File) => void; icon: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}`}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
    >
      <div className="row" style={{ justifyContent: 'center' }}>{icon} {label}</div>
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

export default function ImportPage() {
  const t = useT();
  const nav = useNavigate();
  const profile = useProfile();
  const [source, setSource] = useState<'youtube' | 'file'>('youtube');
  const [yt, setYt] = useState('');
  const [file, setFile] = useState<File>();
  const [transcript, setTranscript] = useState('');
  const [transcriptName, setTranscriptName] = useState<string>();
  const [translation, setTranslation] = useState<{ text: string; name: string }>();
  const [trLang, setTrLang] = useState<SupportLang>(profile.supportLanguage);
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState<TargetLang>(profile.targetLanguage);
  const [langTouched, setLangTouched] = useState(false);
  const [level, setLevel] = useState('');
  const [cats, setCats] = useState<CategoryId[]>([]);
  const [tags, setTags] = useState('');
  const [accent, setAccent] = useState<AccentId>();
  const [merge, setMerge] = useState(true);
  const [busy, setBusy] = useState<string>();
  /** set when the transcript came from speech recognition */
  const [transcriber, setTranscriber] = useState<string>();
  const [asrNote, setAsrNote] = useState<string>();
  const [error, setError] = useState<string>();

  const ytId = parseYouTubeId(yt);
  let cueInfo: { n: number; timed: boolean } | undefined;
  try {
    if (transcript.trim()) {
      const cues = parseTranscript(transcript);
      cueInfo = { n: cues.length, timed: hasTimings(cues) };
    }
  } catch {
    cueInfo = undefined;
  }

  const onTranscript = (text: string, name?: string) => {
    setTranscript(text);
    setTranscriptName(name);
    if (name) {
      // a subtitle file replaces an automatic transcript
      setTranscriber(undefined);
      setAsrNote(undefined);
    }
    if (!langTouched) setLang(detectLanguage(text));
    if (!title && name) setTitle(name.replace(/\.(srt|vtt|txt|json)$/i, '').replace(/[._-]+/g, ' '));
  };

  const create = async () => {
    setError(undefined);
    if (source === 'youtube' && !ytId) return setError(t('import.needMedia'));
    if (source === 'file' && !file) return setError(t('import.needMedia'));
    if (!transcript.trim()) return setError(t('import.needTranscript'));
    try {
      setBusy(t('import.analysing'));
      let media: MediaSource;
      let duration: number | undefined;
      if (source === 'youtube') media = { kind: 'youtube', videoId: ytId! };
      else {
        const blobId = uid();
        await putBlob(blobId, file!, file!.name);
        duration = await mediaDuration(file!);
        media = { kind: 'blob', mediaType: file!.type.startsWith('video') ? 'video' : 'audio', blobId, fileName: file!.name };
      }
      const lesson = await buildImportedLesson(
        {
          title,
          targetLanguage: lang,
          media,
          mediaDuration: duration,
          transcript: { text: transcript, fileName: transcriptName },
          translation: translation ? { text: translation.text, fileName: translation.name, lang: trLang } : undefined,
          mergeSentences: merge,
          categories: cats,
          tags: tags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
          difficulty: level ? { framework: FRAMEWORK_FOR[lang], level } : undefined,
          accent,
          sourceUrl: source === 'youtube' ? `https://www.youtube.com/watch?v=${ytId}` : undefined,
          transcriber,
        },
        (d, n) => setBusy(`${t('import.analysing')} ${d}/${n}`),
      );
      await saveUserLesson(lesson);
      nav(`/lesson/${encodeURIComponent(lesson.id)}`);
    } catch (e) {
      console.error(e);
      setError(t('common.error'));
      setBusy(undefined);
    }
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720 }}>
      <div className="stack" style={{ gap: 4 }}>
        <h1>{t('import.title')}</h1>
        <p className="muted">{t('import.subtitle')}</p>
      </div>

      <section className="panel stack">
        <h2>{t('import.media')}</h2>
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          <button className={source === 'youtube' ? 'on' : ''} onClick={() => setSource('youtube')}><MonitorPlay size={14} style={{ verticalAlign: -2 }} /> YouTube</button>
          <button className={source === 'file' ? 'on' : ''} onClick={() => setSource('file')}><FileAudio size={14} style={{ verticalAlign: -2 }} /> {t('import.file')}</button>
        </div>
        {source === 'youtube' ? (
          <label className="field">
            <span>{t('import.youtube')}</span>
            <input className="input" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={yt} onChange={(e) => setYt(e.target.value)} />
            {yt && !ytId && <span className="error">{t('import.invalidYoutube')}</span>}
          </label>
        ) : file ? (
          <div className="row"><FileAudio size={18} /> <span className="grow">{file.name}</span><button className="btn sm ghost" onClick={() => setFile(undefined)} aria-label={t('common.delete')}><X size={16} /></button></div>
        ) : (
          <FileDrop accept="audio/*,video/*" label={t('import.file')} icon={<Upload size={18} />} onFile={(f) => { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); }} />
        )}
      </section>

      <section className="panel stack">
        <h2>{t('import.transcript')}</h2>
        <p className="small muted">{t('import.transcriptHint')}</p>
        <AutoTranscribe
          youtubeUrl={source === 'youtube' && ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined}
          file={source === 'file' ? file : undefined}
          lang={lang}
          setLang={(l) => { setLang(l); setLangTouched(true); }}
          onResult={(srt, info) => {
            setTranscript(srt);
            setTranscriptName(undefined);
            setTranscriber(info.model);
            setMerge(false); // already split into sentences from word timings
            setAsrNote(t('asr.done', { n: info.sentences, model: info.model }));
          }}
        />
        {asrNote && <div className="note-box small">{asrNote}<br />{t('asr.review')}</div>}
        <FileDrop accept=".srt,.vtt,.txt,.json,text/plain" label={transcriptName ?? t('import.uploadSub')} icon={<Upload size={18} />} onFile={(f) => f.text().then((txt) => onTranscript(txt, f.name))} />
        <textarea className="input" placeholder={t('import.paste')} value={transcript} onChange={(e) => onTranscript(e.target.value)} />
        {cueInfo && (
          <p className="small muted">
            {t('import.cues', { n: cueInfo.n })}
            {!cueInfo.timed && <> · {t('import.noTimings')}</>}
          </p>
        )}
        {cueInfo?.timed && (
          <label className="toggle" style={{ padding: 0 }}>
            <span className="grow small">{t('import.merge')}</span>
            <input type="checkbox" role="switch" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
          </label>
        )}
      </section>

      <section className="panel stack">
        <h2>{t('import.translation')}</h2>
        <p className="small muted">{t('import.translationHint')}</p>
        <div className="row wrap">
          <select className="input" style={{ width: 'auto' }} value={trLang} onChange={(e) => setTrLang(e.target.value as SupportLang)} aria-label={t('import.yourLanguage')}>
            {(['vi', 'en', 'ja'] as SupportLang[]).filter((l) => l !== lang).map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
          </select>
          <div className="grow">
            <FileDrop accept=".srt,.vtt,.json" label={translation?.name ?? t('import.uploadSub')} icon={<Upload size={18} />} onFile={(f) => f.text().then((text) => setTranslation({ text, name: f.name }))} />
          </div>
        </div>
      </section>

      <section className="panel stack">
        <h2>{t('import.details')}</h2>
        <label className="field">
          <span>{t('import.titleField')}</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="row wrap" style={{ gap: 12 }}>
          <label className="field">
            <span>{t('import.language')}</span>
            <select className="input" value={lang} onChange={(e) => { setLang(e.target.value as TargetLang); setLangTouched(true); setLevel(''); setAccent(undefined); }}>
              {TARGET_LANGS.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('import.level')}</span>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">{t('import.auto')}</option>
              {FRAMEWORKS[FRAMEWORK_FOR[lang]].levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
          {getAdapter(lang).accents.length > 1 && (
            <label className="field">
              <span>{t('import.accent')}</span>
              <select className="input" value={accent ?? getAdapter(lang).defaultAccent} onChange={(e) => setAccent(e.target.value as AccentId)}>
                {getAdapter(lang).accents.map((a) => <option key={a} value={a}>{t(`accent.${a}`)}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="field">
          <span>{t('import.categories')}</span>
          <div className="row wrap">
            {CATEGORIES.map((c) => {
              const on = cats.includes(c.id);
              return (
                <button key={c.id} className={`chip${on ? ' on' : ''}`} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])} aria-pressed={on}>
                  {pick(c.label, profile.supportLanguage)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="field">
          <span>{t('import.tags')}</span>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="japan, spring, interview" />
        </label>
      </section>

      {error && <p className="error">{error}</p>}
      <div className="row wrap">
        <button className="btn primary" onClick={create} disabled={!!busy}>
          {busy ? <><span className="spin" style={{ width: 16, height: 16 }} /> {busy}</> : t('import.create')}
        </button>
        <span className="small muted">{t('import.privacy')}</span>
      </div>
    </div>
  );
}
