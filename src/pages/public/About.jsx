import { Link } from 'react-router-dom';
import { ArrowRight, Building2, HeartHandshake, Target, Users } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Footer from '@/components/layout/Footer';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';

const values = [
  { icon: Target, title: 'Built for the counter', text: 'Everything we ship starts from the reality of a Kenyan shop — busy, cash-tight and mobile-first.' },
  { icon: HeartHandshake, title: 'Trust first', text: 'We never fake payment confirmations, security or reports. If a number is on the screen, it is real.' },
  { icon: Users, title: 'For the whole team', text: 'Owners, managers and cashiers each get the tools they need — nothing they do not.' },
  { icon: Building2, title: 'Grows with you', text: 'From one till in Nakuru to a multi-branch operation in Nairobi, the same platform scales.' },
];

const stats = [
  { k: '2024', v: 'Founded' },
  { k: '47', v: 'Counties served' },
  { k: '12K+', v: 'Daily transactions' },
  { k: '99.9%', v: 'Uptime target' },
];

export default function About() {
  return (
    <>
      <PublicNav />

      <section className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="section-head">
            <Badge tone="primary">About Sokoni</Badge>
            <h1 className="section-title">We build tools for Kenyan retailers</h1>
            <p className="section-sub">
              Sokoni is a cloud POS and business management platform designed for
              mini-markets, supermarkets, boutiques and shops across Kenya.
              We exist to give small businesses the same clarity and control that
              large chains have had for decades.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="stat-band">
            {stats.map(s => (
              <div key={s.v} className="stat-cell">
                <div className="stat-k">{s.k}</div>
                <div className="stat-v muted">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Badge tone="info">What guides us</Badge>
            <h2 className="section-title">Our principles</h2>
          </div>
          <div className="feature-grid">
            {values.map(({ icon: Icon, title, text }) => (
              <Card key={title} padding="lg" className="feature-card">
                <div className="feature-icon"><Icon size={20} /></div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-text">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="cta-title">Join thousands of shop owners</h2>
              <p className="cta-sub">Try Sokoni free for 3 days — no card, no commitment.</p>
            </div>
            <Link to="/signup">
              <Button size="lg" rightIcon={<ArrowRight size={16} />}>Get started</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .stat-band {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
        }
        @media (max-width: 780px) { .stat-band { grid-template-columns: repeat(2, 1fr); } }
        .stat-cell { text-align: center; padding: 12px; }
        .stat-k {
          font-size: 34px; font-weight: 800; letter-spacing: -0.03em;
          font-family: var(--font-display);
          background: linear-gradient(135deg, #6d5efc, #22d3ee);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .stat-v { font-size: 13px; margin-top: 4px; font-weight: 500; }
      `}</style>
    </>
  );
}