import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Calendar, Download, TrendingDown, TrendingUp } from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { salesService } from '@/services/salesService';
import { productService } from '@/services/productService';
import { formatKSh } from '@/utils/format';
import { useToast } from '@/context/ToastContext';
import './Analytics.css';

const RANGES = ['7d', '30d', '90d', '12m'];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e6e8f0',
  boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
  fontSize: 12,
};

export default function Analytics() {
  const toast = useToast();
  const [range, setRange] = useState('12m');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [o, p] = await Promise.all([
        salesService.list(),
        productService.list(),
      ]);
      setOrders(o);
      setProducts(p);
      setLoading(false);
    })();
  }, []);

  const monthly = useMemo(() => {
    const map = new Map();
    orders.filter(o => o.status === 'COMPLETED').forEach(o => {
      const month = (o.date || '').slice(0, 7);
      if (!month) return;
      const entry = map.get(month) || { month, revenue: 0, orders: 0, profit: 0 };
      entry.revenue += o.total || 0;
      entry.orders += 1;
      const cost = (o.itemsList || []).reduce((s, i) => {
        const p = products.find(x => x.name === i.name);
        return s + (p?.buyingPrice || 0) * i.qty;
      }, 0);
      entry.profit += (o.total || 0) - cost;
      map.set(month, entry);
    });
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        month: new Date(m.month + '-01').toLocaleDateString('en-KE', { month: 'short' }),
        ...m,
      }));
  }, [orders, products]);

  const categorySales = useMemo(() => {
    const map = new Map();
    orders.filter(o => o.status === 'COMPLETED').forEach(o => {
      (o.itemsList || []).forEach(i => {
        const product = products.find(p => p.name === i.name);
        const cat = product?.category || 'Uncategorised';
        const entry = map.get(cat) || { category: cat, revenue: 0, units: 0 };
        entry.revenue += i.qty * i.price;
        entry.units += i.qty;
        map.set(cat, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders, products]);

  const productPerformance = useMemo(() => {
    const map = new Map();
    orders.filter(o => o.status === 'COMPLETED').forEach(o => {
      (o.itemsList || []).forEach(i => {
        const entry = map.get(i.name) || { name: i.name, sold: 0, revenue: 0 };
        entry.sold += i.qty;
        entry.revenue += i.qty * i.price;
        map.set(i.name, entry);
      });
    });
    const all = Array.from(map.values());
    return {
      top: [...all].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      worst: [...all].sort((a, b) => a.revenue - b.revenue).slice(0, 5),
    };
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

  const kpis = useMemo(() => {
    const completed = orders.filter(o => o.status === 'COMPLETED');
    const revenue = completed.reduce((s, o) => s + o.total, 0);
    const ordersCount = completed.length;
    const profit = monthly.reduce((s, m) => s + m.profit, 0);
    return {
      revenue,
      orders: ordersCount,
      profit,
      avgOrder: ordersCount ? Math.round(revenue / ordersCount) : 0,
      margin: revenue ? Math.round((profit / revenue) * 100) : 0,
    };
  }, [orders, monthly]);

  const exportCsv = () => {
    if (!orders.length) {
      toast.warning('No data to export yet.');
      return;
    }
    const rows = monthly.map(m => ({
      Month: m.month,
      Revenue: m.revenue,
      Orders: m.orders,
      Profit: m.profit,
    }));
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map(r => header.map(h => r[h]).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sokoni-analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics exported.');
  };

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 220 }} />
        <div className="skeleton" style={{ height: 100 }} />
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="stack gap-24">
        <header className="page-head">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-sub muted">No data yet</p>
          </div>
        </header>
        <Card padding="lg">
          <div className="empty-cta">
            <span className="empty-cta-icon"><TrendingUp size={28} /></span>
            <h3>Analytics will appear after your first sale</h3>
            <p className="muted">
              Complete a sale in the POS to see revenue, top products, payment mix and trends here.
            </p>
            <a href="/pos"><Button>Open POS</Button></a>
          </div>
        </Card>
        <style>{`
          .empty-cta {
            display: flex; flex-direction: column; align-items: center; text-align: center;
            padding: 40px 24px; gap: 10px;
          }
          .empty-cta-icon {
            width: 64px; height: 64px; border-radius: 20px;
            background: var(--primary-50); color: var(--primary);
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 8px;
          }
          .empty-cta h3 { font-size: 18px; font-weight: 700; margin: 4px 0 0; }
          .empty-cta p { max-width: 380px; font-size: 13.5px; line-height: 1.6; margin: 0 0 12px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub muted">Understand trends, products and profitability</p>
        </div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <div className="row gap-8">
            <Calendar size={15} className="muted" />
            <select className="select" value={range} onChange={e => setRange(e.target.value)}>
              {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={exportCsv}>
            Export
          </Button>
        </div>
      </header>

      <section className="an-kpis">
        <KpiTile label="Total revenue" value={formatKSh(kpis.revenue)} delta={0} tone="primary" />
        <KpiTile label="Total orders" value={kpis.orders.toLocaleString()} delta={0} tone="info" />
        <KpiTile label="Gross profit" value={formatKSh(kpis.profit)} delta={0} tone="success" />
        <KpiTile label="Average order" value={formatKSh(kpis.avgOrder)} delta={0} tone="primary" />
        <KpiTile label="Profit margin" value={`${kpis.margin}%`} delta={0} tone="success" />
      </section>

      <section className="an-grid-2">
        <Card title="Revenue and profit trend" subtitle="Monthly performance">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="anRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d5efc" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6d5efc" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef0f7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => formatKSh(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6d5efc" strokeWidth={2.5} fill="url(#anRev)" />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#22d3ee" strokeWidth={2} fill="url(#anProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Orders" subtitle="Volume per month">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eef0f7" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="orders" name="Orders" fill="#6d5efc" radius={[8, 8, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="an-grid-2">
        <Card title="Sales by category" subtitle="Revenue and units">
          {categorySales.length === 0 ? (
            <div className="an-empty muted">No category data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categorySales} layout="vertical" margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f7" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={v => formatKSh(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" name="Revenue" fill="#6d5efc" radius={[0, 8, 8, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Payment method split" subtitle="Cash vs M-Pesa">
          <div style={{ height: 300, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 200, height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={paymentMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {paymentMix.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => `${v}%`} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="stack gap-14" style={{ flex: 1 }}>
              {paymentMix.map(d => (
                <div key={d.name} className="row between">
                  <span className="row gap-8">
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                    <span style={{ fontSize: 13.5 }}>{d.name}</span>
                  </span>
                  <span className="mono bold">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="an-grid-2">
        <Card
          title="Top-selling products"
          subtitle="By revenue this period"
          action={<Badge tone="success"><TrendingUp size={12} /> Best</Badge>}
        >
          {productPerformance.top.length === 0 ? (
            <div className="an-empty muted">No product sales yet.</div>
          ) : (
            <ul className="rank-list">
              {productPerformance.top.map((p, i) => {
                const max = Math.max(...productPerformance.top.map(x => x.revenue), 1);
                const pct = Math.round((p.revenue / max) * 100);
                return (
                  <li key={p.name} className="rank-item">
                    <span className="rank-num">{i + 1}</span>
                    <div className="rank-main">
                      <div className="row between">
                        <span className="rank-name">{p.name}</span>
                        <span className="mono bold">{formatKSh(p.revenue)}</span>
                      </div>
                      <div className="rank-bar">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <div className="rank-sub muted">{p.sold} units sold</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Slow-moving products"
          subtitle="Consider promotions or removal"
          action={<Badge tone="warning"><TrendingDown size={12} /> Watch</Badge>}
        >
          {productPerformance.worst.length === 0 ? (
            <div className="an-empty muted">No product sales yet.</div>
          ) : (
            <ul className="rank-list">
              {productPerformance.worst.map((p, i) => (
                <li key={p.name} className="rank-item">
                  <span className="rank-num warn">{i + 1}</span>
                  <div className="rank-main">
                    <div className="row between">
                      <span className="rank-name">{p.name}</span>
                      <span className="mono bold">{formatKSh(p.revenue)}</span>
                    </div>
                    <div className="rank-sub muted">{p.sold} units sold</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <style>{`
        .an-empty {
          padding: 40px 20px; text-align: center; font-size: 13.5px;
        }
      `}</style>
    </div>
  );
}

function KpiTile({ label, value }) {
  return (
    <div className="an-kpi">
      <div className="an-kpi-label">{label}</div>
      <div className="an-kpi-value mono">{value}</div>
    </div>
  );
}