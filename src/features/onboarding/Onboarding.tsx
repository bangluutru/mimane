import { useState } from 'react';
import { useProfile, type FuriganaMode } from '@/domains/user/profile';
import { makeT } from '@/app/i18n';
import { CATEGORIES, type CategoryId } from '@/domains/library/taxonomy';
import { FRAMEWORKS, FRAMEWORK_FOR } from '@/languages/proficiency';
import type { SupportLang, TargetLang } from '@/languages/types';
import { FLAG } from '@/ui/format';
import { pick } from '@/app/i18n';

const SPEAK: { id: SupportLang; label: string }[] = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
];

/** Default furigana: show words above the learner's level. */
export function furiganaFor(level: string): FuriganaMode {
  const map: Record<string, FuriganaMode> = { beginner: 'all', N5: 'N4', N4: 'N3', N3: 'N2', N2: 'rare', N1: 'rare', native: 'off' };
  return map[level] ?? 'N4';
}

export function Onboarding() {
  const profile = useProfile();
  const [step, setStep] = useState(0);
  const [speak, setSpeak] = useState<SupportLang>(profile.supportLanguage);
  const [learn, setLearn] = useState<TargetLang>(profile.targetLanguage === speak ? (speak === 'vi' ? 'ja' : 'vi') : profile.targetLanguage);
  const [level, setLevel] = useState<string>(profile.levels[learn] ?? FRAMEWORKS[FRAMEWORK_FOR[learn]].levels[1].id);
  const [interests, setInterests] = useState<CategoryId[]>(profile.interests);
  const t = makeT(speak);

  const chooseSpeak = (s: SupportLang) => {
    setSpeak(s);
    if (learn === s) setLearn(s === 'vi' ? 'ja' : 'vi');
  };
  const chooseLearn = (l: TargetLang) => {
    setLearn(l);
    setLevel(profile.levels[l] ?? FRAMEWORKS[FRAMEWORK_FOR[l]].levels[1].id);
  };

  const finish = () => {
    profile.update({
      onboarded: true,
      supportLanguage: speak,
      targetLanguage: learn,
      levels: { ...profile.levels, [learn]: level },
      interests,
      display: { ...profile.display, furigana: learn === 'ja' ? furiganaFor(level) : profile.display.furigana },
    });
  };

  return (
    <div className="onboard" lang={speak}>
      <div className="row" style={{ marginBottom: 28 }}>
        <span className="brand-mark" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 64 64"><path d="M8 38c7 0 7-14 14-14s7 14 14 14 7-14 14-14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg>
        </span>
        <strong>Mimane</strong>
        <span className="muted small">· {t('app.tagline')}</span>
      </div>

      {step === 0 && (
        <div className="stack" style={{ gap: 24 }}>
          <div className="stack" style={{ gap: 8 }}>
            <h1>{t('onboarding.welcome')}</h1>
            <p className="muted">{t('onboarding.intro')}</p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <h2>{t('lang.speak')}</h2>
            <div className="pair-grid">
              {SPEAK.map((s) => (
                <button key={s.id} className={`choice${speak === s.id ? ' on' : ''}`} onClick={() => chooseSpeak(s.id)} aria-pressed={speak === s.id}>
                  <span className="flag">{FLAG[s.id]}</span> {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <h2>{t('lang.learn')}</h2>
            <div className="pair-grid">
              {(['ja', 'en', 'vi'] as TargetLang[]).filter((l) => l !== speak).map((l) => (
                <button key={l} className={`choice${learn === l ? ' on' : ''}`} onClick={() => chooseLearn(l)} aria-pressed={learn === l}>
                  <span className="flag">{FLAG[l]}</span> {t(`lang.${l}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack" style={{ gap: 16 }}>
          <h1>{t('onboarding.level')}</h1>
          <p className="muted">{FLAG[learn]} {t(`lang.${learn}`)}</p>
          <div className="pair-grid">
            {FRAMEWORKS[FRAMEWORK_FOR[learn]].levels.filter((l) => l.id !== 'native').map((l) => (
              <button key={l.id} className={`choice${level === l.id ? ' on' : ''}`} onClick={() => setLevel(l.id)} aria-pressed={level === l.id}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 16 }}>
          <h1>{t('onboarding.interests')}</h1>
          <div className="topic-grid">
            {CATEGORIES.filter((c) => c.id !== 'other').map((c) => {
              const on = interests.includes(c.id);
              return (
                <button key={c.id} className={`topic${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setInterests(on ? interests.filter((x) => x !== c.id) : [...interests, c.id])}>
                  <span className="ico" aria-hidden>{c.icon}</span>
                  {pick(c.label, speak)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="onboard-foot">
        {step > 0 && (
          <button className="btn" onClick={() => setStep(step - 1)}>
            {t('onboarding.back')}
          </button>
        )}
        {step < 2 ? (
          <button className="btn primary" style={{ minWidth: 160 }} onClick={() => setStep(step + 1)}>
            {t('onboarding.next')}
          </button>
        ) : (
          <button className="btn primary" style={{ minWidth: 160 }} onClick={finish}>
            {t('onboarding.start')}
          </button>
        )}
      </div>
    </div>
  );
}
