// CustomerProfile.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, DollarSign, Mail, Phone, ShoppingCart, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import StatCard from '../dashboard/StatCard';
import { customerService } from '@/services/customerService';
import { formatKSh } from '@/utils/format';
import './CustomerProfile.css';

const statusTone = {
  COMPLETED: 'success',
  PENDING: 'warning',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

export default function CustomerProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const c = await customerService.get(id);
      setCustomer(c);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 220 }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="stack gap-16">
        <h1 className="page-title">Customer not found</h1>
        <p className="muted">This customer may have been removed.</p>
        <Link to="/customers"><Button variant="outline" leftIcon={<ArrowLeft size={14} />}>Back to customers</Button></Link>
      </div>
    );
  }

  const columns = [
    { key: 'id', label: 'Order', render: o => <span className="bold">#{o.id}</span> },
    { key: 'date', label: 'Date', render: o => <span className="mono faint" style={{ fontSize: 12 }}>{o.date}</span> },
    { key: 'items', label: 'Items', align: 'center' },
    { key: 'total', label: 'Total', align: 'right', render: o => <span className="mono bold">{formatKSh(o.total)}</span> },
    { key: 'method', label: 'Method', render: o => (
      <Badge tone={o.method === 'M-Pesa' ? 'primary' : 'neutral'}>{o.method}</Badge>
    )},
    { key: 'status', label: 'Status', render: o => <Badge tone={statusTone[o.status]}>{o.status}</Badge> },
  ];

  return (
    <div className="stack gap-24">
      <button className="back-link" onClick={() => nav('/customers')}>
        <ArrowLeft size={14} /> Back to customers
      </button>

      <header className="cp-head">
        <div className="cp-ident">
          <div className="cp-avatar">{customer.name[0]}</div>
          <div>
            <h1 className="cp-name">{customer.name}</h1>
            <div className="cp-meta">
              <span><Phone size={13} /> {customer.phone}</span>
              {customer.email && <span><Mail size={13} /> {customer.email}</span>}
              {customer.last && <span><Calendar size={13} /> Last purchase {customer.last}</span>}
            </div>
          </div>
        </div>
      </header>

      <section className="cp-kpis">
        <StatCard label="Total spent" value={formatKSh(customer.spent)} icon={DollarSign} tone="success" />
        <StatCard label="Orders placed" value={customer.orders} icon={ShoppingCart} tone="primary" />
        <StatCard
          label="Average order"
          value={formatKSh(customer.orders ? Math.round(customer.spent / customer.orders) : 0)}
          icon={Wallet}
          tone="info"
        />
        <StatCard label="Outstanding" value={formatKSh(0)} icon={Wallet} tone="warning" sub="no balances" />
      </section>

      <Card
        title="Purchase history"
        subtitle={`${customer.history?.length ?? 0} recent orders`}
        action={<Button size="sm" variant="outline">Export</Button>}
      >
        <Table
          columns={columns}
          rows={customer.history || []}
          empty="No purchase history yet."
        />
      </Card>
    </div>
  );
}