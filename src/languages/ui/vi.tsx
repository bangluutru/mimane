import type { ViSyllable, ViToken } from '../types';
import type { LanguageUI } from './types';
import { Tokens } from './common';
import { Toggle } from '@/ui/Sheet';
import { TONES, VI_REGIONS, regionalNotes, type ViRegion } from '../vi/regional';
import { TONE_ORDER } from '../vi/syllable';
import { pick } from '@/app/i18n';

/** Render syllables of a token, coloured by tone. */
function Syllables({ t }: { t: ViToken }) {
  if (!t.syllables) return <>{t.surface}</>;
  const parts = t.surface.split(/(\s+)/);
  let k = 0;
  return (
    <>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) return p;
        const s = t.syllables![k++];
        return (
          <span key={i} className={s ? `vi-syl t-${s.tone}` : undefined}>
            {p}
          </span>
        );
      })}
    </>
  );
}

/** Tiny pitch-contour sketch from Chao numbers (e.g. "313", "3ʔ5"). */
export function Contour({ chao }: { chao: string }) {
  const pts = [...chao.replace('ʔ', '')].map(Number);
  const glottal = chao.includes('ʔ');
  const w = 44;
  const h = 22;
  const xy = pts.map((p, i) => [4 + (i * (w - 8)) / Math.max(1, pts.length - 1), h - 3 - ((p - 1) / 4) * (h - 6)]);
  return (
    <svg className="contour" viewBox={`0 0 ${w} ${h}`} aria-label={`tone contour ${chao}`}>
      <path d={`M${xy.map((p) => p.join(',')).join(' L')}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={glottal ? '5 3' : undefined} />
    </svg>
  );
}

function SyllableTable({ syllables, region, t }: { syllables: ViSyllable[]; region: ViRegion; t: (k: string) => string }) {
  return (
    <table className="syl-table tones">
      <thead>
        <tr>
          <th />
          <th>{t('vocab.initial')}</th>
          <th>{t('vocab.medial')}</th>
          <th>{t('vocab.nucleus')}</th>
          <th>{t('vocab.final')}</th>
          <th>{t('vocab.tone')}</th>
        </tr>
      </thead>
      <tbody>
        {syllables.map((s, i) => (
          <tr key={i}>
            <td className={`t-${s.tone}`} style={{ fontWeight: 650, fontSize: '1.1rem' }}>{s.text}</td>
            <td>{s.initial || '–'}</td>
            <td>{s.medial || '–'}</td>
            <td>{s.nucleus}</td>
            <td>{s.final || '–'}</td>
            <td className={`t-${s.tone}`}>
              <div className="row" style={{ gap: 4 }}>
                <Contour chao={TONES[s.tone].contour[region]} />
                <span>{t(`tone.${s.tone}`)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const viUI: LanguageUI = {
  SentenceView({ sentence, display, selected, onToken }) {
    const colors = display.showPronunciation && display.toneColors;
    return (
      <span lang="vi" className={colors ? 'tones' : undefined}>
        <Tokens sentence={sentence} selected={selected} onToken={onToken} render={(t) => (t.isWord ? <Syllables t={t as ViToken} /> : t.surface)} />
      </span>
    );
  },

  CurrentExtras({ display, t }) {
    if (!display.showPronunciation || !display.toneColors) return null;
    return (
      <div className="tone-legend tones" aria-label="tones">
        {TONE_ORDER.map((id) => (
          <span key={id} className={`t-${id}`}>
            <i />
            {TONES[id].mark} {t(`tone.${id}`)}
          </span>
        ))}
      </div>
    );
  },

  VocabBody({ token, entry, lesson, ui, t }) {
    const tk = token as ViToken;
    const region = (VI_REGIONS as string[]).includes(lesson.accent ?? '') ? (lesson.accent as ViRegion) : 'vi-north';
    const notes = tk.syllables ? dedupe(tk.syllables.flatMap((s) => regionalNotes(s, region))) : [];
    return (
      <>
        <dl className="kv">
          {(entry?.pos ?? tk.pos) && (
            <>
              <dt>{t('vocab.pos')}</dt>
              <dd>{t(`pos.${entry?.pos ?? tk.pos}`)}</dd>
            </>
          )}
          {entry?.regional &&
            Object.entries(entry.regional).map(([acc, form]) => (
              <span key={acc} style={{ display: 'contents' }}>
                <dt>{t(`accent.${acc}`)}</dt>
                <dd>{form}</dd>
              </span>
            ))}
        </dl>
        {tk.syllables && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <SyllableTable syllables={tk.syllables} region={region} t={t} />
            <p className="xs muted" style={{ marginTop: 6 }}>
              {tk.syllables.map((s) => `${s.text} — ${pick(TONES[s.tone].describe, ui)} (${TONES[s.tone].contour[region]})`).join(' · ')}
            </p>
          </div>
        )}
        {notes.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>{t('vocab.regional')} · {t(`accent.${region}`)}</summary>
            <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--ink-2)' }}>
              {notes.map((n, i) => (
                <li key={i}>{pick(n.text, ui)}</li>
              ))}
            </ul>
          </details>
        )}
      </>
    );
  },

  DisplaySettings({ display, setDisplay, t }) {
    return <Toggle label={t('player.toneColors')} checked={display.toneColors} onChange={(v) => setDisplay({ toneColors: v })} />;
  },

  lookupLinks(lemma, ui) {
    const w = encodeURIComponent(lemma);
    return [
      { label: 'Wiktionary', url: `https://${ui === 'ja' ? 'ja' : 'en'}.wiktionary.org/wiki/${w}` },
      { label: 'Glosbe', url: `https://glosbe.com/vi/${ui === 'ja' ? 'ja' : 'en'}/${w}` },
    ];
  },

  headword(token) {
    return { word: (token as ViToken).lemma ?? token.surface };
  },
};

function dedupe<T extends { text: { en?: string } }>(xs: T[]): T[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x.text.en ?? '') ? false : (seen.add(x.text.en ?? ''), true)));
}
