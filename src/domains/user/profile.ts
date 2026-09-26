import { create } from 'zustand';
import type { SupportLang, TargetLang } from '@/languages/types';
import type { CategoryId } from '@/domains/library/taxonomy';
import type { StudySettings } from '@/domains/study/engine';

export type FuriganaMode = 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'rare' | 'off';

export interface DisplayPrefs {
  showTranslation: boolean;
  showPronunciation: boolean; // furigana / IPA / tone aid master switch
  furigana: FuriganaMode;
  showIpa: boolean; // en: IPA line under the current sentence
  showLinking: boolean; // en: connected-speech marks
  toneColors: boolean; // vi: colour syllables by tone
  hideSubtitle: boolean; // listen / shadow: hide the current sentence text
}

export interface TranscriptionPrefs {
  /** local faster-whisper server (tools/transcriber) */
  serverUrl: string;
  quality: 'accurate' | 'fast';
}

export interface LearnerProfile {
  onboarded: boolean;
  /** UI + translation language */
  supportLanguage: SupportLang;
  targetLanguage: TargetLang;
  /** current level per target language (framework level id) */
  levels: Partial<Record<TargetLang, string>>;
  interests: CategoryId[];
  display: DisplayPrefs;
  study: Partial<StudySettings>;
  transcription: TranscriptionPrefs;
}

const DEFAULT_PROFILE: LearnerProfile = {
  onboarded: false,
  supportLanguage: 'vi',
  targetLanguage: 'ja',
  levels: { ja: 'N5', en: 'B1', vi: 'beginner' },
  interests: [],
  display: {
    showTranslation: true,
    showPronunciation: true,
    furigana: 'N4',
    showIpa: true,
    showLinking: true,
    toneColors: true,
    hideSubtitle: false,
  },
  study: { rate: 1, repeatGapFactor: 1.2 },
  transcription: { serverUrl: 'http://127.0.0.1:8778', quality: 'accurate' },
};

const KEY = 'mimane.profile.v1';

function load(): LearnerProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<LearnerProfile>;
      return {
        ...DEFAULT_PROFILE,
        ...p,
        display: { ...DEFAULT_PROFILE.display, ...p.display },
        study: { ...DEFAULT_PROFILE.study, ...p.study },
        transcription: { ...DEFAULT_PROFILE.transcription, ...p.transcription },
      };
    }
  } catch {
    /* storage unavailable: use defaults */
  }
  // chottoday.com links sister apps with ?lang=vi (see its src/data/apps.js)
  const fromUrl = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  const nav = fromUrl ?? (typeof navigator !== 'undefined' ? navigator.language : 'vi');
  const supportLanguage: SupportLang = nav.startsWith('ja') ? 'ja' : nav.startsWith('en') ? 'en' : 'vi';
  return { ...DEFAULT_PROFILE, supportLanguage, targetLanguage: supportLanguage === 'vi' ? 'ja' : 'vi' };
}

interface ProfileStore extends LearnerProfile {
  update(patch: Partial<LearnerProfile>): void;
  setDisplay(patch: Partial<DisplayPrefs>): void;
  setStudy(patch: Partial<StudySettings>): void;
  reset(): void;
}

export const useProfile = create<ProfileStore>((set, get) => {
  const persist = () => {
    const { update: _u, setDisplay: _d, setStudy: _s, reset: _r, ...data } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  };
  return {
    ...load(),
    update(patch) {
      set(patch);
      persist();
    },
    setDisplay(patch) {
      set({ display: { ...get().display, ...patch } });
      persist();
    },
    setStudy(patch) {
      set({ study: { ...get().study, ...patch } });
      persist();
    },
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      set(load());
    },
  };
});

/** Support language used for translations of a lesson in a given target language. */
export function translationLang(support: SupportLang, target: TargetLang, available: SupportLang[]): SupportLang | undefined {
  if (support !== target && available.includes(support)) return support;
  return available.find((l) => l !== target);
}
