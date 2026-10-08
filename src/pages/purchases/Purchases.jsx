import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Clock, Download, PackageCheck, Plus, Search, ShoppingBag,
  Truck, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import StatCard from '@/components/dashboard/StatCard';
import { purchaseService } from '@/services/purchaseService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { formatKSh } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import './Purchases.css';

const STATUS_TONE = {
  draft: 'neutral',
  ordered: 'info',
  partial: 'warning',
  received: 'success',
  cancelled: 'danger',
};

const STATUS_LABEL = {
  draft: 'Draft',
  ordered: 'Ordered',
  partial: 'Partial',
  received: 'Received',
  cancelled: 'Cancelled',
};

export default function Purchases() {
  const toast = useToast();
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    received: 0,
    payable: 0,
    paid: 0,
    outstanding: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const debouncedSearch = useDebounce(search, 200);

  const load = async () => {
    setLoading(true);
    const [list, sum] = await Promise.all([
      purchaseService.list({ search: debouncedSearch, status }),
      purchaseService.summary(),
    ]);
    setRows(list);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedSearch, status]);

  useEffect(() => {
    const off1 = eventBus.on(EVENTS.PO_CREATED, load);
    const off2 = eventBus.on(EVENTS.PO_UPDATED, load);
    const off3 = eventBus.on(EVENTS.SUPPLIER_PAYMENT, load);
    return () => { off1(); off2(); off3(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    if (!rows.length) {
      toast.warning('Nothing to export.');
      return;
    }
    const header = ['PO Number', 'Supplier', 'Status', 'Items', 'Total', 'Received'];
    const csv = [
      header.join(','),
      ...rows.map(r => {
        const receivedCount = r.items.reduce((s, i) => s + (i.received || 0), 0);
        const totalCount = r.items.reduce((s, i) => s + i.qty, 0);
        return [
          r.number,
          `"${r.supplierName}"`,
          r.status,
          r.items.length,
          r.total,
          `${receivedCount}/${totalCount}`,
        ].join(',');
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sokoni-purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Purchases exported.');
  };

  const columns = useMemo(() => [
    {
      key: 'number',
      label: 'PO',
      render: p => (
        <div>
          <div className="bold mono">{p.number}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {p.items.length} line{p.items.length === 1 ? '' : 's'}
          </div>
        </div>
      ),
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      render: p => <span>{p.supplierName}</span>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: p => (
        <span className="mono faint" style={{ fontSize: 12 }}>
          {new Date(p.createdAt).toLocaleDateString('en-KE', {
            day: 'numeric', month: 'short',
          })}
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'Received',
      align: 'center',
      render: p => {
        const receivedCount = p.items.reduce((s, i) => s + (i.received || 0), 0);
        const totalCount = p.items.reduce((s, i) => s + i.qty, 0);
        const pct = totalCount ? Math.round((receivedCount / totalCount) * 100) : 0;
        return (
          <div className="pu-progress">
            <div className="pu-progress-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="mono pu-progress-text">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: p => <span className="mono bold">{formatKSh(p.total)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: p => (
        <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: p => (
        <button
          className="pu-open"
          onClick={e => { e.stopPropagation(); nav(`/purchases/${p.id}`); }}
          aria-label="Open"
        >
          <ArrowRight size={14} />
        </button>
      ),
    },
  ], [nav]);

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-sub muted">
            Purchase orders and stock receipts from your suppliers
          </p>
        </div>
        <div className="row gap-8">
          <Button variant="outline" leftIcon={<Download size={14} />} onClick={exportCsv}>
            Export
          </Button>
          <Link to="/purchases/new">
            <Button leftIcon={<Plus size={14} />}>New purchase order</Button>
          </Link>
        </div>
      </header>

      <section className="pu-kpis">
        <StatCard
          label="Total orders"
          value={summary.total}
          icon={ShoppingBag}
          tone="primary"
        />
        <StatCard
          label="Open orders"
          value={summary.open}
          icon={Clock}
          tone="warning"
          sub="draft, ordered or partial"
        />
        <StatCard
          label="Fully received"
          value={summary.received}
          icon={PackageCheck}
          tone="success"
        />
        <StatCard
          label="Outstanding payable"
          value={formatKSh(summary.outstanding)}
          icon={Wallet}
          tone="danger"
          sub={`${formatKSh(summary.paid)} paid`}
        />
      </section>

      <Card padding="md">
        <div className="pu-toolbar">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="Search by PO number or supplier"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <select
            className="pu-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : rows.length === 0 ? (
            <div className="pu-empty">
              <span className="pu-empty-icon"><Truck size={28} /></span>
              <h3>No purchase orders yet</h3>
              <p className="muted">
                Create a purchase order to record what you're buying from a
                supplier. When stock arrives, receive it against the order and
                your inventory updates automatically.
              </p>
              <Link to="/purchases/new">
                <Button leftIcon={<Plus size={14} />}>Create your first PO</Button>
              </Link>
            </div>
          ) : (
            <Table
              columns={columns}
              rows={rows}
              onRowClick={p => nav(`/purchases/${p.id}`)}
            />
          )}
        </div>
      </Card>
    </div>
  );
}