import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Boxes, CheckCircle2, Circle, DollarSign, Package,
  Plus, ShoppingCart, TrendingUp, Users, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import StatCard from './StatCard';
import RevenueChart from './RevenueChart';
import PaymentMix from './PaymentMix';
import RecentActivity from './RecentActivity';
import { productService } from '@/services/productService';
import { customerService } from '@/services/customerService';
import { salesService } from '@/services/salesService';
import { useBusiness } from '@/context/BusinessContext';
import { formatKSh, formatNumber } from '@/utils/format';
import './Dashboard.css';

export default function Dashboard() {
  const { business } = useBusiness();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [prods, custs, ords] = await Promise.all([
        productService.list(),
        customerService.list(),
        salesService.list(),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setOrders(ords);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const kpis = useMemo(() => {
    const todayOrders = orders.filter(o => (o.date || '').startsWith(today) && o.status === 'COMPLETED');
    const revenueToday = todayOrders.reduce((s, o) => s + o.total, 0);
    const profitToday = todayOrders.reduce((s, o) => {
      const cost = (o.itemsList || []).reduce((c, i) => {
        const p = products.find(x => x.name === i.name);
        return c + (p?.buyingPrice || 0) * i.qty;
      }, 0);
      return s + (o.total - cost);
    }, 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.threshold).length;
    return {
      revenueToday,
      ordersToday: todayOrders.length,
      profitToday,
      customers: customers.length,
      products: products.length,
      lowStock,
    };
  }, [orders, products, customers, today]);

  const weekSeries = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const monday = new Date(now);
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    monday.setDate(now.getDate() - dow);

    return days.map((label, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      const key = date.toISOString().slice(0, 10);
      const dayOrders = orders.filter(o => (o.date || '').startsWith(key) && o.status === 'COMPLETED');
      return {
        day: label,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const paymentMix = useMemo(() => {
    const completed = orders.filter(o => o.status === 'COMPLETED');
    const total = completed.length;
    if (!total) {
      return [
        { name: 'M-Pesa', value: 0, color: '#6d5efc' },
        { name: 'Cash', value: 0, color: '#22d3ee' },
      ];
    }
    const mpesa = completed.filter(o => o.method === 'M-Pesa').length;
    const cash = completed.filter(o => o.method === 'Cash').length;
    return [
      { name: 'M-Pesa', value: Math.round((mpesa / total) * 100), color: '#6d5efc' },
      { name: 'Cash', value: Math.round((cash / total) * 100), color: '#22d3ee' },
    ];
  }, [orders]);

  const lowStockItems = useMemo(
    () => products.filter(p => p.stock <= p.threshold).slice(0, 4),
    [products]
  );

  const recentActivity = useMemo(
    () => orders.slice(0, 5).map(o => ({
      type: 'sale',
      text: `Sale #${o.id} · ${formatKSh(o.total)} via ${o.method}`,
      time: o.date,
    })),
    [orders]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const isFreshWorkspace = !loading && products.length === 0 && orders.length === 0;

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 60, width: 340 }} />
        <div className="kpi-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        </div>
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  if (isFreshWorkspace) {
    return <FreshDashboard business={business} greeting={greeting} />;
  }

  return (
    <div className="dash stack gap-24">
      <header className="dash-head">
        <div>
          <p className="dash-greet muted">{greeting},</p>
          <h1 className="dash-title">{business.name || 'Your Business'}</h1>
          <p className="dash-sub muted">
            Here is a live view of your shop · {new Date().toLocaleDateString('en-KE', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <div className="row gap-12">
          <Link to="/products">
            <Button variant="outline" leftIcon={<Plus size={14} />}>Add product</Button>
          </Link>
          <Link to="/pos">
            <Button leftIcon={<ShoppingCart size={14} />}>Open POS</Button>
          </Link>
        </div>
      </header>

      <section className="kpi-grid">
        <StatCard label="Revenue today" value={formatKSh(kpis.revenueToday)} icon={DollarSign} tone="primary" />
        <StatCard label="Orders today" value={formatNumber(kpis.ordersToday)} icon={ShoppingCart} tone="info" />
        <StatCard label="Profit today" value={formatKSh(kpis.profitToday)} icon={TrendingUp} tone="success" sub="after buying cost" />
        <StatCard label="Customers" value={formatNumber(kpis.customers)} icon={Users} tone="primary" />
        <StatCard label="Products" value={formatNumber(kpis.products)} icon={Package} tone="info" />
        <StatCard label="Low stock" value={formatNumber(kpis.lowStock)} icon={Boxes} tone="warning" sub="need restocking" />
        <StatCard label="Outstanding" value={formatKSh(0)} icon={Wallet} tone="danger" sub="customer balances" />
      </section>

      <section className="dash-charts">
        <Card title="Revenue this week" subtitle="Daily revenue and orders">
          <RevenueChart data={weekSeries} />
        </Card>
        <Card title="Payment methods" subtitle="Distribution this week">
          <PaymentMix data={paymentMix} />
        </Card>
      </section>

      <section className="dash-bottom">
        <Card
          title="Low stock alert"
          subtitle="Restock before you run out"
          action={<Link to="/inventory"><Button size="sm" variant="outline">View all</Button></Link>}
        >
          {lowStockItems.length === 0 ? (
            <div className="dash-empty muted">No low-stock products. You are fully stocked.</div>
          ) : (
            <ul className="lowstock">
              {lowStockItems.map(p => (
                <li key={p.id} className="lowstock-row">
                  <div>
                    <div className="lowstock-name">{p.name}</div>
                    <div className="lowstock-sku mono">{p.sku}</div>
                  </div>
                  <div className="row gap-12">
                    <span className="mono faint">{p.stock} / {p.threshold}</span>
                    <Link to="/inventory"><Button size="sm" variant="outline">Restock</Button></Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent sales"
          subtitle="Latest completed transactions"
          action={<Link to="/sales" className="row gap-4" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>All sales <ArrowUpRight size={12} /></Link>}
        >
          {recentActivity.length === 0 ? (
            <div className="dash-empty muted">No sales recorded yet.</div>
          ) : (
            <RecentActivity items={recentActivity} />
          )}
        </Card>

        <Card title="Getting the most out of Sokoni" subtitle="Recommended next steps">
          <ul className="tips">
            <li><CheckCircle2 size={14} /> Add products with buying and selling prices</li>
            <li><CheckCircle2 size={14} /> Set low-stock thresholds per product</li>
            <li><CheckCircle2 size={14} /> Use the POS for every sale so stock stays accurate</li>
            <li><CheckCircle2 size={14} /> Review analytics weekly to spot trends</li>
          </ul>
          <style>{`
            .tips { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
            .tips li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--text-muted); line-height: 1.55; }
            .tips svg { color: var(--success); flex-shrink: 0; margin-top: 2px; }
          `}</style>
        </Card>
      </section>
    </div>
  );
}

function FreshDashboard({ business, greeting }) {
  const steps = [
    { done: !!business.name, label: 'Set up your business details', to: '/settings/business', cta: 'Open settings' },
    { done: false, label: 'Add your first product', to: '/products', cta: 'Add product' },
    { done: false, label: 'Make your first sale in the POS', to: '/pos', cta: 'Open POS' },
    { done: false, label: 'Add a customer you sell to often', to: '/customers', cta: 'Add customer' },
  ];

  return (
    <div className="dash stack gap-24">
      <header className="dash-head">
        <div>
          <p className="dash-greet muted">{greeting},</p>
          <h1 className="dash-title">{business.name || 'Welcome to Sokoni'}</h1>
          <p className="dash-sub muted">
            Your workspace is ready. Complete these steps to start running your shop.
          </p>
        </div>
      </header>

      <Card padding="lg">
        <div className="setup-hero">
          <Badge tone="primary">Setup</Badge>
          <h2 className="setup-title">Get your shop live in under 5 minutes</h2>
          <p className="muted" style={{ maxWidth: 560, margin: '8px auto 0', textAlign: 'center' }}>
            Your dashboard will populate with real numbers as soon as you start
            adding products and recording sales. Nothing here is pre-filled —
            everything reflects your own business.
          </p>
        </div>

        <ul className="setup-steps">
          {steps.map((s, i) => (
            <li key={i} className={`setup-step ${s.done ? 'done' : ''}`}>
              <span className="setup-step-icon">
                {s.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </span>
              <span className="setup-step-label">{s.label}</span>
              <Link to={s.to}>
                <Button size="sm" variant={s.done ? 'ghost' : 'outline'}>{s.cta}</Button>
              </Link>
            </li>
          ))}
        </ul>

        <style>{`
          .setup-hero { text-align: center; padding: 12px 0 8px; }
          .setup-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin-top: 12px; }
          .setup-steps {
            list-style: none; padding: 0; margin: 24px 0 0;
            display: flex; flex-direction: column; gap: 8px;
          }
          .setup-step {
            display: flex; align-items: center; gap: 14px;
            padding: 14px 16px; border-radius: 12px;
            background: var(--bg-soft);
            border: 1px solid transparent;
          }
          .setup-step.done { background: var(--success-bg); border-color: #bbf7d0; }
          .setup-step-icon { color: var(--text-faint); display: flex; }
          .setup-step.done .setup-step-icon { color: var(--success); }
          .setup-step-label { flex: 1; font-size: 13.5px; font-weight: 600; }
        `}</style>
      </Card>

      <style>{`
        .dash-empty { padding: 40px 20px; text-align: center; font-size: 13.5px; }
      `}</style>
    </div>
  );
}