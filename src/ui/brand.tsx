import type { ComponentType } from 'react';
import {
  ArrowRight, Briefcase, Clapperboard, Coffee, Cpu, FlaskConical, GraduationCap, Home, Landmark, Leaf, Lightbulb,
  Music, Newspaper, Palette, Plane, ScrollText, Sparkles, Stethoscope, Trophy, Users, UtensilsCrossed, type LucideProps,
} from 'lucide-react';
import type { CategoryId } from '@/domains/library/taxonomy';
import type { TargetLang } from '@/languages/types';
import { useT } from '@/app/i18n';

const base = import.meta.env.BASE_URL;

/**
 * Brand pieces for Mimane as a Chotto app (chottoday design system):
 * the outlined "Mimane · Soi sóng" wordmark + "by Chotto" lockup using the
 * official Chotto logo file, never retyped in another font.
 * The wordmark's M is as tall as the Chotto logo (23.18px at 110px wide);
 * its wave hangs below the line. Files: public/brand/mimane-logo*.svg.
 */
const WORDMARK = { width: 116, height: 37.45 };

export function Wordmark() {
  return (
    <span className="wordmark">
      <img className="logo-light" src={`${base}brand/mimane-logo.svg`} alt="Mimane" {...WORDMARK} />
      <img className="logo-dark" src={`${base}brand/mimane-logo-white.svg`} alt="Mimane" {...WORDMARK} />
    </span>
  );
}

export function ChottoLogo({ width = 110 }: { width?: number }) {
  return (
    <>
      <img className="logo-light" src={`${base}brand/chotto-logo-full.svg`} alt="Chotto" width={width} height={Math.round((width * 113.692) / 539.407)} />
      <img className="logo-dark" src={`${base}brand/chotto-logo-white.svg`} alt="Chotto" width={width} height={Math.round((width * 113.692) / 539.407)} />
    </>
  );
}

export function ByChotto() {
  return (
    <span className="by-chotto">
      by <ChottoLogo />
    </span>
  );
}

/** Link back to chottoday.com — the Chotto mint band (its only gradient). */
export function ChottoBand() {
  const t = useT();
  return (
    <a className="mint-band" href="https://chottoday.com/" target="_blank" rel="noopener">
      <ChottoLogo />
      <span className="t">
        {t('brand.band')}
        <small>{t('brand.bandSub')}</small>
      </span>
      <ArrowRight size={18} aria-hidden />
    </a>
  );
}

const LANG_CODE: Record<string, string> = { ja: 'JA', en: 'EN', vi: 'VI' };
export const langCode = (l: string) => LANG_CODE[l] ?? l.toUpperCase();

/** Language marker — text, not a flag emoji (Chotto: no emoji as icons). */
export function LangMark({ lang }: { lang: TargetLang | string }) {
  return (
    <span className="lang-mark" lang="en" aria-hidden>
      {langCode(lang)}
    </span>
  );
}

const TOPIC_ICONS: Record<CategoryId, ComponentType<LucideProps>> = {
  'daily-life': Home,
  travel: Plane,
  'work-business': Briefcase,
  science: FlaskConical,
  technology: Cpu,
  health: Stethoscope,
  nature: Leaf,
  culture: Landmark,
  history: ScrollText,
  art: Palette,
  music: Music,
  entertainment: Clapperboard,
  food: UtensilsCrossed,
  education: GraduationCap,
  sports: Trophy,
  family: Users,
  'news-society': Newspaper,
  philosophy: Lightbulb,
  lifestyle: Coffee,
  other: Sparkles,
};

/** Stroke icon for a topic: Ink, 2px, rounded — the site's small UI icon style. */
export function TopicIcon({ id, size = 22 }: { id: CategoryId; size?: number }) {
  const Icon = TOPIC_ICONS[id] ?? Sparkles;
  return <Icon size={size} strokeWidth={2} aria-hidden />;
}

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * Lesson cover: the "một chút" motif (hollow rings + dots) in the app colour,
 * deterministic per lesson, no text — like Chotto's article covers.
 */
export function CoverArt({ id }: { id: string }) {
  const h = hash(id);
  const r = (n: number, min: number, max: number) => min + ((h >>> n) % (max - min + 1));
  const dark = (h & 3) === 0; // one in four covers on Ink for rhythm
  const ringX = r(3, 58, 92);
  const ringY = r(7, 18, 82);
  const ring = r(11, 26, 40);
  return (
    <svg className="art" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="160" height="100" fill={dark ? 'var(--chotto-ink)' : 'var(--accent-bg)'} />
      <circle cx={ringX * 1.6} cy={ringY} r={ring} fill="none" stroke={dark ? '#6741c4' : 'var(--accent-border)'} strokeWidth="9" />
      <circle cx={r(15, 20, 70) * 1.6} cy={r(19, 60, 92)} r={r(21, 10, 16)} fill="none" stroke={dark ? '#33405c' : 'var(--surface-card)'} strokeWidth="5" />
      <circle cx={r(23, 40, 150)} cy={r(25, 14, 40)} r="4" fill={dark ? 'var(--chotto-paper)' : 'var(--chotto-ink)'} />
      <circle cx={r(27, 100, 150)} cy={r(29, 60, 90)} r="6" fill="var(--chotto-violet)" />
    </svg>
  );
}
