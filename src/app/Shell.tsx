import { NavLink, Outlet, Link } from 'react-router-dom';
import { BarChart3, BookOpen, Home, Layers, Plus, Settings } from 'lucide-react';
import { useT } from './i18n';
import { useProfile } from '@/domains/user/profile';
import { TARGET_LANGS } from '@/languages/registry';
import type { TargetLang } from '@/languages/types';
import { ByChotto, Wordmark, langCode } from '@/ui/brand';

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Mimane by Chotto">
      <Wordmark />
      <ByChotto />
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
          <span className="hide-sm">{t(`lang.${l}`)}</span>
          <span aria-hidden className="sm-only-code">{langCode(l)}</span>
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
          <NavLink key={to} to={to} end={end} className="nav">
            <Icon size={20} strokeWidth={2} /> <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/import" className="nav">
          <Plus size={20} strokeWidth={2} /> <span>{t('nav.import')}</span>
        </NavLink>
        <div className="spacer" />
        <NavLink to="/settings" className="nav">
          <Settings size={20} strokeWidth={2} /> <span>{t('nav.settings')}</span>
        </NavLink>
      </nav>
      <div className="shell-body">
        <header className="topbar">
          <Brand />
          <div className="spacer" />
          <TargetSwitcher />
          <Link to="/import" className="icon-btn hide-lg" aria-label={t('nav.import')}>
            <Plus size={22} />
          </Link>
          <Link to="/settings" className="icon-btn hide-lg" aria-label={t('nav.settings')}>
            <Settings size={22} />
          </Link>
        </header>
        <main className="shell-main">
          <Outlet />
        </main>
      </div>
      <nav className="tabbar" aria-label="Main">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
