import { Link } from 'react-router-dom';
import { useProfile } from '@/domains/user/profile';
import { CONTACT_EMAIL, LEGAL } from './legal';

/** About · Privacy · Terms · Contact, used at the bottom of the shell and legal pages. */
export function LegalLinks() {
  const lang = useProfile((p) => p.supportLanguage);
  const n = LEGAL[lang].nav;
  return (
    <nav className="muted" aria-label={n.about} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13, marginTop: 40 }}>
      <Link to="/about">{n.about}</Link>
      <Link to="/privacy">{n.privacy}</Link>
      <Link to="/terms">{n.terms}</Link>
      <a href={`mailto:${CONTACT_EMAIL}`}>{n.contact}</a>
    </nav>
  );
}
