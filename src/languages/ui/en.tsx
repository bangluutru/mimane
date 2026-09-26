import type { EnToken } from '../types';
import type { LanguageUI } from './types';
import { Tokens } from './common';
import { Toggle } from '@/ui/Sheet';

export const enUI: LanguageUI = {
  SentenceView({ sentence, variant, display, selected, onToken }) {
    const aids = display.showPronunciation;
    const ipa = aids && display.showIpa && variant === 'current';
    const linking = aids && display.showLinking && variant === 'current';
    const tokens = (sentence.analysis?.tokens ?? []) as EnToken[];
    return (
      <span lang="en">
        <Tokens
          sentence={sentence}
          selected={selected}
          onToken={onToken}
          render={(t, i) => {
            const tk = t as EnToken;
            const prev = tokens[i - 1];
            // Space between two linked words → linking mark
            if (!tk.isWord && linking && /^ $/.test(tk.surface) && prev?.linksToNext) return <span className="link-mark" aria-hidden>‿</span>;
            if (!tk.isWord) return tk.surface;
            const cls = tk.phraseKey && variant === 'current' ? 'phrase' : undefined;
            if (!ipa || !tk.ipa) return <span className={cls}>{tk.surface}</span>;
            const shown = linking && tk.weakForm ? tk.weakForm : tk.ipa;
            return (
              <span className="en-word">
                <span className={cls}>{tk.surface}</span>
                <span className={`ipa${linking && tk.weakForm ? ' weak' : ''}`}>{shown}</span>
              </span>
            );
          }}
        />
      </span>
    );
  },

  VocabBody({ token, entry, lesson, t }) {
    const tk = token as EnToken;
    const phrase = tk.phraseKey ? lesson.glossary[tk.phraseKey] : undefined;
    return (
      <>
        <dl className="kv">
          {tk.ipa && (
            <>
              <dt>IPA</dt>
              <dd>
                /{tk.ipa}/
                {tk.syllables && tk.syllables > 1 && tk.stressIndex !== undefined && tk.stressIndex >= 0 && (
                  <span className="muted small"> · {t('vocab.stressOn', { n: tk.stressIndex + 1 })}</span>
                )}
              </dd>
            </>
          )}
          {tk.lemma && tk.lemma !== tk.surface.toLowerCase() && (
            <>
              <dt>{t('vocab.lemma')}</dt>
              <dd>{tk.lemma}</dd>
            </>
          )}
          {(entry?.pos ?? tk.pos) && (
            <>
              <dt>{t('vocab.pos')}</dt>
              <dd>{t(`pos.${entry?.pos ?? tk.pos}`)}</dd>
            </>
          )}
          {entry?.level && (
            <>
              <dt>{t('vocab.level')}</dt>
              <dd>CEFR {entry.level.level}</dd>
            </>
          )}
        </dl>
        {(tk.weakForm || tk.linksToNext) && (
          <p className="muted small" style={{ marginTop: 10 }}>
            {tk.weakForm && t('vocab.weak', { f: tk.weakForm })}
            {tk.weakForm && tk.linksToNext && ' · '}
            {tk.linksToNext && t('vocab.links')}
          </p>
        )}
        {phrase && (
          <div className="note-box">
            <strong>{t('vocab.phrase')}: {phrase.lemma}</strong>
            <div>{Object.values(phrase.meanings)[0]}</div>
          </div>
        )}
      </>
    );
  },

  DisplaySettings({ display, setDisplay, t }) {
    return (
      <>
        <Toggle label={t('player.ipa')} checked={display.showIpa} onChange={(v) => setDisplay({ showIpa: v })} />
        <Toggle label={t('player.linking')} checked={display.showLinking} onChange={(v) => setDisplay({ showLinking: v })} />
      </>
    );
  },

  lookupLinks(lemma, ui) {
    const w = encodeURIComponent(lemma);
    const links = [{ label: 'Cambridge', url: `https://dictionary.cambridge.org/dictionary/english/${w}` }];
    if (ui === 'vi') links.unshift({ label: 'Cambridge EN–VI', url: `https://dictionary.cambridge.org/dictionary/english-vietnamese/${w}` });
    if (ui === 'ja') links.unshift({ label: 'Weblio', url: `https://ejje.weblio.jp/content/${w}` });
    return links;
  },

  headword(token) {
    const t = token as EnToken;
    return { word: t.lemma ?? t.surface, reading: t.ipa ? `/${t.ipa}/` : undefined };
  },
};
