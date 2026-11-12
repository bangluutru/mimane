import { Link } from 'react-router-dom';
import { useProfile } from '@/domains/user/profile';
import { ByChotto, Wordmark } from '@/ui/brand';
import { LEGAL, type LegalKind } from './legal';
import { LegalLinks } from './LegalLinks';

/** Reachable before onboarding too, so it carries its own header instead of the app shell. */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const lang = useProfile((p) => p.supportLanguage);
  const { docs, updated } = LEGAL[lang];
  const d = docs[kind];
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 48px' }}>
      <Link to="/" className="brand" aria-label="Mimane by Chotto">
        <Wordmark />
        <ByChotto />
      </Link>
      <article className="stack" style={{ gap: 12, marginTop: 28 }}>
        <h1>{d.title}</h1>
        <p className="muted">{updated}</p>
        <p>{d.intro}</p>
        {d.sections.map((s) => (
          <section key={s.h} className="stack" style={{ gap: 6, marginTop: 8 }}>
            <h2 style={{ fontSize: 18 }}>{s.h}</h2>
            {s.p.map((line) => <p key={line}>{line}</p>)}
          </section>
        ))}
      </article>
      <LegalLinks />
    </div>
  );
}
