import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, Volume2 } from 'lucide-react';
import { pick, useT } from '@/app/i18n';
import type { Lesson } from '@/domains/lesson/types';
import type { AnyToken, LexEntry } from '@/languages/types';
import { getAdapter } from '@/languages/registry';
import { getLanguageUI } from '@/languages/ui/registry';
import { useProfile } from '@/domains/user/profile';
import { getWord, removeWord, saveWord, wordId } from '@/domains/vocabulary/repo';
import { useLive } from '@/ui/hooks';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';

export function VocabSheet({ lesson, sentenceIndex, tokenIndex, onClose, onPlaySentence }: {
  lesson: Lesson;
  sentenceIndex: number;
  tokenIndex: number;
  onClose: () => void;
  onPlaySentence: () => void;
}) {
  const t = useT();
  const ui = useProfile((p) => p.supportLanguage);
  const sentence = lesson.sentences[sentenceIndex];
  const token = sentence.analysis?.tokens[tokenIndex] as AnyToken | undefined;
  const UI = getLanguageUI(lesson.targetLanguage);
  const [entry, setEntry] = useState<LexEntry | undefined>(() => (token?.lexKey ? lesson.glossary[token.lexKey] : undefined));
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!token) return;
    const local = token.lexKey ? lesson.glossary[token.lexKey] : undefined;
    setEntry(local);
    setCustom('');
    if (!local) getAdapter(lesson.targetLanguage).lookup?.(token).then((e) => e && setEntry(e)).catch(() => {});
  }, [token, lesson]);

  const lemma = token?.lemma ?? token?.surface ?? '';
  const id = wordId(lesson.targetLanguage, lemma);
  const saved = useLive(() => getWord(id), [id], ['vocab']);
  if (!token) return null;

  const head = UI.headword(token);
  const meaning = entry?.meanings[ui];
  const otherMeaning = !meaning ? Object.entries(entry?.meanings ?? {}).find(([l]) => l !== lesson.targetLanguage) : undefined;

  const toggleSave = async () => {
    if (saved) {
      await removeWord(id);
      return;
    }
    await saveWord({
      id,
      lang: lesson.targetLanguage,
      lemma,
      surface: token.surface,
      reading: entry?.reading ?? head.reading,
      meaning: meaning ?? (custom.trim() || otherMeaning?.[1]),
      entry,
      context: { lessonId: lesson.id, sentenceId: sentence.id, text: sentence.text },
    });
    toast(`${t('vocab.saved')}: ${lemma}`);
  };

  return (
    <Sheet onClose={onClose} label={head.word} title={
      <div className="vocab-head">
        <span className="w" lang={lesson.targetLanguage}>{head.word}</span>
        {head.reading && <span className="r" lang={lesson.targetLanguage}>{head.reading}</span>}
      </div>
    }>
      {meaning ? (
        <p className="meaning" lang={ui}>{meaning}</p>
      ) : otherMeaning ? (
        <p className="meaning" lang={otherMeaning[0]}>
          {otherMeaning[1]} <span className="badge">{otherMeaning[0].toUpperCase()}</span>
        </p>
      ) : (
        <p className="muted small" style={{ marginTop: 8 }}>{t('vocab.noMeaning')}</p>
      )}
      {entry?.note && pick(entry.note, ui) && <p className="small" style={{ marginTop: 6, color: 'var(--text-secondary)' }}>{pick(entry.note, ui)}</p>}

      <UI.VocabBody token={token} entry={entry} lesson={lesson} ui={ui} t={t} />

      {!meaning && !saved && (
        <input className="input" style={{ marginTop: 12 }} placeholder={t('vocab.yourMeaning')} value={custom} onChange={(e) => setCustom(e.target.value)} />
      )}

      <div className="row wrap" style={{ marginTop: 16 }}>
        <button className={`btn ${saved ? '' : 'primary'}`} onClick={toggleSave}>
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />} {saved ? t('vocab.saved') : t('vocab.save')}
        </button>
        <button className="btn ghost" onClick={onPlaySentence} aria-label={t('player.replay')}>
          <Volume2 size={18} />
        </button>
        <span className="spacer" />
        {UI.lookupLinks(lemma, ui).map((l) => (
          <a key={l.url} className="btn sm ghost" href={l.url} target="_blank" rel="noreferrer noopener">
            {l.label} <ExternalLink size={12} />
          </a>
        ))}
      </div>
    </Sheet>
  );
}
