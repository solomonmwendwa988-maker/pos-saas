import { useEffect, useMemo, useState } from 'react';
import {
  Download, Eye, RotateCcw, Search, ShoppingCart, TrendingUp, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import StatCard from '../dashboard/StatCard';
import OrderDetail from './OrderDetail';
import { salesService } from '@/services/salesService';
import { formatKSh, formatNumber } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import './Sales.css';

const statusTone = {
  COMPLETED: 'success',
  PENDING: 'warning',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

export default function Sales() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, count: 0, avgOrder: 0, refunded: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [openOrder, setOpenOrder] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  const load = async () => {
    setLoading(true);
    const [list, sum] = await Promise.all([
      salesService.list({ search: debouncedSearch, status, method }),
      salesService.summary(),
    ]);
    setRows(list);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedSearch, status, method]);

  const columns = useMemo(() => [
    { key: 'id', label: 'Order', render: o => (
      <div>
        <div className="bold">#{o.id}</div>
        {o.ref && <div className="mono faint" style={{ fontSize: 11 }}>{o.ref}</div>}
      </div>
    )},
    { key: 'date', label: 'Date', render: o => <span className="mono faint" style={{ fontSize: 12 }}>{o.date}</span> },
    { key: 'customer', label: 'Customer' },
    { key: 'items', label: 'Items', align: 'center' },
    { key: 'total', label: 'Total', align: 'right', render: o => <span className="mono bold">{formatKSh(o.total)}</span> },
    { key: 'method', label: 'Method', render: o => <Badge tone={o.method === 'M-Pesa' ? 'primary' : 'neutral'}>{o.method}</Badge> },
    { key: 'status', label: 'Status', render: o => <Badge tone={statusTone[o.status]}>{o.status}</Badge> },
    { key: 'cashier', label: 'Cashier', render: o => <span className="muted">{o.cashier}</span> },
    { key: 'actions', label: '', align: 'right', render: o => (
      <button
        className="icon-btn"
        onClick={e => { e.stopPropagation(); setOpenOrder(o); }}
        aria-label="View order"
      >
        <Eye size={15} />
      </button>
    )},
  ], []);

  const exportCsv = () => {
    const header = ['Order', 'Date', 'Customer', 'Items', 'Total', 'Method', 'Status', 'Cashier'];
    const lines = rows.map(r => [r.id, r.date, r.customer, r.items, r.total, r.method, r.status, r.cashier]);
    const csv = [header, ...lines].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sokoni-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sales exported to CSV.');
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-sub muted">Every transaction across your tills</p>
        </div>
        <div className="row gap-12">
          <Button variant="outline" leftIcon={<Download size={14} />} onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </header>

      <section className="sales-kpis">
        <StatCard label="Revenue" value={formatKSh(summary.revenue)} icon={TrendingUp} tone="primary" sub="this period" />
        <StatCard label="Total orders" value={formatNumber(summary.count)} icon={ShoppingCart} tone="info" />
        <StatCard label="Average order" value={formatKSh(summary.avgOrder)} icon={Wallet} tone="success" />
        <StatCard label="Refunded" value={formatKSh(summary.refunded)} icon={RotateCcw} tone="danger" sub="needs review" />
      </section>

      <Card padding="md">
        <div className="sales-toolbar">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="Search by order ID, customer or reference"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select className="select" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Cash">Cash</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            rows={rows}
            empty={loading ? 'Loading sales…' : 'No sales match your filters.'}
            onRowClick={o => setOpenOrder(o)}
          />
        </div>
      </Card>

      <OrderDetail
        open={!!openOrder}
        order={openOrder}
        onClose={() => setOpenOrder(null)}
        onRefund={async id => {
          await salesService.refund(id);
          await load();
          toast.success('Order refunded.');
        }}
      />
    </div>
  );
}