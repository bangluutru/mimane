import { useT, pick } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import { CATEGORIES } from '@/domains/library/taxonomy';
import { FRAMEWORKS, FRAMEWORK_FOR } from '@/languages/proficiency';
import { TARGET_LANGS } from '@/languages/registry';
import { getLanguageUI } from '@/languages/ui/registry';
import type { SupportLang } from '@/languages/types';
import { deleteAllRecordings } from '@/domains/recording/repo';
import { db } from '@/domains/storage/db';
import { Toggle } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { FLAG } from '@/ui/format';

const SPEAK: { id: SupportLang; label: string }[] = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
];

export default function SettingsPage() {
  const t = useT();
  const p = useProfile();
  const UI = getLanguageUI(p.targetLanguage);

  const resetAll = async () => {
    if (!confirm(t('settings.deleteAllConfirm'))) return;
    const d = await db();
    await Promise.all((['lessonProgress', 'sentenceMarks', 'recordings', 'vocab', 'userLessons', 'blobs'] as const).map((s) => d.clear(s)));
    p.reset();
    location.href = import.meta.env.BASE_URL;
  };

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720 }}>
      <h1>{t('settings.title')}</h1>

      <section className="panel stack">
        <h2>{t('settings.profile')}</h2>
        <div className="field">
          <span>{t('lang.speak')}</span>
          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            {SPEAK.map((s) => (
              <button key={s.id} className={p.supportLanguage === s.id ? 'on' : ''} onClick={() => p.update({ supportLanguage: s.id, targetLanguage: p.targetLanguage === s.id ? (s.id === 'vi' ? 'ja' : 'vi') : p.targetLanguage })}>
                {FLAG[s.id]} {s.label}
              </button>
            ))}
          </div>
          <span className="xs muted" style={{ fontWeight: 400 }}>{t('settings.uiLanguage')}</span>
        </div>
        {TARGET_LANGS.filter((l) => l !== p.supportLanguage).map((l) => (
          <label key={l} className="field">
            <span>{FLAG[l]} {t(`lang.${l}`)} · {t('onboarding.level')}</span>
            <select className="input" value={p.levels[l] ?? ''} onChange={(e) => p.update({ levels: { ...p.levels, [l]: e.target.value } })}>
              {FRAMEWORKS[FRAMEWORK_FOR[l]].levels.map((lv) => <option key={lv.id} value={lv.id}>{lv.label}</option>)}
            </select>
          </label>
        ))}
        <div className="field">
          <span>{t('onboarding.interests')}</span>
          <div className="row wrap">
            {CATEGORIES.filter((c) => c.id !== 'other').map((c) => {
              const on = p.interests.includes(c.id);
              return (
                <button key={c.id} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => p.update({ interests: on ? p.interests.filter((x) => x !== c.id) : [...p.interests, c.id] })}>
                  {c.icon} {pick(c.label, p.supportLanguage)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t('settings.display')}</h2>
        <Toggle label={t('player.showTranslation')} checked={p.display.showTranslation} onChange={(v) => p.setDisplay({ showTranslation: v })} />
        <Toggle label={t('player.showPronunciation')} checked={p.display.showPronunciation} onChange={(v) => p.setDisplay({ showPronunciation: v })} />
        <p className="small muted" style={{ marginTop: 8 }}>{FLAG[p.targetLanguage]} {t(`lang.${p.targetLanguage}`)}</p>
        <UI.DisplaySettings display={p.display} setDisplay={p.setDisplay} t={t} />
      </section>

      <section className="panel stack">
        <h2>{t('settings.privacy')}</h2>
        <p className="small">{t('settings.privacyText')}</p>
        <div className="row wrap">
          <button className="btn sm" onClick={async () => { if (confirm(t('review.deleteAllConfirm'))) { await deleteAllRecordings(); toast('✓'); } }}>{t('settings.deleteRecordings')}</button>
          <button className="btn sm danger" onClick={resetAll}>{t('settings.deleteAll')}</button>
        </div>
      </section>

      <section className="panel stack">
        <h2>{t('settings.about')}</h2>
        <p className="small muted">{t('settings.credits')}</p>
      </section>
    </div>
  );
}
