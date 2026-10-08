import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Users,
  Zap,
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Footer from '@/components/layout/Footer';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import DashboardPreview from '@/components/marketing/DashboardPreview';
import Reveal from '@/components/common/Reveal';
import './Landing.css';

const features = [
  {
    icon: ShoppingCart,
    title: 'Fast POS Checkout',
    text: 'Sell in seconds with keyboard shortcuts, barcode scanning, and a clean cart flow.',
  },
  {
    icon: Boxes,
    title: 'Live Inventory',
    text: 'Stock updates automatically with every sale. Get alerts before you run out.',
  },
  {
    icon: Smartphone,
    title: 'M-Pesa Payments',
    text: 'Send STK push requests and reconcile payments against each order.',
  },
  {
    icon: BarChart3,
    title: 'Sales Analytics',
    text: 'See what sells, when it sells, and which products drive profit.',
  },
  {
    icon: Users,
    title: 'Customer Records',
    text: 'Track purchases, balances, and repeat customers in one place.',
  },
  {
    icon: Receipt,
    title: 'Professional Receipts',
    text: 'Print or share receipts with transaction references customers trust.',
  },
];

const steps = [
  {
    n: '01',
    t: 'Create your business',
    d: 'Sign up in minutes. Set your shop name, currency, and tax preferences.',
  },
  {
    n: '02',
    t: 'Add your products',
    d: 'Import or create products with prices, stock levels, and categories.',
  },
  {
    n: '03',
    t: 'Start selling',
    d: 'Open the POS, accept cash or M-Pesa, and watch inventory update live.',
  },
];

