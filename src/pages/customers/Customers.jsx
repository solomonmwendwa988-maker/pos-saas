import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Eye, Plus, Search, UserPlus, Users, Wallet } from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatCard from '../dashboard/StatCard';
import CustomerForm from './CustomerForm';
import { customerService } from '@/services/customerService';
import { formatKSh, formatNumber } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import './Customers.css';

export default function Customers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  const load = async () => {
    setLoading(true);
    const list = await customerService.list(debouncedSearch);
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [debouncedSearch]);

  const totals = {
    count: rows.length,
    revenue: rows.reduce((s, c) => s + c.spent, 0),
    topSpender: rows.reduce((top, c) => (c.spent > (top?.spent ?? 0) ? c : top), null),
    outstanding: 0,
  };

  const save = async data => {
    if (editing) {
      await customerService.update(editing.id, data);
      setRows(prev => prev.map(c => (c.id === editing.id ? { ...c, ...data } : c)));
      toast.success('Customer updated.');
    } else {
      const created = await customerService.create(data);
      setRows(prev => [created, ...prev]);
      toast.success('Customer created.');
    }
    setOpenForm(false);
    setEditing(null);
  };

  const remove = async () => {
    if (confirm) {
      await customerService.remove(confirm.id);
      setRows(prev => prev.filter(c => c.id !== confirm.id));
      toast.success('Customer deleted.');
    }
    setConfirm(null);
  };

  const columns = [
    { key: 'name', label: 'Customer', render: c => (
      <div className="cust-cell">
        <span className="cust-avatar">{c.name[0]}</span>
        <div>
          <div className="bold">{c.name}</div>
          <div className="mono faint" style={{ fontSize: 11 }}>{c.phone}</div>
        </div>
      </div>
    )},
    { key: 'email', label: 'Email', render: c => <span className="muted">{c.email || '—'}</span> },
    { key: 'orders', label: 'Orders', align: 'center', render: c => <span className="mono bold">{c.orders}</span> },
    { key: 'spent', label: 'Total spent', align: 'right', render: c => (
      <span className="mono bold">{formatKSh(c.spent)}</span>
    )},
    { key: 'last', label: 'Last purchase', render: c => (
      <span className="mono faint" style={{ fontSize: 12 }}>{c.last || '—'}</span>
    )},
    { key: 'actions', label: '', align: 'right', render: c => (
      <div className="row gap-4" style={{ justifyContent: 'flex-end' }}>
        <Link to={`/customers/${c.id}`} className="icon-btn" aria-label="View profile">
          <Eye size={15} />
        </Link>
        <button className="icon-btn danger" onClick={() => setConfirm(c)} aria-label="Delete">
          <UserPlus size={15} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub muted">Track purchases, balances and repeat buyers</p>
        </div>
        <Button leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setOpenForm(true); }}>
          Add customer
        </Button>
      </header>

      <section className="cust-kpis">
        <StatCard label="Total customers" value={formatNumber(totals.count)} icon={Users} tone="primary" />
        <StatCard label="Lifetime revenue" value={formatKSh(totals.revenue)} icon={DollarSign} tone="success" />
        <StatCard label="Top spender" value={totals.topSpender?.name ?? '—'} icon={Wallet} tone="info" sub={totals.topSpender ? formatKSh(totals.topSpender.spent) : ''} />
        <StatCard label="Outstanding" value={formatKSh(totals.outstanding)} icon={Wallet} tone="warning" sub="customer balances" />
      </section>

      <Card padding="md">
        <div style={{ marginBottom: 14 }}>
          <Input
            placeholder="Search by name, phone or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={15} />}
          />
        </div>
        <Table
          columns={columns}
          rows={rows}
          empty={loading ? 'Loading customers…' : 'No customers found.'}
        />
      </Card>

      <Modal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditing(null); }}
        title={editing ? 'Edit customer' : 'Add customer'}
        subtitle={editing ? `Editing ${editing.name}` : 'Save a new customer record'}
        size="md"
      >
        <CustomerForm
          initial={editing}
          onSubmit={save}
          onCancel={() => { setOpenForm(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="Delete customer"
        message={confirm ? `Delete "${confirm.name}"? Their purchase history will be archived.` : ''}
        confirmLabel="Delete"
      />

      <style>{`
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .icon-btn:hover { background: var(--bg-soft); color: var(--primary); border-color: var(--primary); }
        .icon-btn.danger:hover { color: var(--danger); border-color: #fecaca; background: var(--danger-bg); }
      `}</style>
    </div>
  );
}