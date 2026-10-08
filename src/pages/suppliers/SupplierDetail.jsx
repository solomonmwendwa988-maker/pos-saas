import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, CreditCard, DollarSign, Mail,
  Phone, Plus, ShoppingBag, TrendingUp, Truck, User, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import StatCard from '@/components/dashboard/StatCard';
import { supplierService } from '@/services/supplierService';
import { purchaseService } from '@/services/purchaseService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import { formatLongDateTime, formatShortDate } from '@/utils/billing';
import './SupplierDetail.css';

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

export default function SupplierDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();

  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, pos, pays] = await Promise.all([
      supplierService.list(),
      purchaseService.list({ supplierId: id }),
      purchaseService.listSupplierPayments(id),
    ]);
    const s = list.find(x => x.id === id) || null;
    setSupplier(s);
    setPurchases(pos);
    setPayments(pays);
    setBalance(purchaseService.supplierBalance(id));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off1 = eventBus.on(EVENTS.PO_UPDATED, load);
    const off2 = eventBus.on(EVENTS.SUPPLIER_PAYMENT, load);
    return () => { off1(); off2(); };
  }, [load]);

  const openPay = () => {
    setPayAmount(balance > 0 ? String(balance) : '');
    setPayMethod('cash');
    setPayRef('');
    setPayNote('');
    setPayOpen(true);
  };

  const doPay = async () => {
    const amt = Number(payAmount) || 0;
    if (amt <= 0) {
      toast.warning('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    try {
      await purchaseService.recordSupplierPayment({
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: amt,
        method: payMethod,
        reference: payRef,
        note: payNote,
      });
      toast.success(`Payment of ${formatKSh(amt)} recorded.`);
      setPayOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not record payment.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 260 }} />
        <div className="skeleton" style={{ height: 140 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="stack gap-16">
        <h1 className="page-title">Supplier not found</h1>
        <Link to="/suppliers">
          <Button variant="outline" leftIcon={<ArrowLeft size={14} />}>
            Back to suppliers
          </Button>
        </Link>
      </div>
    );
  }

  const purchaseColumns = [
    {
      key: 'number',
      label: 'PO',
      render: p => (
        <div>
          <div className="mono bold">{p.number}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            {p.items.length} line{p.items.length === 1 ? '' : 's'}
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: p => (
        <span className="mono faint" style={{ fontSize: 12 }}>
          {formatShortDate(new Date(p.createdAt).toISOString())}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: p => <span className="mono bold">{formatKSh(p.total)}</span>,
    },
    {
      key: 'received',
      label: 'Received',
      align: 'right',
      render: p => {
        const val = p.items.reduce(
          (s, i) => s + (i.received || 0) * i.buyingPrice,
          0
        );
        return <span className="mono">{formatKSh(val)}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: p => (
        <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
      ),
    },
  ];

  const paymentColumns = [
    {
      key: 'createdAt',
      label: 'Date',
      render: p => (
        <span className="mono faint" style={{ fontSize: 12 }}>
          {formatLongDateTime(new Date(p.createdAt).toISOString())}
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Method',
      render: p => (
        <Badge tone={p.method === 'mpesa' ? 'primary' : 'neutral'}>
          {p.method === 'mpesa' ? 'M-Pesa' : 'Cash'}
        </Badge>
      ),
    },
    {
      key: 'reference',
      label: 'Reference',
      render: p => (
        <span className="mono" style={{ fontSize: 12 }}>
          {p.reference || '—'}
        </span>
      ),
    },
    {
      key: 'note',
      label: 'Note',
      render: p => <span className="muted">{p.note || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: p => (
        <span className="mono bold" style={{ color: 'var(--success)' }}>
          {formatKSh(p.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <button className="back-link" onClick={() => nav('/suppliers')}>
            <ArrowLeft size={14} /> Back to suppliers
          </button>
          <h1 className="page-title">{supplier.name}</h1>
          <p className="page-sub muted">
            {supplier.contact}
            {supplier.phone ? ` · ${supplier.phone}` : ''}
          </p>
        </div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <Link to="/purchases/new">
            <Button variant="outline" leftIcon={<ShoppingBag size={14} />}>
              New purchase order
            </Button>
          </Link>
          <Button leftIcon={<DollarSign size={14} />} onClick={openPay}>
            Record payment
          </Button>
        </div>
      </header>

      <section className="sd-kpis">
        <StatCard
          label="Outstanding balance"
          value={formatKSh(balance)}
          icon={Wallet}
          tone={balance > 0 ? 'danger' : 'success'}
          sub={balance > 0 ? 'owes supplier' : 'settled'}
        />
        <StatCard
          label="Total purchases"
          value={purchases.length}
          icon={ShoppingBag}
          tone="primary"
        />
        <StatCard
          label="Payments made"
          value={formatKSh(payments.reduce((s, p) => s + p.amount, 0))}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Contact"
          value={supplier.contact || '—'}
          icon={User}
          tone="info"
          sub={supplier.status === 'active' ? 'Active' : 'Inactive'}
        />
      </section>

      <Card title="Contact details">
        <div className="sd-contact-grid">
          <div className="sd-contact-cell">
            <span className="sd-contact-icon"><Building2 size={15} /></span>
            <div>
              <div className="sd-contact-label">Contact person</div>
              <div className="sd-contact-value">{supplier.contact || '—'}</div>
            </div>
          </div>
          <div className="sd-contact-cell">
            <span className="sd-contact-icon"><Phone size={15} /></span>
            <div>
              <div className="sd-contact-label">Phone</div>
              <div className="sd-contact-value mono">{supplier.phone || '—'}</div>
            </div>
          </div>
          <div className="sd-contact-cell">
            <span className="sd-contact-icon"><Mail size={15} /></span>
            <div>
              <div className="sd-contact-label">Email</div>
              <div className="sd-contact-value">{supplier.email || '—'}</div>
            </div>
          </div>
          <div className="sd-contact-cell">
            <span className="sd-contact-icon"><Calendar size={15} /></span>
            <div>
              <div className="sd-contact-label">Status</div>
              <div className="sd-contact-value">
                <Badge tone={supplier.status === 'active' ? 'success' : 'neutral'}>
                  {supplier.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Purchase orders"
        subtitle={`${purchases.length} order${purchases.length === 1 ? '' : 's'}`}
      >
        <Table
          columns={purchaseColumns}
          rows={purchases}
          empty="No purchase orders for this supplier yet."
          onRowClick={p => nav(`/purchases/${p.id}`)}
        />
      </Card>

      <Card
        title="Payment history"
        subtitle={`${payments.length} payment${payments.length === 1 ? '' : 's'} recorded`}
        action={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Plus size={13} />}
            onClick={openPay}
          >
            Record payment
          </Button>
        }
      >
        <Table
          columns={paymentColumns}
          rows={payments}
          empty="No payments recorded yet."
        />
      </Card>

      {/* Payment modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record payment"
        subtitle={supplier.name}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={doPay} loading={busy} leftIcon={<DollarSign size={14} />}>
              Record payment
            </Button>
          </>
        }
      >
        <div className="stack gap-14">
          <div className="sd-pay-balance">
            <span className="muted">Current balance</span>
            <span className="mono bold">{formatKSh(balance)}</span>
          </div>

          <Input
            label="Amount (KSh)"
            type="number"
            min="0"
            value={payAmount}
            onChange={e => setPayAmount(e.target.value)}
            autoFocus
          />

          <div className="field">
            <label className="field-label">Payment method</label>
            <div className="field-control">
              <select
                className="field-input"
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
              </select>
            </div>
          </div>

          <Input
            label="Reference (optional)"
            value={payRef}
            onChange={e => setPayRef(e.target.value)}
            placeholder={payMethod === 'mpesa' ? 'e.g. QK12H7X9AB' : 'e.g. receipt number'}
          />

          <div className="field">
            <label className="field-label">Note (optional)</label>
            <div className="field-control" style={{ padding: 0 }}>
              <textarea
                rows={2}
                className="field-input"
                style={{ padding: '10px 12px', resize: 'vertical' }}
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                placeholder="Any details about this payment"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}