export default function Landing() {
  const [mounted, setMounted] = useState(false);

  // Trigger hero animation when the splash begins to fade so the
  // landing elements settle in as the app appears.
  useEffect(() => {
    if (document.body.classList.contains('app-ready')) {
      setMounted(true);
      return;
    }
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains('app-ready')) {
        setMounted(true);
        mo.disconnect();
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  return (
    <div className={`landing ${mounted ? 'is-mounted' : ''}`}>
      <PublicNav />

      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="hero">
        <div className="hero-bg" aria-hidden>
          <span className="hero-orb orb-1" />
          <span className="hero-orb orb-2" />
          <span className="hero-grid" />
        </div>

        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="hero-pill hero-anim hero-anim-1">
              <Zap size={14} />
              <span>Built for Kenyan retail · KSh &amp; M-Pesa ready</span>
            </div>

            <h1 className="hero-title hero-anim hero-anim-2">
              Run your business smarter with powerful POS software
            </h1>

            <p className="hero-sub hero-anim hero-anim-3">
              Manage sales, inventory, products, customers and business
              performance from one reliable platform — online or at the counter.
            </p>

            <div className="hero-cta hero-anim hero-anim-4">
              <Link to="/signup">
                <Button size="lg" rightIcon={<ArrowRight size={16} />}>
                  Start 3-day free trial
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  Explore the demo
                </Button>
              </Link>
            </div>

            <div className="hero-trust hero-anim hero-anim-5">
              <div className="trust-item">
                <ShieldCheck size={14} /> OTP-secured access
              </div>
              <div className="trust-item">
                <CreditCard size={14} /> No card required
              </div>
              <div className="trust-item">
                <Package size={14} /> Unlimited SKUs on Pro
              </div>
            </div>
          </div>

          <div className="hero-visual hero-anim hero-anim-visual">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES
          ============================================================ */}
      <section id="features" className="section">
        <div className="container">
          <Reveal className="section-head">
            <Badge tone="primary">Capabilities</Badge>
            <h2 className="section-title">Everything your shop needs to run</h2>
            <p className="section-sub">
              From the counter to the back office, Sokoni keeps the numbers
              accurate and your team moving fast.
            </p>
          </Reveal>

          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 80}>
                <Card padding="lg" className="feature-card">
                  <div className="feature-icon">
                    <Icon size={20} />
                  </div>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-text">{text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section className="section section-soft">
        <div className="container">
          <Reveal className="section-head">
            <Badge tone="primary">How it works</Badge>
            <h2 className="section-title">Live in under 10 minutes</h2>
          </Reveal>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="step">
                  <span className="step-n">{s.n}</span>
                  <h3 className="step-t">{s.t}</h3>
                  <p className="step-d">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          INVENTORY SPLIT
          ============================================================ */}
      <section className="section">
        <div className="container split">
          <Reveal className="split-copy">
            <Badge tone="info">Inventory</Badge>
            <h2 className="section-title">Never sell what you don't have</h2>
            <p className="section-sub">
              Every sale reduces stock automatically. Low-stock and
              out-of-stock items surface on your dashboard so you can restock
              before customers ask.
            </p>
            <ul className="checklist">
              <li>Buying price vs retail price tracking</li>
              <li>Reorder thresholds per product</li>
              <li>Adjustment history with reasons</li>
            </ul>
          </Reveal>

          <Reveal className="split-visual" delay={140}>
            <Card padding="lg">
              <div className="row between" style={{ marginBottom: 14 }}>
                <h3 className="card-title">Stock alerts</h3>
                <Badge tone="warning">3 low</Badge>
              </div>
              {[
                { n: 'Cooking Oil 2L', s: 4, t: 12 },
                { n: 'Sugar 1kg', s: 6, t: 20 },
                { n: 'Milk 500ml', s: 3, t: 15 },
              ].map(p => (
                <div key={p.n} className="stock-row">
                  <span>{p.n}</span>
                  <span className="mono faint">
                    {p.s} / {p.t}
                  </span>
                </div>
              ))}
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          M-PESA SPLIT
          ============================================================ */}
      <section className="section section-soft">
        <div className="container split split-reverse">
          <Reveal className="split-copy">
            <Badge tone="success">Payments</Badge>
            <h2 className="section-title">
              Accept cash and M-Pesa with confidence
            </h2>
            <p className="section-sub">
              Send an STK push to the customer's phone, watch the state in real
              time, and store the transaction reference on the order.
            </p>
            <ul className="checklist">
              <li>Payment state tracking: pending, success, failed, timeout</li>
              <li>Automatic receipt with M-Pesa reference</li>
              <li>Reconciled against every sale</li>
            </ul>
          </Reveal>

          <Reveal className="split-visual" delay={140}>
            <Card padding="lg">
              <h3 className="card-title" style={{ marginBottom: 12 }}>
                M-Pesa request
              </h3>
              <div className="mpesa-mock">
                <div className="mpesa-line">
                  <span>Phone</span>
                  <span className="mono">+254 7XX XXX XXX</span>
                </div>
                <div className="mpesa-line">
                  <span>Amount</span>
                  <span className="mono bold">KSh 2,450</span>
                </div>
                <div className="mpesa-line">
                  <span>Status</span>
                  <Badge tone="success">Success</Badge>
                </div>
                <div className="mpesa-line">
                  <span>Reference</span>
                  <span className="mono">QK12H7X9AB</span>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          PRICING
          ============================================================ */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <Badge tone="primary">Pricing</Badge>
            <h2 className="section-title">Simple plans that grow with you</h2>
            <p className="section-sub">
              Every plan starts with a 3-day free trial. No card required.
            </p>
          </Reveal>

          <div className="price-grid">
            {[
              {
                n: 'Starter',
                p: 999,
                tag: 'For small shops',
                feats: [
                  '1 till',
                  'Up to 300 products',
                  'Cash & M-Pesa',
                  'Basic reports',
                ],
              },
              {
                n: 'Pro',
                p: 1999,
                tag: 'Most popular',
                hot: true,
                feats: [
                  '3 tills',
                  'Unlimited products',
                  'Customer accounts',
                  'Advanced analytics',
                  'Priority support',
                ],
              },
              {
                n: 'Business',
                p: 3999,
                tag: 'For multi-branch',
                feats: [
                  'Unlimited tills',
                  'Multi-branch',
                  'Role permissions',
                  'Custom reports',
                  'Dedicated onboarding',
                ],
              },
            ].map((pl, i) => (
              <Reveal key={pl.n} delay={i * 110}>
                <div className={`price-card ${pl.hot ? 'price-hot' : ''}`}>
                  {pl.hot && <span className="price-ribbon">Most popular</span>}
                  <h3 className="price-name">{pl.n}</h3>
                  <p className="price-tag">{pl.tag}</p>
                  <div className="price-amount">
                    <span className="price-cur">KSh</span>
                    <span className="price-num">{pl.p.toLocaleString()}</span>
                    <span className="price-per">/month</span>
                  </div>
                  <ul className="price-feats">
                    {pl.feats.map(f => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Link to="/signup">
                    <Button full variant={pl.hot ? 'primary' : 'outline'}>
                      Start free trial
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <div>
                <h2 className="cta-title">Ready to see your shop clearly?</h2>
                <p className="cta-sub">
                  Start your 3-day trial. No card, no commitment.
                </p>
              </div>
              <Link to="/signup">
                <Button size="lg" rightIcon={<ArrowRight size={16} />}>
                  Create your account
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}