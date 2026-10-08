import { Link } from 'react-router-dom';
import {
  BookOpen, ExternalLink, MessageSquare, Phone, Receipt, Settings,
  ShieldCheck, ShoppingCart, Sparkles, Users,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { useState } from 'react';
import { useToast } from '@/context/ToastContext';

const TOPICS = [
  { icon: ShoppingCart, title: 'Using the POS', text: 'Ring up sales, handle cash and M-Pesa, print receipts.' },
  { icon: Users, title: 'Managing customers', text: 'Add customers, track balances and view purchase history.' },
  { icon: Receipt, title: 'Receipts and taxes', text: 'Set VAT, edit receipt footer and print or share receipts.' },
  { icon: ShieldCheck, title: 'Security', text: 'Two-factor authentication, sessions and password reset.' },
  { icon: Settings, title: 'Business settings', text: 'Business name, logo, location and payment methods.' },
  { icon: Sparkles, title: 'Plans and billing', text: 'Trial, upgrades, invoices and M-Pesa payment requests.' },
];

const FAQS = [
  { q: 'How do I add a new product?', a: 'Open Products from the sidebar, click Add product, and fill in the name, SKU, prices, stock and low-stock threshold. Click Create product to save.' },
  { q: 'What happens if a customer cancels the M-Pesa request?', a: 'The payment modal shows a failed state and no order is completed. You can retry the request or switch the order to cash.' },
  { q: 'Can I export my sales data?', a: 'Yes. On the Sales page, click Export CSV. On the Reports page, you can export preview rows as CSV or generate a PDF export.' },
  { q: 'How do I change my business name?', a: 'Go to Settings, then Business. Update the name and click Save changes. The new name appears on all future receipts and reports.' },
  { q: 'Is my data backed up?', a: 'Yes. Business data is stored on the server and accessible from any device signed in to your workspace.' },
];

export default function Help() {
  const toast = useToast();
  const [openFaq, setOpenFaq] = useState(null);
  const [search, setSearch] = useState('');

  const filteredFaqs = FAQS.filter(f =>
    !search || f.q.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Help & Support</h1>
          <p className="page-sub muted">Guides, FAQs and ways to reach our team</p>
        </div>
      </header>

      <Card padding="lg">
        <div className="help-hero">
          <Badge tone="primary">Support</Badge>
          <h2 className="help-title">How can we help you today?</h2>
          <p className="help-sub muted">
            Search guides below or reach out — we reply within one business day.
          </p>
          <div style={{ maxWidth: 480, margin: '20px auto 0' }}>
            <Input
              placeholder="Search help topics"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<BookOpen size={15} />}
            />
          </div>
        </div>
      </Card>

      <section>
        <h3 className="help-section-title">Popular topics</h3>
        <div className="help-topics">
          {TOPICS.map(({ icon: Icon, title, text }) => (
            <Card key={title} padding="lg" className="help-card">
              <span className="help-icon"><Icon size={18} /></span>
              <div className="help-card-title">{title}</div>
              <div className="help-card-text">{text}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="help-section-title">Frequently asked questions</h3>
        <div className="faq">
          {filteredFaqs.length === 0 ? (
            <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 13.5 }}>
              No results for “{search}”. Try a different keyword.
            </div>
          ) : filteredFaqs.map((f, i) => (
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
      </section>

      <section>
        <h3 className="help-section-title">Talk to us</h3>
        <div className="help-contact">
          <Card padding="lg">
            <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
              <span className="help-icon"><MessageSquare size={18} /></span>
              <div style={{ flex: 1 }}>
                <div className="bold">Email support</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  support@sokoni.co.ke · replies within one business day
                </div>
                <Link to="/contact" style={{ display: 'inline-block', marginTop: 12 }}>
                  <Button size="sm" variant="outline" rightIcon={<ExternalLink size={13} />}>
                    Open contact form
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
              <span className="help-icon"><Phone size={18} /></span>
              <div style={{ flex: 1 }}>
                <div className="bold">Phone support</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  +254 700 123 456 · Mon–Fri · 8:00–18:00 EAT
                </div>
                <Button
                  size="sm" variant="outline"
                  style={{ marginTop: 12 }}
                  onClick={() => toast.info('A support agent will call you back shortly.')}
                >
                  Request a callback
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <style>{`
        .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
        .page-sub { font-size: 13px; margin: 4px 0 0; }

        .help-hero { text-align: center; padding: 16px 0; }
        .help-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin-top: 14px; }
        .help-sub { font-size: 14px; margin: 10px 0 0; }

        .help-section-title {
          font-size: 15px; font-weight: 700; margin: 0 0 14px;
        }

        .help-topics {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
        }
        @media (max-width: 900px) { .help-topics { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .help-topics { grid-template-columns: 1fr; } }

        .help-card { display: flex; flex-direction: column; gap: 8px; }
        .help-icon {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
        }
        .help-card-title { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .help-card-text { font-size: 13px; color: var(--text-muted); line-height: 1.55; }

        .help-contact {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        }
        @media (max-width: 720px) { .help-contact { grid-template-columns: 1fr; } }

        .faq { display: flex; flex-direction: column; gap: 10px; }
        .faq-item {
          background: #fff; border: 1px solid var(--border);
          border-radius: var(--r-md); overflow: hidden;
          transition: border-color var(--dur);
        }
        .faq-item.open { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-50); }
        .faq-q {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; background: transparent; border: 0; cursor: pointer;
          font-size: 14px; font-weight: 600; color: var(--text); text-align: left;
        }
        .faq-plus { font-size: 20px; color: var(--text-muted); line-height: 1; }
        .faq-a { padding: 0 20px 18px; color: var(--text-muted); font-size: 13.5px; line-height: 1.65; }
      `}</style>
    </div>
  );
}