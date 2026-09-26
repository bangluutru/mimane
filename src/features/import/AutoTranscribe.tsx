import { useEffect, useRef, useState } from 'react';
import { Cpu, Monitor, Sparkles, Square } from 'lucide-react';
import { useT } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { cuesToSrt, wordsToCues, type AsrStage } from '@/domains/transcript/asr';
import { browserProvider, localServerProvider, serverHealth, type ServerHealth } from '@/domains/transcript/providers';
import type { TargetLang } from '@/languages/types';
import { TARGET_LANGS } from '@/languages/registry';
import { FLAG } from '@/ui/format';

/**
 * "Auto-transcribe" on the Import page. Prefers the local faster-whisper
 * server; falls back to in-browser Whisper for uploaded files.
 */
export function AutoTranscribe({
  youtubeUrl, file, lang, setLang, onResult,
}: {
  youtubeUrl?: string;
  file?: File;
  lang: TargetLang;
  setLang: (l: TargetLang) => void;
  onResult: (srt: string, info: { model: string; sentences: number }) => void;
}) {
  const t = useT();
  const { transcription, update } = useProfile();
  const [health, setHealth] = useState<ServerHealth | null | undefined>(undefined);
  const [state, setState] = useState<{ progress: number; stage: AsrStage } | null>(null);
  const [error, setError] = useState<string>();
  const abort = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    serverHealth(transcription.serverUrl).then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, [transcription.serverUrl]);
  useEffect(() => () => abort.current?.abort(), []);

  const hasMedia = !!youtubeUrl || !!file;
  const serverOn = !!health;
  const canRun = hasMedia && (serverOn || (!!file && !youtubeUrl));
  const engine = serverOn ? 'server' : file ? 'browser' : null;

  const run = async () => {
    setError(undefined);
    const provider = serverOn ? localServerProvider(transcription.serverUrl) : browserProvider();
    const ac = (abort.current = new AbortController());
    setState({ progress: 0, stage: 'queued' });
    try {
      const result = await provider.transcribe(
        { file: youtubeUrl ? undefined : file, youtubeUrl, language: lang, quality: transcription.quality },
        (progress, stage) => setState({ progress, stage }),
        ac.signal,
      );
      const cues = wordsToCues(result);
      const model = provider.id === 'local-server' ? `faster-whisper ${result.model}` : result.model;
      onResult(cuesToSrt(cues), { model, sentences: cues.length });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setState(null);
    }
  };

  return (
    <div className="asr-box stack" style={{ gap: 10 }}>
      <div className="row wrap" style={{ gap: 8 }}>
        <Sparkles size={18} style={{ color: 'var(--accent)' }} />
        <strong className="grow">{t('asr.title')}</strong>
        <select className="input" style={{ width: 'auto', minHeight: 34, padding: '2px 10px' }} value={lang} onChange={(e) => setLang(e.target.value as TargetLang)} aria-label={t('import.language')}>
          {TARGET_LANGS.map((l) => <option key={l} value={l}>{FLAG[l]} {t(`lang.${l}`)}</option>)}
        </select>
        <div className="seg" role="radiogroup" aria-label={t('asr.quality')}>
          {(['accurate', 'fast'] as const).map((q) => (
            <button key={q} role="radio" aria-checked={transcription.quality === q} className={transcription.quality === q ? 'on' : ''} onClick={() => update({ transcription: { ...transcription, quality: q } })}>
              {t(`asr.${q}`)}
            </button>
          ))}
        </div>
      </div>
      <p className="small muted">{t('asr.hint')}</p>

      <div className="small row" style={{ gap: 6, alignItems: 'flex-start' }}>
        {health === undefined ? (
          <span className="muted">{t('common.loading')}</span>
        ) : engine === 'server' ? (
          <><Cpu size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} /> <span>{t('asr.engineServer')}</span></>
        ) : (
          <div className="stack" style={{ gap: 4 }}>
            <span className="muted">{t('asr.serverOff')} <code className="code">npm run transcriber</code></span>
            {youtubeUrl ? (
              <span className="error" style={{ fontSize: '0.85rem' }}>{t('asr.youtubeNeedsServer')}</span>
            ) : (
              <span className="row" style={{ gap: 6 }}><Monitor size={16} style={{ flexShrink: 0 }} /> {t('asr.engineBrowser')}</span>
            )}
          </div>
        )}
      </div>
      {youtubeUrl && serverOn && <p className="xs muted">{t('asr.ytNote')}</p>}

      {state ? (
        <div className="row" style={{ gap: 10 }}>
          <div className="meter" style={{ height: 8 }}><i style={{ width: `${Math.round(state.progress * 100)}%`, background: 'var(--accent)' }} /></div>
          <span className="small" style={{ minWidth: 150 }}>{t(`asr.stage.${state.stage}`)} {Math.round(state.progress * 100)}%</span>
          <button className="btn sm" onClick={() => abort.current?.abort()}>
            <Square size={12} fill="currentColor" /> {t('asr.cancel')}
          </button>
        </div>
      ) : (
        <button className="btn primary sm" style={{ alignSelf: 'flex-start' }} onClick={run} disabled={!canRun} title={!hasMedia ? t('asr.needMedia') : undefined}>
          <Sparkles size={16} /> {t('asr.button')}
        </button>
      )}
      {!hasMedia && <p className="xs muted">{t('asr.needMedia')}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
