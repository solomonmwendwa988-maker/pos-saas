import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Boxes, CreditCard, FileText, Package, Receipt,
  ShieldCheck, ShoppingCart, Smartphone, Tag, Truck, Users,
} from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Footer from '@/components/layout/Footer';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import '../public/Landing.css';

const groups = [
  {
    title: 'Sell faster',
    badge: 'Point of Sale',
    icon: ShoppingCart,
    items: [
      { icon: ShoppingCart, title: 'POS checkout', text: 'Barcode, SKU search, keyboard shortcuts and a clean cart that closes sales in seconds.' },
      { icon: Smartphone, title: 'M-Pesa STK push', text: 'Send a payment request to the customer phone and track status until completion.' },
      { icon: Receipt, title: 'Receipts customers trust', text: 'Print, download or share receipts with the M-Pesa reference attached.' },
      { icon: CreditCard, title: 'Multiple payment methods', text: 'Cash, M-Pesa and card — all reconciled per order with clear audit trails.' },
    ],
  },
  {
    title: 'Track everything',
    badge: 'Inventory & Products',
    icon: Boxes,
    items: [
      { icon: Package, title: 'Product catalog', text: 'SKU, barcode, buying price, retail price, supplier and low-stock threshold per product.' },
      { icon: Boxes, title: 'Live stock levels', text: 'Every sale updates stock automatically. Get alerts before you run out.' },
      { icon: Tag, title: 'Category management', text: 'Organise products by category for faster search and cleaner reporting.' },
      { icon: Truck, title: 'Supplier records', text: 'Track vendors, contacts and outstanding balances from one place.' },
    ],
  },
  {
    title: 'Grow with confidence',
    badge: 'Reporting & Analytics',
    icon: BarChart3,
    items: [
      { icon: BarChart3, title: 'Sales analytics', text: 'Revenue trends, orders, average order value and profit margin over any period.' },
      { icon: Users, title: 'Customer insights', text: 'Purchase history, spending and repeat-buyer behaviour per customer.' },
      { icon: FileText, title: 'Reports & exports', text: 'Sales, revenue, profit, VAT and inventory reports — export CSV or PDF.' },
      { icon: ShieldCheck, title: 'Security built in', text: 'OTP-verified login, session visibility and secure password reset flows.' },
    ],
  },
];

export default function Features() {
  return (
    <>
      <PublicNav />

      <section className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="section-head">
            <Badge tone="primary">Features</Badge>
            <h1 className="section-title">Everything your shop needs to run</h1>
            <p className="section-sub">
              From the counter to the back office, Sokoni keeps the numbers accurate
              and your team moving fast. Built for Kenyan retail — priced in KSh.
            </p>
          </div>
        </div>
      </section>

      {groups.map((g, i) => (
        <section key={g.title} className={`section ${i % 2 === 1 ? 'section-soft' : ''}`}>
          <div className="container">
            <div className="row gap-12" style={{ marginBottom: 28 }}>
              <span className="feature-group-icon"><g.icon size={20} /></span>
              <div>
                <Badge tone="primary">{g.badge}</Badge>
                <h2 className="section-title" style={{ marginTop: 10, textAlign: 'left', fontSize: 'clamp(22px, 2.4vw, 30px)' }}>
                  {g.title}
                </h2>
              </div>
            </div>

            <div className="feature-grid">
              {g.items.map(({ icon: Icon, title, text }) => (
                <Card key={title} padding="lg" className="feature-card">
                  <div className="feature-icon"><Icon size={20} /></div>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-text">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="cta-title">Ready to try it on your own shop?</h2>
              <p className="cta-sub">Start your 3-day free trial — no card required.</p>
            </div>
            <Link to="/signup">
              <Button size="lg" rightIcon={<ArrowRight size={16} />}>Create your account</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .feature-group-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </>
  );
}