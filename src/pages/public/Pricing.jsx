import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Footer from '@/components/layout/Footer';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { PLANS, FEATURE_MATRIX, ANNUAL_DISCOUNT } from '@/config/plans';
import './Pricing.css';

const FAQS = [
  {
    q: 'How does the free trial work?',
    a: 'Every new account starts with a 3-day free trial. No card is required to start. You only pay when you choose a plan.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade or downgrade at any time from the Subscription page inside your dashboard. Upgrades take effect immediately; downgrades apply at the end of your current cycle.',
  },
  {
    q: 'How do I pay?',
    a: 'Monthly payment via M-Pesa STK push. You will receive a prompt on your registered phone number to confirm each payment.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Sign-in is protected by email OTP verification, sessions are managed securely, and your business data is isolated to your workspace.',
  },
  {
    q: 'Do you support multiple branches?',
    a: 'The Business plan supports unlimited branches with role-based permissions for managers and cashiers.',
  },
];

function Cell({ value }) {
  if (value === true) return <Check size={16} color="var(--success)" />;
  if (value === false) return <Minus size={16} color="var(--text-faint)" />;
  return <span>{value}</span>;
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const priceFor = plan =>
    annual ? Math.round(plan.price * (1 - ANNUAL_DISCOUNT)) : plan.price;

  return (
    <>
      <PublicNav />

      {/* ---------- Hero + plans ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <Badge tone="primary">Pricing</Badge>
            <h1 className="section-title">
              Simple plans that grow with your business
            </h1>
            <p className="section-sub">
              Every plan starts with a 3-day free trial. No card required.
              Cancel or change plans anytime.
            </p>
          </div>

          <div className="billing-toggle">
            <button
              type="button"
              className={!annual ? 'on' : ''}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={annual ? 'on' : ''}
              onClick={() => setAnnual(true)}
            >
              Annual <span className="save-tag">Save 17%</span>
            </button>
          </div>

          <div className="price-grid">
            {PLANS.map(pl => (
              <div
                key={pl.id}
                className={`price-card ${pl.popular ? 'price-hot' : ''}`}
              >
                {pl.popular && <span className="price-ribbon">Most popular</span>}
                <h3 className="price-name">{pl.name}</h3>
                <p className="price-tag">{pl.tagline}</p>
                <div className="price-amount">
                  <span className="price-cur">KSh</span>
                  <span className="price-num">
                    {priceFor(pl).toLocaleString()}
                  </span>
                  <span className="price-per">/month</span>
                </div>
                {annual && (
                  <div className="price-annual">
                    Billed annually · save{' '}
                    {((pl.price - priceFor(pl)) * 12).toLocaleString()} KSh / year
                  </div>
                )}
                <ul className="price-feats">
                  {pl.features.map(f => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link to="/signup" style={{ marginTop: 'auto' }}>
                  <Button full variant={pl.popular ? 'primary' : 'outline'}>
                    Start free trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Comparison table ---------- */}
      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <Badge tone="info">Compare plans</Badge>
            <h2 className="section-title">Feature-by-feature comparison</h2>
          </div>

          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th>Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} className={p.popular ? 'col-hot' : ''}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map(group => (
                  <>
                    <tr key={`g-${group.group}`} className="compare-group">
                      <td colSpan={PLANS.length + 1}>{group.group}</td>
                    </tr>
                    {group.rows.map(row => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        {PLANS.map(p => (
                          <td
                            key={p.id}
                            className={p.popular ? 'col-hot' : ''}
                          >
                            <Cell value={row.values[p.id]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="section-head">
            <Badge tone="primary">FAQ</Badge>
            <h2 className="section-title">Frequently asked questions</h2>
          </div>
          <div className="faq">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.q}</span>
                  <span className="faq-plus">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && <div className="faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="cta-title">Not sure which plan fits?</h2>
              <p className="cta-sub">
                Start with the free trial and change anytime.
              </p>
            </div>
            <Link to="/signup">
              <Button size="lg" rightIcon={<ArrowRight size={16} />}>
                Start free trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}