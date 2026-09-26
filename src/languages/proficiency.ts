import type { FrameworkId, ProficiencyRef, TargetLang } from './types';

export interface ProficiencyFramework {
  id: FrameworkId;
  /** ordered easy → hard */
  levels: { id: string; label: string; short: string }[];
}

export const FRAMEWORKS: Record<FrameworkId, ProficiencyFramework> = {
  jlpt: {
    id: 'jlpt',
    levels: [
      { id: 'beginner', label: 'Beginner', short: 'Beg' },
      { id: 'N5', label: 'JLPT N5', short: 'N5' },
      { id: 'N4', label: 'JLPT N4', short: 'N4' },
      { id: 'N3', label: 'JLPT N3', short: 'N3' },
      { id: 'N2', label: 'JLPT N2', short: 'N2' },
      { id: 'N1', label: 'JLPT N1', short: 'N1' },
      { id: 'native', label: 'Native', short: 'Native' },
    ],
  },
  cefr: {
    id: 'cefr',
    levels: [
      { id: 'A1', label: 'A1', short: 'A1' },
      { id: 'A2', label: 'A2', short: 'A2' },
      { id: 'B1', label: 'B1', short: 'B1' },
      { id: 'B2', label: 'B2', short: 'B2' },
      { id: 'C1', label: 'C1', short: 'C1' },
      { id: 'C2', label: 'C2', short: 'C2' },
      { id: 'native', label: 'Native', short: 'Native' },
    ],
  },
  'vi-level': {
    id: 'vi-level',
    levels: [
      { id: 'beginner', label: 'Beginner', short: 'Beg' },
      { id: 'elementary', label: 'Elementary', short: 'Elem' },
      { id: 'intermediate', label: 'Intermediate', short: 'Int' },
      { id: 'upper-intermediate', label: 'Upper Intermediate', short: 'Up-Int' },
      { id: 'advanced', label: 'Advanced', short: 'Adv' },
      { id: 'native', label: 'Native', short: 'Native' },
    ],
  },
};

export const FRAMEWORK_FOR: Record<TargetLang, FrameworkId> = { ja: 'jlpt', en: 'cefr', vi: 'vi-level' };

export function levelRank(ref: Pick<ProficiencyRef, 'framework' | 'level'>): number {
  const i = FRAMEWORKS[ref.framework]?.levels.findIndex((l) => l.id === ref.level) ?? -1;
  return i < 0 ? 0 : i;
}

export function levelLabel(ref: Pick<ProficiencyRef, 'framework' | 'level'>, short = false): string {
  const l = FRAMEWORKS[ref.framework]?.levels.find((x) => x.id === ref.level);
  return l ? (short ? l.short : l.label) : ref.level;
}

/** Levels shown in "Explore level" (skip 'native' / 'beginner' noise for JLPT). */
export function exploreLevels(lang: TargetLang) {
  const fw = FRAMEWORKS[FRAMEWORK_FOR[lang]];
  return fw.levels.filter((l) => l.id !== 'native' && !(fw.id === 'jlpt' && l.id === 'beginner'));
}
