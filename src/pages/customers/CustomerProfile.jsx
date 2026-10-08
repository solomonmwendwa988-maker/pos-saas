import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, DollarSign, FileText, Mail, Phone, ShoppingCart,
  Sparkles, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import StatCard from '@/components/dashboard/StatCard';
import RecordPaymentModal from '@/components/customers/RecordPaymentModal';
import LedgerTable from '@/components/customers/LedgerTable';
import { customerService } from '@/services/customerService';
import { customerLedgerService } from '@/services/customerLedgerService';
import { loyaltyService } from '@/services/loyaltyService';
import { pdfService } from '@/services/pdfService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { computeCustomerAging } from '@/utils/aging';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import './CustomerProfile.css';

const statusTone = {
  COMPLETED: 'success',
  PENDING: 'warning',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

const LEDGER_TYPE_LABEL = {
  opening: 'Opening balance',
  credit_sale: 'Credit sale',
  payment: 'Payment',
  adjustment: 'Adjustment',
};

export default function CustomerProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { business } = useBusiness();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders');
  const [ledger, setLedger] = useState([]);
  const [aging, setAging] = useState(null);
  const [balance, setBalance] = useState(0);

  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [loyaltyBal, setLoyaltyBal] = useState(0);

  const [showPayment, setShowPayment] = useState(false);
  const [statementBusy, setStatementBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const c = await customerService.get(id);
    setCustomer(c);
    if (c) {
      const entries = customerLedgerService.forCustomer(id);
      setLedger(entries);
      setBalance(customerLedgerService.balanceFor(id));
      setAging(computeCustomerAging(entries));

      const loyaltyEntries = loyaltyService.history(id);
      setLoyaltyHistory(loyaltyEntries);
      setLoyaltyBal(loyaltyService.balance(id));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const offLedger = eventBus.on(EVENTS.CUSTOMER_LEDGER_CHANGED, payload => {
      if (!payload || payload.customerId === id) load();
    });
    const offSale = eventBus.on(EVENTS.SALE_COMPLETED, load);
    return () => {
      offLedger();
      offSale();
    };
  }, [id, load]);

  const downloadStatement = async () => {
    if (!customer) return;
    setStatementBusy(true);
    try {
      const entries = customerLedgerService.forCustomer(customer.id);
      const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);

      const items = sorted.map(e => {
        const dateStr = new Date(e.createdAt).toLocaleDateString('en-KE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const typeLabel = LEDGER_TYPE_LABEL[e.type] || e.type;
        const description = `${dateStr} · ${typeLabel}${
          e.reference ? ' · ' + e.reference : ''
        }`;
        return {
          description,
          qty: e.amount > 0 ? 1 : 0,
          unitPrice: e.amount,
          total: e.amount,
        };
      });

      const totalDebit = sorted
        .filter(e => e.amount > 0)
        .reduce((s, e) => s + e.amount, 0);
      const totalCredit = sorted
        .filter(e => e.amount < 0)
        .reduce((s, e) => s + Math.abs(e.amount), 0);

      const blob = await pdfService.generateInvoicePdf({
        documentType: 'STATEMENT',
        documentNumber: customer.id.slice(-8).toUpperCase(),
        issuedDate: new Date().toLocaleDateString('en-KE'),
        business,
        partyLabel: 'Statement for',
        party: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
        items:
          items.length > 0
            ? items
            : [
                {
                  description: 'No transactions recorded',
                  qty: '',
                  unitPrice: '',
                  total: 0,
                },
              ],
        totals: {
          'Total charges': totalDebit,
          'Total payments': totalCredit,
          'Balance due': Math.max(0, balance),
        },
        notes:
          balance > 0
            ? 'Please settle the outstanding balance at your earliest convenience.'
            : 'Thank you. Your account is fully settled.',
        meta: [
          { label: 'Issued', value: new Date().toLocaleDateString('en-KE') },
          { label: 'Phone', value: customer.phone || '—' },
        ],
      });
      const safeName = (customer.name || 'customer').replace(/\s+/g, '-');
      pdfService.downloadBlob(blob, `statement-${safeName}.pdf`);
      toast.success('Statement downloaded.');
    } catch (err) {
      toast.error(err.message || 'Could not generate statement.');
    } finally {
      setStatementBusy(false);
    }
  };

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
        <Link to="/customers">
          <Button variant="outline" leftIcon={<ArrowLeft size={14} />}>
            Back to customers
          </Button>
        </Link>
      </div>
    );
  }

  const orderColumns = [
    {
      key: 'id',
      label: 'Order',
      render: o => <span className="bold">#{o.id}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: o => (
        <span className="mono faint" style={{ fontSize: 12 }}>
          {o.date}
        </span>
      ),
    },
    { key: 'items', label: 'Items', align: 'center' },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: o => <span className="mono bold">{formatKSh(o.total)}</span>,
    },
    {
      key: 'method',
      label: 'Method',
      render: o => {
        if (o.paymentStatus === 'credit') {
          return <Badge tone="warning">On credit</Badge>;
        }
        if (o.payments && o.payments.length > 1) {
          return <Badge tone="info">Split</Badge>;
        }
        return (
          <Badge tone={o.method === 'M-Pesa' ? 'primary' : 'neutral'}>
            {o.method}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: o => <Badge tone={statusTone[o.status]}>{o.status}</Badge>,
    },
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
              <span>
                <Phone size={13} /> {customer.phone}
              </span>
              {customer.email && (
                <span>
                  <Mail size={13} /> {customer.email}
                </span>
              )}
              {customer.last && (
                <span>
                  <Calendar size={13} /> Last purchase {customer.last}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            leftIcon={<FileText size={14} />}
            loading={statementBusy}
            onClick={downloadStatement}
          >
            Download statement
          </Button>
          <Button
            leftIcon={<DollarSign size={14} />}
            onClick={() => setShowPayment(true)}
            disabled={balance <= 0}
          >
            Record payment
          </Button>
        </div>
      </header>

      <section className="cp-kpis">
        <StatCard
          label="Outstanding balance"
          value={formatKSh(Math.max(0, balance))}
          icon={Wallet}
          tone={balance > 0 ? 'danger' : 'success'}
          sub={balance > 0 ? 'owes the business' : 'settled'}
        />
        <StatCard
          label="Total spent"
          value={formatKSh(customer.spent)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Orders placed"
          value={customer.orders}
          icon={ShoppingCart}
          tone="primary"
        />
        <StatCard
          label="Loyalty points"
          value={loyaltyBal}
          icon={Sparkles}
          tone="info"
          sub={`Worth ${formatKSh(loyaltyService.pointsToValue(loyaltyBal))}`}
        />
      </section>

      {aging && aging.total > 0 && (
        <Card title="Aged receivables" subtitle="Outstanding balance by age">
          <div className="aging-grid">
            <div className="aging-cell">
              <div className="aging-label">0 – 30 days</div>
              <div className="aging-value mono">{formatKSh(aging.current)}</div>
            </div>
            <div className={`aging-cell ${aging.d30 > 0 ? 'warn' : ''}`}>
              <div className="aging-label">31 – 60 days</div>
              <div className="aging-value mono">{formatKSh(aging.d30)}</div>
            </div>
            <div className={`aging-cell ${aging.d60 > 0 ? 'warn' : ''}`}>
              <div className="aging-label">61 – 90 days</div>
              <div className="aging-value mono">{formatKSh(aging.d60)}</div>
            </div>
            <div className={`aging-cell ${aging.d90 > 0 ? 'danger' : ''}`}>
              <div className="aging-label">90+ days</div>
              <div className="aging-value mono">{formatKSh(aging.d90)}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="cp-tabs">
        <button
          type="button"
          className={`cp-tab ${tab === 'orders' ? 'on' : ''}`}
          onClick={() => setTab('orders')}
        >
          Purchase history
        </button>
        <button
          type="button"
          className={`cp-tab ${tab === 'ledger' ? 'on' : ''}`}
          onClick={() => setTab('ledger')}
        >
          Ledger
          {ledger.length > 0 && (
            <span className="cp-tab-badge">{ledger.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`cp-tab ${tab === 'loyalty' ? 'on' : ''}`}
          onClick={() => setTab('loyalty')}
        >
          Loyalty
          {loyaltyBal > 0 && (
            <span className="cp-tab-badge">{loyaltyBal}</span>
          )}
        </button>
      </div>

      {tab === 'orders' && (
        <Card padding="md">
          <Table
            columns={orderColumns}
            rows={customer.history || []}
            empty="No purchase history yet."
          />
        </Card>
      )}

      {tab === 'ledger' && (
        <Card padding="md">
          <LedgerTable entries={ledger} />
        </Card>
      )}

      {tab === 'loyalty' && (
        <Card
          padding="md"
          title="Loyalty history"
          subtitle={`${loyaltyBal} points · worth ${formatKSh(loyaltyService.pointsToValue(loyaltyBal))}`}
        >
          {loyaltyHistory.length === 0 ? (
            <div className="loyalty-empty">
              <Sparkles size={26} />
              <p>No loyalty activity yet</p>
              <span className="muted">
                Points are earned automatically on every paid sale.
              </span>
            </div>
          ) : (
            <div className="loyalty-list">
              {loyaltyHistory.map(e => (
                <div key={e.id} className="loyalty-row">
                  <span
                    className={`loyalty-points ${e.points > 0 ? 'up' : 'down'}`}
                  >
                    {e.points > 0 ? '+' : ''}
                    {e.points}
                  </span>
                  <div className="loyalty-body">
                    <div className="loyalty-reason">
                      {e.type === 'earn'
                        ? `Earned on ${formatKSh(e.amount)}`
                        : e.type === 'redeem'
                        ? `Redeemed for ${formatKSh(Math.abs(e.amount))}`
                        : 'Adjustment'}
                      {e.reference && (
                        <span className="muted"> · {e.reference}</span>
                      )}
                    </div>
                    <div className="loyalty-time">
                      {new Date(e.createdAt).toLocaleString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <RecordPaymentModal
        open={showPayment}
        customer={customer}
        balance={balance}
        onClose={() => setShowPayment(false)}
        onRecorded={load}
      />

      <style>{`
        .aging-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
        }
        @media (max-width: 720px) {
          .aging-grid { grid-template-columns: 1fr 1fr; }
        }
        .aging-cell {
          padding: 14px 16px; border-radius: 12px;
          background: var(--bg-soft);
          display: flex; flex-direction: column; gap: 6px;
        }
        .aging-cell.warn { background: var(--warning-bg); }
        .aging-cell.danger { background: var(--danger-bg); }
        .aging-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--text-faint);
        }
        .aging-value {
          font-size: 16px; font-weight: 800;
          font-family: var(--font-display);
        }
        .aging-cell.warn .aging-value { color: #92400e; }
        .aging-cell.danger .aging-value { color: #b91c1c; }

        .cp-tabs {
          display: flex; gap: 4px;
          border-bottom: 1px solid var(--border);
        }
        .cp-tab {
          padding: 10px 14px; background: transparent; border: 0;
          border-bottom: 2px solid transparent;
          font-size: 13.5px; font-weight: 600; color: var(--text-muted);
          cursor: pointer; transition: all var(--dur);
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: -1px;
        }
        .cp-tab:hover { color: var(--text); }
        .cp-tab.on {
          color: var(--primary); border-bottom-color: var(--primary);
        }
        .cp-tab-badge {
          background: var(--primary-50); color: var(--primary);
          padding: 1px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
        }

        .loyalty-list { display: flex; flex-direction: column; gap: 4px; }
        .loyalty-row {
          display: flex; gap: 12px; align-items: center;
          padding: 10px 4px;
          border-bottom: 1px dashed var(--border);
        }
        .loyalty-row:last-child { border-bottom: 0; }
        .loyalty-points {
          min-width: 56px; text-align: right;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 14px;
          font-variant-numeric: tabular-nums;
        }
        .loyalty-points.up { color: var(--success); }
        .loyalty-points.down { color: var(--danger); }
        .loyalty-body { flex: 1; min-width: 0; }
        .loyalty-reason { font-size: 13px; }
        .loyalty-time {
          font-size: 11.5px; color: var(--text-faint); margin-top: 2px;
        }
        .loyalty-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 40px 20px; text-align: center;
          color: var(--text-faint);
        }
        .loyalty-empty p {
          margin: 6px 0 0; font-weight: 700;
          color: var(--text-muted); font-size: 14px;
        }
        .loyalty-empty .muted { font-size: 12.5px; }
      `}</style>
    </div>
  );
}