import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Eye, Plus, Search, TrendingUp, Users, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatCard from '@/components/dashboard/StatCard';
import CustomerForm from './CustomerForm';
import { customerService } from '@/services/customerService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { formatKSh, formatNumber } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import './Customers.css';

export default function Customers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  const load = async () => {
    setLoading(true);
    const list = await customerService.listWithBalances(debouncedSearch);
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    const off = eventBus.on(EVENTS.CUSTOMER_LEDGER_CHANGED, load);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter(c => {
    if (filter === 'owing') return c.balance > 0;
    if (filter === 'clear') return Math.abs(c.balance) < 0.01;
    return true;
  });

  const totals = {
    count: filtered.length,
    revenue: filtered.reduce((s, c) => s + (c.spent || 0), 0),
    outstanding: filtered.reduce((s, c) => s + Math.max(0, c.balance || 0), 0),
    owingCount: filtered.filter(c => c.balance > 0).length,
  };

  const save = async data => {
    if (editing) {
      await customerService.update(editing.id, data);
      toast.success('Customer updated.');
    } else {
      await customerService.create(data);
      toast.success('Customer created.');
    }
    setOpenForm(false);
    setEditing(null);
    await load();
  };

  const remove = async () => {
    if (confirm) {
      try {
        await customerService.remove(confirm.id);
        toast.success('Customer deleted.');
        setConfirm(null);
        await load();
      } catch (err) {
        toast.error(err.message);
        setConfirm(null);
      }
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: c => (
        <div className="cust-cell">
          <span className="cust-avatar">{c.name[0]}</span>
          <div>
            <div className="bold">{c.name}</div>
            <div className="mono faint" style={{ fontSize: 11 }}>
              {c.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: c => <span className="muted">{c.email || '—'}</span>,
    },
    {
      key: 'orders',
      label: 'Orders',
      align: 'center',
      render: c => <span className="mono bold">{c.orders}</span>,
    },
    {
      key: 'spent',
      label: 'Total spent',
      align: 'right',
      render: c => <span className="mono bold">{formatKSh(c.spent)}</span>,
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: c => {
        const b = c.balance || 0;
        if (Math.abs(b) < 0.01) {
          return <span className="muted">—</span>;
        }
        return (
          <Badge tone={b > 0 ? 'danger' : 'info'}>
            {formatKSh(Math.abs(b))} {b > 0 ? 'due' : 'credit'}
          </Badge>
        );
      },
    },
    {
      key: 'last',
      label: 'Last purchase',
      render: c => (
        <span className="mono faint" style={{ fontSize: 12 }}>
          {c.last || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: c => (
        <Link to={`/customers/${c.id}`} className="icon-btn" aria-label="View profile">
          <Eye size={15} />
        </Link>
      ),
    },
  ];

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub muted">
            Track purchases, balances and repeat buyers
          </p>
        </div>
        <Button
          leftIcon={<Plus size={14} />}
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
        >
          Add customer
        </Button>
      </header>

      <section className="cust-kpis">
        <StatCard label="Total customers" value={formatNumber(totals.count)} icon={Users} tone="primary" />
        <StatCard label="Lifetime revenue" value={formatKSh(totals.revenue)} icon={DollarSign} tone="success" />
        <StatCard
          label="Outstanding"
          value={formatKSh(totals.outstanding)}
          icon={Wallet}
          tone={totals.outstanding > 0 ? 'danger' : 'success'}
          sub={totals.owingCount > 0 ? `${totals.owingCount} customers owe` : 'all settled'}
        />
        <StatCard
          label="Average spent"
          value={formatKSh(totals.count ? Math.round(totals.revenue / totals.count) : 0)}
          icon={TrendingUp}
          tone="info"
        />
      </section>

      <Card padding="md">
        <div className="cust-toolbar">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="Search by name, phone or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <div className="cust-filters">
            {[
              { id: 'all', label: 'All' },
              { id: 'owing', label: 'Owing' },
              { id: 'clear', label: 'Settled' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`cust-filter ${filter === f.id ? 'on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            rows={filtered}
            empty={loading ? 'Loading customers…' : 'No customers found.'}
          />
        </div>
      </Card>

      <Modal
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
        title={editing ? 'Edit customer' : 'Add customer'}
        subtitle={editing ? `Editing ${editing.name}` : 'Save a new customer record'}
        size="md"
      >
        <CustomerForm
          initial={editing}
          onSubmit={save}
          onCancel={() => {
            setOpenForm(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="Delete customer"
        message={
          confirm
            ? `Delete "${confirm.name}"? Their purchase history will be archived.`
            : ''
        }
        confirmLabel="Delete"
      />

      <style>{`
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .icon-btn:hover {
          background: var(--bg-soft); color: var(--primary);
          border-color: var(--primary);
        }
        .cust-toolbar {
          display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
        }
        .cust-filters { display: flex; gap: 4px; }
        .cust-filter {
          padding: 8px 14px; border-radius: 999px;
          background: #fff; border: 1px solid var(--border);
          font-size: 12.5px; font-weight: 600; color: var(--text-muted);
          cursor: pointer; transition: all var(--dur);
        }
        .cust-filter:hover { border-color: var(--border-strong); color: var(--text); }
        .cust-filter.on {
          background: var(--primary); color: #fff; border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}