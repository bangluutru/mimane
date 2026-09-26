import { NavLink, Outlet, Link } from 'react-router-dom';
import { BarChart3, BookOpen, Home, Layers, Plus, Settings } from 'lucide-react';
import { useT } from './i18n';
import { useProfile } from '@/domains/user/profile';
import { FLAG } from '@/ui/format';
import { TARGET_LANGS } from '@/languages/registry';
import type { TargetLang } from '@/languages/types';

function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 64 64"><path d="M8 38c7 0 7-14 14-14s7 14 14 14 7-14 14-14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg>
      </span>
      Mimane
    </Link>
  );
}

export function TargetSwitcher() {
  const t = useT();
  const { targetLanguage, supportLanguage, update } = useProfile();
  return (
    <div className="seg" role="radiogroup" aria-label={t('lang.learning')} style={{ flex: '0 0 auto' }}>
      {TARGET_LANGS.filter((l) => l !== supportLanguage || l === targetLanguage).map((l: TargetLang) => (
        <button key={l} role="radio" aria-checked={l === targetLanguage} className={l === targetLanguage ? 'on' : ''} onClick={() => update({ targetLanguage: l })} title={t(`lang.${l}`)}>
          {FLAG[l]} <span className="hide-sm">{t(`lang.${l}`)}</span>
        </button>
      ))}
    </div>
  );
}

export function Shell() {
  const t = useT();
  const items = [
    { to: '/', icon: Home, label: t('nav.home'), end: true },
    { to: '/library', icon: BookOpen, label: t('nav.library') },
    { to: '/review', icon: Layers, label: t('nav.review') },
    { to: '/progress', icon: BarChart3, label: t('nav.progress') },
  ];
  return (
    <div className="shell">
      <nav className="sidenav" aria-label="Main">
        <Brand />
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
        <NavLink to="/import">
          <Plus size={20} /> {t('nav.import')}
        </NavLink>
        <div className="spacer" />
        <NavLink to="/settings">
          <Settings size={20} /> {t('nav.settings')}
        </NavLink>
      </nav>
      <div className="shell-body">
        <header className="topbar">
          <Brand />
          <div className="spacer" />
          <TargetSwitcher />
          <Link to="/import" className="icon-btn hide-lg" aria-label={t('nav.import')}>
            <Plus size={20} />
          </Link>
          <Link to="/settings" className="icon-btn hide-lg" aria-label={t('nav.settings')}>
            <Settings size={20} />
          </Link>
        </header>
        <main className="shell-main">
          <Outlet />
        </main>
      </div>
      <nav className="tabbar" aria-label="Main">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
