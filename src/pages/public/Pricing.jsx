import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Footer from '@/components/layout/Footer';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { subscriptionPlans } from '@/data/mock';
import './Pricing.css';

const FAQS = [
  { q: 'How does the 3-day free trial work?', a: 'Every new account starts with a 3-day free trial. No card is required to start. You only pay when you choose a plan.' },
  { q: 'Can I switch plans later?', a: 'Yes. Upgrade or downgrade at any time from the Subscription page inside your dashboard. Changes take effect immediately.' },
  { q: 'How do I pay?', a: 'Monthly payment via M-Pesa STK push. You will receive a prompt on your registered phone number to confirm each payment.' },
  { q: 'Is my data safe?', a: 'Yes. Sign-in is protected by OTP verification, sessions are managed securely, and your business data is isolated to your workspace.' },
  { q: 'Do you support multiple branches?', a: 'The Business plan supports unlimited branches with role-based permissions for managers and cashiers.' },
];

const COMPARE_ROWS = [
  { label: 'Till / cashier accounts', starter: '1', pro: '3', business: 'Unlimited' },
  { label: 'Products', starter: 'Up to 300', pro: 'Unlimited', business: 'Unlimited' },
  { label: 'Branches', starter: '1', pro: '1', business: 'Unlimited' },
  { label: 'Cash & M-Pesa', starter: true, pro: true, business: true },
  { label: 'Customer accounts & credit', starter: false, pro: true, business: true },
  { label: 'Advanced analytics & exports', starter: false, pro: true, business: true },
  { label: 'Custom reports & API', starter: false, pro: false, business: true },
  { label: 'Priority support', starter: false, pro: true, business: true },
  { label: 'Dedicated onboarding', starter: false, pro: false, business: true },
];

function Cell({ value }) {
  if (value === true) return <Check size={16} color="var(--success)" />;
  if (value === false) return <Minus size={16} color="var(--text-faint)" />;
  return <span>{value}</span>;
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const priceFor = p => (annual ? Math.round(p.price * 0.83) : p.price);

  return (
    <>
      <PublicNav />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Badge tone="primary">Pricing</Badge>
            <h1 className="section-title">Simple plans that grow with your business</h1>
            <p className="section-sub">
              Every plan starts with a 3-day free trial. No card required.
              Cancel or change plans anytime.
            </p>
          </div>

          <div className="billing-toggle">
            <button
              className={!annual ? 'on' : ''}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={annual ? 'on' : ''}
              onClick={() => setAnnual(true)}
            >
              Annual <span className="save-tag">Save 17%</span>
            </button>
          </div>

          <div className="price-grid">
            {subscriptionPlans.map(pl => (
              <div key={pl.id} className={`price-card ${pl.popular ? 'price-hot' : ''}`}>
                {pl.popular && <span className="price-ribbon">Most popular</span>}
                <h3 className="price-name">{pl.name}</h3>
                <p className="price-tag">{pl.tagline}</p>
                <div className="price-amount">
                  <span className="price-cur">KSh</span>
                  <span className="price-num">{priceFor(pl).toLocaleString()}</span>
                  <span className="price-per">/month</span>
                </div>
                {annual && (
                  <div className="price-annual">
                    Billed annually · save {((pl.price - priceFor(pl)) * 12).toLocaleString()} KSh / year
                  </div>
                )}
                <ul className="price-feats">
                  {pl.features.map(f => <li key={f}>{f}</li>)}
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

      {/* Comparison */}
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
                  <th>Starter</th>
                  <th className="col-hot">Pro</th>
                  <th>Business</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(r => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td><Cell value={r.starter} /></td>
                    <td className="col-hot"><Cell value={r.pro} /></td>
                    <td><Cell value={r.business} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
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
                  className="faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.q}</span>
                  <span className="faq-plus">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="cta-title">Not sure which plan fits?</h2>
              <p className="cta-sub">Start with the free trial and change anytime.</p>
            </div>
            <Link to="/signup">
              <Button size="lg" rightIcon={<ArrowRight size={16} />}>Start free trial</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}