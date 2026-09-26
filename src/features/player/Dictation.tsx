import { useEffect, useRef, useState } from 'react';
import { Check, Eye, RotateCcw, SkipForward } from 'lucide-react';
import { useT } from '@/app/i18n';
import type { Lesson } from '@/domains/lesson/types';
import type { StudyEngine } from '@/domains/study/engine';
import { accuracy, diffUnits, markAccentErrors, type DiffOp } from '@/domains/study/dictation';
import { getAdapter } from '@/languages/registry';
import { sentenceReading } from '@/languages/ja/adapter';
import type { JaAnalysis } from '@/languages/types';
import { countPractice, markPracticed } from '@/domains/progress/repo';

/** Dictation: hidden transcript → type → compare (transparent diff, no grade). */
export function Dictation({ lesson, engine, index }: { lesson: Lesson; engine?: StudyEngine; index: number }) {
  const t = useT();
  const [value, setValue] = useState('');
  const [result, setResult] = useState<{ ops: DiffOp[]; c: number; total: number }>();
  const [revealed, setRevealed] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const s = lesson.sentences[index];
  const adapter = getAdapter(lesson.targetLanguage);

  useEffect(() => {
    setValue('');
    setResult(undefined);
    setRevealed(false);
  }, [index]);

  const check = () => {
    const norm = adapter.normalizeForDictation;
    const actual = adapter.dictationUnits(norm(value));
    // Japanese: accept either the written form or the kana reading
    const variants = [s.text];
    if (lesson.targetLanguage === 'ja' && s.analysis) variants.push(sentenceReading(s.analysis as JaAnalysis));
    const best = variants
      .map((v) => {
        const raw = diffUnits(adapter.dictationUnits(norm(v)), actual);
        const ops = lesson.targetLanguage === 'ja' ? raw : markAccentErrors(raw);
        const a = accuracy(ops);
        return { ops, c: a.correct, total: a.total };
      })
      .sort((a, b) => b.c / Math.max(1, b.total) - a.c / Math.max(1, a.total))[0];
    setResult(best);
    countPractice(lesson.id, s.id, 'repeats');
    markPracticed(lesson.id, s.id, lesson.sentences.length);
  };

  const joiner = lesson.targetLanguage === 'ja' ? '' : ' ';
  return (
    <div className="dictation stack" style={{ gap: 8 }}>
      <textarea
        ref={input}
        className="input"
        style={{ minHeight: 72 }}
        lang={lesson.targetLanguage}
        placeholder={t('dictation.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            check();
          }
        }}
        aria-label={t('dictation.placeholder')}
      />
      <div className="row wrap" style={{ gap: 6 }}>
        <button className="btn sm primary" onClick={check} disabled={!value.trim()}>
          <Check size={16} /> {t('dictation.check')}
        </button>
        <button className="btn sm" onClick={() => engine?.replay()}>
          <RotateCcw size={14} /> {t('dictation.again')}
        </button>
        <button className="btn sm ghost" onClick={() => setRevealed(true)}>
          <Eye size={14} /> {t('dictation.reveal')}
        </button>
        <span className="spacer" />
        <button className="btn sm ghost" onClick={() => engine?.next()}>
          {t('dictation.next')} <SkipForward size={14} />
        </button>
      </div>
      {result && (
        <div aria-live="polite">
          <span className="badge accent">{t('dictation.result', { c: result.c, t: result.total })}</span>
          {result.ops.some((o) => o.type === 'accent') && <span className="badge warn" style={{ marginLeft: 6 }}>{t('dictation.accent')}</span>}
          <div className="diff" lang={lesson.targetLanguage}>
            {result.ops.map((o, i) => (
              <span key={i} className={o.type} title={o.type === 'ok' ? undefined : o.type === 'accent' ? `${o.typed} → ${o.unit}` : t(`dictation.${o.type}`)}>
                {o.unit}
                {joiner}
              </span>
            ))}
          </div>
        </div>
      )}
      {(revealed || result) && <p className="current-text" style={{ fontSize: '1.1rem' }} lang={lesson.targetLanguage}>{s.text}</p>}
      {!result && <p className="xs muted">{t('dictation.hint')}</p>}
    </div>
  );
}
