import React, { useEffect, useMemo, useState } from 'react';
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
import { customerLedgerService } from '@/services/customerLedgerService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { useBusiness } from '@/context/BusinessContext';
import { formatKSh, formatNumber } from '@/utils/format';
import './Dashboard.css';

export default function Dashboard() {
  const { business } = useBusiness();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ledgerBalances, setLedgerBalances] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    const safe = async (fn, fallback) => {
      try {
        return await fn();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[dashboard] safe load failed:', err);
        return fallback;
      }
    };

    const [prods, custs, ords] = await Promise.all([
      safe(() => productService.list(), []),
      safe(() => customerService.list(), []),
      safe(() => salesService.list(), []),
    ]);

    let balances = {};
    try {
      balances = customerLedgerService.allBalances() || {};
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[dashboard] ledger balances failed:', err);
      balances = {};
    }

    setProducts(Array.isArray(prods) ? prods : []);
    setCustomers(Array.isArray(custs) ? custs : []);
    setOrders(Array.isArray(ords) ? ords : []);
    setLedgerBalances(balances);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => load();
    const off1 = eventBus.on(EVENTS.SALE_COMPLETED, handler);
    const off2 = eventBus.on(EVENTS.SALE_REFUNDED, handler);
    const off3 = eventBus.on(EVENTS.CUSTOMER_PAYMENT, handler);
    const off4 = eventBus.on(EVENTS.CUSTOMER_LEDGER_CHANGED, handler);
    return () => {
      off1();
      off2();
      off3();
      off4();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const kpis = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeProducts = Array.isArray(products) ? products : [];
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeBalances =
      ledgerBalances && typeof ledgerBalances === 'object' ? ledgerBalances : {};

    const todayOrders = safeOrders.filter(
      o => (o?.date || '').startsWith(today) && o?.status === 'COMPLETED'
    );
    const revenueToday = todayOrders.reduce(
      (s, o) => s + (Number(o?.total) || 0),
      0
    );
    const profitToday = todayOrders.reduce((s, o) => {
      const cost = (o?.itemsList || []).reduce((c, i) => {
        const p = safeProducts.find(x => x.name === i?.name);
        return c + (Number(p?.buyingPrice) || 0) * (Number(i?.qty) || 0);
      }, 0);
      return s + ((Number(o?.total) || 0) - cost);
    }, 0);

    const lowStock = safeProducts.filter(
      p => Number(p?.stock) > 0 && Number(p?.stock) <= Number(p?.threshold)
    ).length;

    const outstanding = Object.values(safeBalances).reduce(
      (s, v) => s + Math.max(0, Number(v) || 0),
      0
    );
    const owingCustomers = Object.values(safeBalances).filter(
      v => Number(v) > 0
    ).length;

    return {
      revenueToday,
      ordersToday: todayOrders.length,
      profitToday,
      customers: safeCustomers.length,
      products: safeProducts.length,
      lowStock,
      outstanding,
      owingCustomers,
    };
  }, [orders, products, customers, today, ledgerBalances]);

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
      const dayOrders = (orders || []).filter(
        o => (o?.date || '').startsWith(key) && o?.status === 'COMPLETED'
      );
      return {
        day: label,
        revenue: dayOrders.reduce((s, o) => s + (Number(o?.total) || 0), 0),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const paymentMix = useMemo(() => {
    const completed = (orders || []).filter(o => o?.status === 'COMPLETED');
    const total = completed.length;

    if (!total) {
      return [
        { name: 'M-Pesa', value: 0, color: '#6d5efc' },
        { name: 'Cash', value: 0, color: '#22d3ee' },
        { name: 'Credit', value: 0, color: '#f59e0b' },
      ];
    }

    const mpesa = completed.filter(o => o.method === 'M-Pesa').length;
    const cash = completed.filter(o => o.method === 'Cash').length;
    const credit = completed.filter(
      o => o.paymentStatus === 'credit' || o.method === 'On credit'
    ).length;

    return [
      { name: 'M-Pesa', value: Math.round((mpesa / total) * 100), color: '#6d5efc' },
      { name: 'Cash', value: Math.round((cash / total) * 100), color: '#22d3ee' },
      { name: 'Credit', value: Math.round((credit / total) * 100), color: '#f59e0b' },
    ];
  }, [orders]);

  const lowStockItems = useMemo(
    () => (products || []).filter(p => p.stock <= p.threshold).slice(0, 4),
    [products]
  );

  const recentActivity = useMemo(
    () =>
      (orders || []).slice(0, 5).map(o => ({
        type: 'sale',
        text: `Sale #${o.id} · ${formatKSh(o.total)} via ${
          o.paymentStatus === 'credit' ? 'Credit' : o.method
        }`,
        time: o.date,
      })),
    [orders]
  );

  const topDebtors = useMemo(() => {
    if (!ledgerBalances || typeof ledgerBalances !== 'object') return [];
    return Object.entries(ledgerBalances)
      .filter(([, v]) => Number(v) > 0)
      .map(([customerId, balance]) => {
        const c = (customers || []).find(x => x.id === customerId);
        return {
          customerId,
          name: c?.name || 'Unknown',
          phone: c?.phone || '',
          balance: Number(balance) || 0,
        };
      })
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [ledgerBalances, customers]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const isFreshWorkspace =
    !loading &&
    (products || []).length === 0 &&
    (orders || []).length === 0;

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 60, width: 340 }} />
        <div className="kpi-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 110 }} />
          ))}
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
          <h1 className="dash-title">{business?.name || 'Your Business'}</h1>
          <p className="dash-sub muted">
            Here is a live view of your shop ·{' '}
            {new Date().toLocaleDateString('en-KE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="row gap-12">
          <Link to="/products">
            <Button variant="outline" leftIcon={<Plus size={14} />}>
              Add product
            </Button>
          </Link>
          <Link to="/pos">
            <Button leftIcon={<ShoppingCart size={14} />}>Open POS</Button>
          </Link>
        </div>
      </header>

      <section className="kpi-grid">
        <StatCard
          label="Revenue today"
          value={formatKSh(kpis.revenueToday)}
          icon={DollarSign}
          tone="primary"
        />
        <StatCard
          label="Orders today"
          value={formatNumber(kpis.ordersToday)}
          icon={ShoppingCart}
          tone="info"
        />
        <StatCard
          label="Profit today"
          value={formatKSh(kpis.profitToday)}
          icon={TrendingUp}
          tone="success"
          sub="after buying cost"
        />
        <StatCard
          label="Customers"
          value={formatNumber(kpis.customers)}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Products"
          value={formatNumber(kpis.products)}
          icon={Package}
          tone="info"
        />
        <StatCard
          label="Low stock"
          value={formatNumber(kpis.lowStock)}
          icon={Boxes}
          tone="warning"
          sub="need restocking"
        />
        <StatCard
          label="Outstanding"
          value={formatKSh(kpis.outstanding)}
          icon={Wallet}
          tone={kpis.outstanding > 0 ? 'danger' : 'success'}
          sub={
            kpis.owingCustomers > 0
              ? `${kpis.owingCustomers} customer${
                  kpis.owingCustomers === 1 ? '' : 's'
                } owe`
              : 'all settled'
          }
        />
      </section>

      <section className="dash-charts">
        <Card title="Revenue this week" subtitle="Daily revenue and orders">
          <ChartErrorGuard>
            <RevenueChart data={weekSeries} />
          </ChartErrorGuard>
        </Card>
        <Card title="Payment methods" subtitle="Distribution this week">
          <ChartErrorGuard>
            <PaymentMix data={paymentMix} />
          </ChartErrorGuard>
        </Card>
      </section>

      <section className="dash-bottom">
        <Card
          title="Low stock alert"
          subtitle="Restock before you run out"
          action={
            <Link to="/inventory">
              <Button size="sm" variant="outline">
                View all
              </Button>
            </Link>
          }
        >
          {lowStockItems.length === 0 ? (
            <div className="dash-empty muted">
              No low-stock products. You are fully stocked.
            </div>
          ) : (
            <ul className="lowstock">
              {lowStockItems.map(p => (
                <li key={p.id} className="lowstock-row">
                  <div>
                    <div className="lowstock-name">{p.name}</div>
                    <div className="lowstock-sku mono">{p.sku}</div>
                  </div>
                  <div className="row gap-12">
                    <span className="mono faint">
                      {p.stock} / {p.threshold}
                    </span>
                    <Link to="/inventory">
                      <Button size="sm" variant="outline">
                        Restock
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Outstanding balances"
          subtitle="Customers who owe money"
          action={
            <Link
              to="/customers"
              className="row gap-4"
              style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}
            >
              All customers <ArrowUpRight size={12} />
            </Link>
          }
        >
          {topDebtors.length === 0 ? (
            <div className="dash-empty muted">
              Nothing owing. Every customer is settled.
            </div>
          ) : (
            <ul className="debt-list">
              {topDebtors.map(d => (
                <li key={d.customerId} className="debt-row">
                  <Link to={`/customers/${d.customerId}`} className="debt-link">
                    <span className="debt-avatar">{d.name[0]}</span>
                    <div className="debt-body">
                      <div className="debt-name">{d.name}</div>
                      <div className="debt-phone mono">{d.phone || '—'}</div>
                    </div>
                    <span className="debt-amount mono">
                      {formatKSh(d.balance)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent sales"
          subtitle="Latest completed transactions"
          action={
            <Link
              to="/sales"
              className="row gap-4"
              style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}
            >
              All sales <ArrowUpRight size={12} />
            </Link>
          }
        >
          {recentActivity.length === 0 ? (
            <div className="dash-empty muted">No sales recorded yet.</div>
          ) : (
            <ChartErrorGuard>
              <RecentActivity items={recentActivity} />
            </ChartErrorGuard>
          )}
        </Card>
      </section>

      <style>{`
        .debt-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 4px;
        }
        .debt-row { border-radius: 10px; }
        .debt-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 8px; border-radius: 10px;
          transition: background var(--dur);
        }
        .debt-link:hover { background: var(--bg-soft); }
        .debt-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #7c6cff, #22d3ee);
          color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: var(--font-display); font-size: 14px;
        }
        .debt-body { flex: 1; min-width: 0; }
        .debt-name {
          font-size: 13.5px; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .debt-phone {
          font-size: 11.5px; color: var(--text-faint); margin-top: 2px;
        }
        .debt-amount {
          font-weight: 800; color: var(--danger);
          font-size: 13.5px; font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}

/**
 * Small internal boundary that keeps a crashing chart from taking
 * down the whole dashboard.
 */
class ChartErrorGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn('[dashboard] chart crashed:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: 13,
          }}
        >
          This chart couldn't be displayed right now.
        </div>
      );
    }
    return this.props.children;
  }
}

function FreshDashboard({ business, greeting }) {
  const steps = [
    {
      done: !!business?.name,
      label: 'Set up your business details',
      to: '/settings/business',
      cta: 'Open settings',
    },
    {
      done: false,
      label: 'Add your first product',
      to: '/products',
      cta: 'Add product',
    },
    {
      done: false,
      label: 'Make your first sale in the POS',
      to: '/pos',
      cta: 'Open POS',
    },
    {
      done: false,
      label: 'Add a customer you sell to often',
      to: '/customers',
      cta: 'Add customer',
    },
  ];

  return (
    <div className="dash stack gap-24">
      <header className="dash-head">
        <div>
          <p className="dash-greet muted">{greeting},</p>
          <h1 className="dash-title">
            {business?.name || 'Welcome to Sokoni'}
          </h1>
          <p className="dash-sub muted">
            Your workspace is ready. Complete these steps to start running your
            shop.
          </p>
        </div>
      </header>

      <Card padding="lg">
        <div className="setup-hero">
          <Badge tone="primary">Setup</Badge>
          <h2 className="setup-title">Get your shop live in under 5 minutes</h2>
          <p
            className="muted"
            style={{ maxWidth: 560, margin: '8px auto 0', textAlign: 'center' }}
          >
            Your dashboard will populate with real numbers as soon as you start
            adding products and recording sales.
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
                <Button size="sm" variant={s.done ? 'ghost' : 'outline'}>
                  {s.cta}
                </Button>
              </Link>
            </li>
          ))}
        </ul>

        <style>{`
          .setup-hero { text-align: center; padding: 12px 0 8px; }
          .setup-title {
            font-size: 22px; font-weight: 800;
            letter-spacing: -0.02em; margin-top: 12px;
          }
          .setup-steps {
            list-style: none; padding: 0; margin: 24px 0 0;
            display: flex; flex-direction: column; gap: 8px;
          }
          .setup-step {
            display: flex; align-items: center; gap: 14px;
            padding: 14px 16px; border-radius: 12px;
            background: var(--bg-soft); border: 1px solid transparent;
          }
          .setup-step.done {
            background: var(--success-bg); border-color: #bbf7d0;
          }
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