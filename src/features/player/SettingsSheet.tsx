import { useT } from '@/app/i18n';
import { useProfile } from '@/domains/user/profile';
import type { Lesson } from '@/domains/lesson/types';
import { getLanguageUI } from '@/languages/ui/registry';
import { levelLabel } from '@/languages/proficiency';
import { Sheet, Toggle } from '@/ui/Sheet';
import { RATES } from './Controls';

const GAPS = [0.8, 1, 1.2, 1.5, 2];
const LOOPS = [2, 3, 5, 0];

export function SettingsSheet({ lesson, onClose, onDelete }: { lesson: Lesson; onClose: () => void; onDelete?: () => void }) {
  const t = useT();
  const { display, setDisplay, study, setStudy } = useProfile();
  const UI = getLanguageUI(lesson.targetLanguage);
  return (
    <Sheet title={t('player.settings')} onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <Toggle label={t('player.showTranslation')} checked={display.showTranslation} onChange={(v) => setDisplay({ showTranslation: v })} />
        <Toggle label={t('player.showPronunciation')} checked={display.showPronunciation} onChange={(v) => setDisplay({ showPronunciation: v })} />
        {display.showPronunciation && <UI.DisplaySettings display={display} setDisplay={setDisplay} t={t} />}
        <Toggle label={t('player.hideSubtitle')} hint={`${t('mode.listen')} · ${t('mode.shadow')}`} checked={display.hideSubtitle} onChange={(v) => setDisplay({ hideSubtitle: v })} />
        <div className="divider" />
        <div className="field">
          <span>{t('player.speed')}</span>
          <div className="seg">
            {RATES.map((r) => (
              <button key={r} className={(study.rate ?? 1) === r ? 'on' : ''} onClick={() => setStudy({ rate: r })}>{r}×</button>
            ))}
          </div>
        </div>
        <Toggle label={t('player.autoPause')} hint={`${t('mode.listen')} · ${t('mode.read')} · ${t('mode.shadow')}`} checked={!!study.autoPause} onChange={(v) => setStudy({ autoPause: v })} />
        <div className="field" style={{ marginTop: 8 }}>
          <span>{t('player.repeatGap')} <span className="muted xs">({t('mode.repeat')})</span></span>
          <div className="seg">
            {GAPS.map((g) => (
              <button key={g} className={(study.repeatGapFactor ?? 1.2) === g ? 'on' : ''} onClick={() => setStudy({ repeatGapFactor: g })}>×{g}</button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <span>{t('player.loopCount')}</span>
          <div className="seg">
            {LOOPS.map((n) => (
              <button key={n} className={(study.loopCount ?? 0) === n ? 'on' : ''} onClick={() => setStudy({ loopCount: n })}>{n || t('player.infinite')}</button>
            ))}
          </div>
        </div>
        <p className="xs muted hide-touch" style={{ marginTop: 12 }}>{t('player.shortcuts')}</p>
        <div className="divider" />
        <div className="small muted stack" style={{ gap: 4 }}>
          {lesson.difficulty && <span>{levelLabel(lesson.difficulty)}{lesson.difficulty.estimated ? ' (est.)' : ''}{lesson.accent ? ` · ${t(`accent.${lesson.accent}`)}` : ''}</span>}
          {lesson.source.attribution && <span>{lesson.source.attribution}{lesson.source.license ? ` · ${lesson.source.license}` : ''}</span>}
          {lesson.source.synthetic && <span>{t('lesson.syntheticHint')}</span>}
        </div>
        {onDelete && (
          <button className="btn danger sm" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={onDelete}>
            {t('lesson.delete')}
          </button>
        )}
      </div>
    </Sheet>
  );
}
