import type { JaToken } from '../types';
import type { FuriganaMode } from '@/domains/user/profile';
import { JLPT_ORDER } from '../ja/adapter';
import type { LanguageUI } from './types';
import { Tokens } from './common';

const MODES: FuriganaMode[] = ['all', 'N5', 'N4', 'N3', 'N2', 'rare', 'off'];

/** Should furigana be shown above this word for the chosen threshold? */
export function showFurigana(t: JaToken, mode: FuriganaMode): boolean {
  if (mode === 'off') return false;
  if (mode === 'all' || !t.jlpt) return true; // unknown level → help the reader
  const rank = JLPT_ORDER.indexOf(t.jlpt); // N5=0 … N1=4
  if (mode === 'rare') return rank >= 4;
  return rank >= JLPT_ORDER.indexOf(mode);
}

function Word({ t, mode }: { t: JaToken; mode: FuriganaMode }) {
  if (!t.ruby || !showFurigana(t, mode)) return <>{t.surface}</>;
  return (
    <>
      {t.ruby.map((r, i) =>
        r.rt ? (
          <ruby key={i}>
            {r.text}
            <rt>{r.rt}</rt>
          </ruby>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

export const jaUI: LanguageUI = {
  SentenceView({ sentence, display, selected, onToken }) {
    const mode = display.showPronunciation ? display.furigana : 'off';
    return (
      <span lang="ja">
        <Tokens sentence={sentence} selected={selected} onToken={onToken} render={(t) => <Word t={t as JaToken} mode={mode} />} />
      </span>
    );
  },

  VocabBody({ token, entry, t }) {
    const tk = token as JaToken;
    const reading = entry?.reading ?? (tk.lemma === tk.surface ? tk.reading : undefined);
    return (
      <dl className="kv">
        {tk.lemma && tk.lemma !== tk.surface && (
          <>
            <dt>{t('vocab.lemma')}</dt>
            <dd lang="ja">
              {tk.lemma}
              {entry?.reading && <span className="muted"> ・{entry.reading}</span>}
            </dd>
          </>
        )}
        {reading && tk.lemma === tk.surface && (
          <>
            <dt>{t('vocab.reading')}</dt>
            <dd lang="ja">{reading}</dd>
          </>
        )}
        {tk.pos && (
          <>
            <dt>{t('vocab.pos')}</dt>
            <dd>{t(`pos.${tk.pos}`)}</dd>
          </>
        )}
        {tk.conjugation && (
          <>
            <dt>{t('vocab.conjugation')}</dt>
            <dd>{tk.conjugation.map((c) => t(`conj.${c}`)).join(' · ')}</dd>
          </>
        )}
        {tk.parts && (
          <>
            <dt>{t('vocab.parts')}</dt>
            <dd lang="ja">{tk.parts.map((p) => p.surface).join(' + ')}</dd>
          </>
        )}
        {tk.jlpt && (
          <>
            <dt>{t('vocab.level')}</dt>
            <dd>
              JLPT {tk.jlpt}
              {tk.jlptSource && tk.jlptSource !== 'lexicon' && <span className="muted small"> · {t(`vocab.source.${tk.jlptSource}`)}</span>}
            </dd>
          </>
        )}
      </dl>
    );
  },

  DisplaySettings({ display, setDisplay, t }) {
    return (
      <div className="field">
        <span>{t('player.furigana')}</span>
        <div className="seg" role="radiogroup">
          {MODES.map((m) => (
            <button key={m} role="radio" aria-checked={display.furigana === m} className={display.furigana === m ? 'on' : ''} onClick={() => setDisplay({ furigana: m })}>
              {t(`furigana.${m}`)}
            </button>
          ))}
        </div>
      </div>
    );
  },

  lookupLinks(lemma, ui) {
    const links = [{ label: 'Jisho', url: `https://jisho.org/search/${encodeURIComponent(lemma)}` }];
    if (ui === 'vi') links.unshift({ label: 'Mazii', url: `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(lemma)}` });
    return links;
  },

  headword(token) {
    const t = token as JaToken;
    return { word: t.surface, reading: t.reading };
  },
};
