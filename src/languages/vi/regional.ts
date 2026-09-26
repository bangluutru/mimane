import type { AccentId, Localized, ViSyllable, ViToneId } from '../types';

/**
 * Regional pronunciation knowledge. These are *variants*, not errors: the app
 * shows the realisation for the lesson's accent and mentions the others.
 */

export type ViRegion = 'vi-north' | 'vi-central' | 'vi-south';
export const VI_REGIONS: ViRegion[] = ['vi-north', 'vi-central', 'vi-south'];

export interface ToneInfo {
  id: ViToneId;
  vi: string; // tên thanh
  mark: string; // example diacritic on "a"
  /** Chao tone numbers (1 low – 5 high) per region */
  contour: Record<ViRegion, string>;
  describe: Localized;
}

export const TONES: Record<ViToneId, ToneInfo> = {
  ngang: {
    id: 'ngang', vi: 'ngang', mark: 'a',
    contour: { 'vi-north': '33', 'vi-central': '35', 'vi-south': '33' },
    describe: { en: 'level, mid', ja: '平らな中音', vi: 'ngang, giọng trung' },
  },
  huyen: {
    id: 'huyen', vi: 'huyền', mark: 'à',
    contour: { 'vi-north': '21', 'vi-central': '33', 'vi-south': '21' },
    describe: { en: 'low, gently falling', ja: '低く下がる', vi: 'thấp, đi xuống nhẹ' },
  },
  sac: {
    id: 'sac', vi: 'sắc', mark: 'á',
    contour: { 'vi-north': '35', 'vi-central': '13', 'vi-south': '35' },
    describe: { en: 'high, rising', ja: '高く上がる', vi: 'cao, đi lên' },
  },
  hoi: {
    id: 'hoi', vi: 'hỏi', mark: 'ả',
    contour: { 'vi-north': '313', 'vi-central': '31', 'vi-south': '214' },
    describe: { en: 'dipping: falls then rises', ja: '下がってから上がる', vi: 'xuống rồi lên' },
  },
  nga: {
    id: 'nga', vi: 'ngã', mark: 'ã',
    contour: { 'vi-north': '3ʔ5', 'vi-central': '31', 'vi-south': '214' },
    describe: {
      en: 'rising with a glottal break (North)',
      ja: '声門の閉鎖を伴って上がる（北部）',
      vi: 'đi lên, có ngắt thanh hầu (Bắc)',
    },
  },
  nang: {
    id: 'nang', vi: 'nặng', mark: 'ạ',
    contour: { 'vi-north': '21ʔ', 'vi-central': '31', 'vi-south': '212' },
    describe: { en: 'low, short, glottalised', ja: '低く短く、喉を締める', vi: 'thấp, ngắn, nặng' },
  },
};

export interface RegionalNote {
  feature: 'initial' | 'final' | 'tone';
  text: Localized;
}

/** Notes that apply to this syllable, relative to the lesson accent. */
export function regionalNotes(s: ViSyllable, accent: AccentId = 'vi-north'): RegionalNote[] {
  const notes: RegionalNote[] = [];
  const south = accent === 'vi-south';
  if (s.initial === 'd' || s.initial === 'gi') {
    notes.push({
      feature: 'initial',
      text: {
        en: `“${s.initial}” sounds like /z/ in the North, /j/ (like English “y”) in the Centre & South.`,
        ja: `「${s.initial}」は北部で /z/、中部・南部で /j/（ヤ行に近い）。`,
        vi: `“${s.initial}” đọc /z/ ở miền Bắc, /j/ ở miền Trung và Nam.`,
      },
    });
  }
  if (s.initial === 'r') {
    notes.push({
      feature: 'initial',
      text: {
        en: '“r” is /z/ in Hanoi speech; many Central & Southern speakers use an r-like sound.',
        ja: '「r」はハノイでは /z/、中部・南部では r に近い音が多い。',
        vi: '“r” đọc /z/ ở Hà Nội; miền Trung và Nam thường phát âm gần /r/.',
      },
    });
  }
  if (s.initial === 'tr' || s.initial === 'ch') {
    notes.push({
      feature: 'initial',
      text: {
        en: 'North: “tr” and “ch” sound the same. Centre & South: “tr” is retroflex (tongue curled back).',
        ja: '北部では「tr」と「ch」は同じ音。中部・南部では「tr」は反り舌音。',
        vi: 'Miền Bắc: “tr” và “ch” đọc giống nhau. Miền Trung, Nam: “tr” uốn lưỡi.',
      },
    });
  }
  if (s.initial === 's' || s.initial === 'x') {
    notes.push({
      feature: 'initial',
      text: {
        en: 'North: “s” and “x” are both /s/. Many Southern speakers make “s” retroflex.',
        ja: '北部では「s」と「x」はどちらも /s/。南部では「s」を反り舌で発音する人が多い。',
        vi: 'Miền Bắc: “s” và “x” đều là /s/. Nhiều người miền Nam đọc “s” uốn lưỡi.',
      },
    });
  }
  if (s.initial === 'v' && south) {
    notes.push({
      feature: 'initial',
      text: { en: 'Southern speakers often say “v” as /j/.', ja: '南部では「v」を /j/ で発音することが多い。', vi: 'Miền Nam thường đọc “v” thành /j/.' },
    });
  }
  if (['n', 'ng', 't', 'c', 'nh', 'ch'].includes(s.final)) {
    notes.push({
      feature: 'final',
      text: {
        en: 'In the South, final -n/-ng and -t/-c often merge (bạn ≈ “bạng”); -nh/-ch move toward -n/-t.',
        ja: '南部では語末の -n/-ng、-t/-c が合流しやすい（bạn ≈ bạng）。',
        vi: 'Miền Nam thường không phân biệt âm cuối -n/-ng, -t/-c (bạn ≈ “bạng”).',
      },
    });
  }
  if (s.tone === 'hoi' || s.tone === 'nga') {
    notes.push({
      feature: 'tone',
      text: {
        en: 'Hỏi and ngã are distinct in the North but merge into one dipping-rising tone in the South.',
        ja: '北部では hỏi と ngã は別の声調だが、南部では同じ声調になる。',
        vi: 'Thanh hỏi và ngã phân biệt ở miền Bắc, nhưng gần như trùng nhau ở miền Nam.',
      },
    });
  }
  return notes;
}
