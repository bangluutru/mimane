import type { TargetLang } from '../types';
import type { LanguageUI } from './types';
import { jaUI } from './ja';
import { enUI } from './en';
import { viUI } from './vi';

const UIS: Record<TargetLang, LanguageUI> = { ja: jaUI, en: enUI, vi: viUI };
export const getLanguageUI = (lang: TargetLang): LanguageUI => UIS[lang];
