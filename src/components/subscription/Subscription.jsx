import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Calendar, Check, CreditCard, Download, Eye, RefreshCcw,
  Sparkles, TrendingUp, XCircle,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Table from '@/components/common/Table';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PlanCard from '../../pages/subscription/PlanCard';
import UsageBar from '../../pages/subscription/UsageBar';
import ComparisonTable from '../../pages/subscription/ComparisonTable';
import InvoicePreview from '../../pages/subscription/InvoicePreview';
import { subscriptionService } from '@/services/subscriptionService';
import { useSubscription } from '@/context/SubscriptionContext';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import { formatShortDate } from '@/utils/billing';
import { PLANS } from '@/config/plans';
import './Subscription.css';

const STATUS_TONE = {
  trial: 'warning',
  active: 'success',
  cancelled: 'danger',
  past_due: 'danger',
};

export default function Subscription() {
  const toast = useToast();
  const { business } = useBusiness();
  const {
    subscription,
    usage,
    limits,
    isInTrial,
    isCancelled,
    trialDaysLeft,
    cancelPendingChange,
    cancelSubscription,
    reactivate,
  } = useSubscription();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [annual, setAnnual] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setInvoices(await subscriptionService.invoices());
      setLoading(false);
    })();
  }, [subscription?.planId, subscription?.status]);

  const limitKeys = ['tills', 'products', 'customers', 'teamMembers', 'branches'];

  const usageRows = useMemo(
    () =>
      limitKeys.map(k => ({
        key: k,
        label: {
          tills: 'Till accounts',
          products: 'Products',
          customers: 'Customers',
          teamMembers: 'Team members',
          branches: 'Branches',
        }[k],
        used: usage[k] || 0,
        limit: limits[k],
      })),
    [usage, limits]
  );

  const handleCancel = async () => {
    setCancelling(true);
    await cancelSubscription('Owner requested');
    setCancelling(false);
    setConfirmCancel(false);
    toast.success('Subscription cancelled. Access continues until end of cycle.');
  };

  const handleReactivate = async () => {
    await reactivate();
    toast.success('Subscription reactivated.');
  };

  const handleCancelPending = async () => {
    await cancelPendingChange();
    toast.success('Scheduled plan change cancelled.');
  };

  const invoiceColumns = [
    { key: 'number', label: 'Invoice', render: r => (
      <span className="mono bold">{r.number}</span>
    )},
    { key: 'issuedAt', label: 'Date', render: r => (
      <span className="mono faint" style={{ fontSize: 12 }}>
        {formatShortDate(r.issuedAt)}
      </span>
    )},
    { key: 'planName', label: 'Description' },
    { key: 'cycle', label: 'Cycle', render: r => (
      <Badge tone="neutral">{r.cycle}</Badge>
    )},
    { key: 'amount', label: 'Amount', align: 'right', render: r => (
      <span className="mono bold">
        {r.amount === 0 ? 'Free' : formatKSh(r.amount)}
      </span>
    )},
    { key: 'status', label: 'Status', render: r => (
      <Badge
        tone={
          r.status === 'paid'
            ? 'success'
            : r.status === 'credited'
            ? 'info'
            : r.status === 'pending'
            ? 'warning'
            : 'danger'
        }
      >
        {r.status}
      </Badge>
    )},
    { key: 'actions', label: '', align: 'right', render: r => (
      <button
        className="sub-icon-btn"
        onClick={e => { e.stopPropagation(); setViewingInvoice(r); }}
        aria-label="View invoice"
      >
        <Eye size={14} />
      </button>
    )},
  ];

  if (loading || !subscription) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 240 }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  const plan = subscription.plan;
  const pendingPlan = subscription.pendingPlan;

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="page-sub muted">
            Manage your plan, usage, billing and invoices
          </p>
        </div>
        <div className="billing-toggle">
          <button className={!annual ? 'on' : ''} onClick={() => setAnnual(false)}>
            Monthly
          </button>
          <button className={annual ? 'on' : ''} onClick={() => setAnnual(true)}>
            Annual <span className="save-tag">Save 17%</span>
          </button>
        </div>
      </header>

      {/* ---------- Status card ---------- */}
      <section className={`sub-status sub-status-${subscription.status}`}>
        <div className="sub-status-main">
          <span className="sub-status-icon"><Sparkles size={20} /></span>
          <div className="sub-status-body">
            <div className="sub-status-row">
              <h2 className="sub-status-name">{plan.name} plan</h2>
              <Badge tone={STATUS_TONE[subscription.status] || 'neutral'}>
                {subscription.status}
              </Badge>
              {isInTrial && trialDaysLeft > 0 && (
                <span className="sub-status-chip">
                  {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in trial
                </span>
              )}
            </div>
            <p className="sub-status-tagline muted">{plan.tagline}</p>
            <div className="sub-status-meta">
              <span>
                Price:{' '}
                <strong className="mono">
                  {formatKSh(plan.price)}/month
                </strong>
              </span>
              {isInTrial && (
                <span>
                  Trial ends:{' '}
                  <strong className="mono">{formatShortDate(subscription.trialEnd)}</strong>
                </span>
              )}
              {subscription.status === 'active' && (
                <span>
                  Renews on:{' '}
                  <strong className="mono">{formatShortDate(subscription.cycleEnd)}</strong>
                </span>
              )}
              {subscription.status === 'cancelled' && (
                <span>
                  Access ends:{' '}
                  <strong className="mono">{formatShortDate(subscription.cycleEnd)}</strong>
                </span>
              )}
            </div>

            {pendingPlan && (
              <div className="sub-pending">
                <AlertTriangle size={14} />
                <span>
                  Downgrade to <strong>{pendingPlan.name}</strong> scheduled for{' '}
                  <strong>{formatShortDate(subscription.pendingChangeEffectiveAt)}</strong>.
                </span>
                <button onClick={handleCancelPending}>Cancel change</button>
              </div>
            )}
          </div>
        </div>

        <div className="sub-status-actions">
          {subscription.status === 'cancelled' ? (
            <Button leftIcon={<RefreshCcw size={14} />} onClick={handleReactivate}>
              Reactivate
            </Button>
          ) : (
            <>
              <Link to="/subscription/checkout?plan=pro">
                <Button leftIcon={<TrendingUp size={14} />}>Upgrade plan</Button>
              </Link>
              {isInTrial && (
                <Button variant="outline" onClick={() => setConfirmCancel(true)}>
                  Cancel subscription
                </Button>
              )}
            </>
          )}
        </div>
      </section>

      {/* ---------- Usage ---------- */}
      <Card
        title="Plan usage"
        subtitle="Live tracking of your workspace against plan limits"
        action={
          <Link to="/subscription/checkout?plan=pro">
            <Button size="sm" variant="outline" leftIcon={<TrendingUp size={13} />}>
              Increase limits
            </Button>
          </Link>
        }
      >
        <div className="sub-usage-grid">
          {usageRows.map(row => (
            <UsageBar
              key={row.key}
              label={row.label}
              used={row.used}
              limit={row.limit}
            />
          ))}
        </div>
      </Card>

      {/* ---------- Plans ---------- */}
      <section>
        <div className="row between" style={{ marginBottom: 14, alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Available plans</h2>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
              Upgrades take effect immediately. Downgrades apply at the end of your current cycle.
            </p>
          </div>
        </div>

        <div className="sub-plans">
          {PLANS.map(p => {
            const isCurrent = p.id === subscription.planId;
            const isPending = p.id === subscription.pendingPlanId;
            const isHigher = p.price > plan.price;
            return (
              <PlanCard
                key={p.id}
                plan={p}
                annual={annual}
                isCurrent={isCurrent}
                isPending={isPending}
                ctaLabel={isHigher ? 'Upgrade' : 'Downgrade'}
                onSelect={() => {
                  window.location.assign(`/subscription/checkout?plan=${p.id}${annual ? '&annual=1' : ''}`);
                }}
              />
            );
          })}
        </div>
      </section>

      {/* ---------- Feature comparison ---------- */}
      <section>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Compare all features</h2>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
              Every capability across every plan, at a glance.
            </p>
          </div>
        </div>
        <ComparisonTable />
      </section>

      {/* ---------- Billing history ---------- */}
      <Card
        title="Billing history"
        subtitle="All invoices issued to your workspace"
        action={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download size={13} />}
            onClick={() => toast.info('Bulk invoice export is coming soon.')}
          >
            Export all
          </Button>
        }
      >
        <Table
          columns={invoiceColumns}
          rows={invoices}
          empty="No invoices yet — you are still on the free trial."
        />
      </Card>

      {/* ---------- Payment method ---------- */}
      <Card title="Payment method" subtitle="How we collect your subscription payment">
        <div className="sub-pay">
          <span className="sub-pay-icon"><CreditCard size={18} /></span>
          <div style={{ flex: 1 }}>
            <div className="bold" style={{ fontSize: 13.5 }}>
              {subscription.paymentMethod === 'mpesa' ? 'M-Pesa STK push' : 'M-Pesa (default)'}
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              A payment request is sent to your registered phone number each cycle.
              No card details are stored on our servers.
            </div>
          </div>
          <Badge tone="info">M-Pesa</Badge>
        </div>
        <div className="sub-pay-note">
          <Calendar size={13} />
          <span>
            {subscription.status === 'active'
              ? `Next payment of ${formatKSh(plan.price)} on ${formatShortDate(subscription.cycleEnd)}.`
              : 'You will not be charged until you choose a plan.'}
          </span>
        </div>
      </Card>

      {/* ---------- Cancel confirm ---------- */}
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel subscription"
        message="Your access will continue until the end of your current trial or billing cycle. You can reactivate anytime."
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel subscription'}
      />

      <InvoicePreview
        invoice={viewingInvoice}
        open={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
      />

      <style>{`
        .sub-icon-btn {
          width: 30px; height: 30px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .sub-icon-btn:hover {
          background: var(--bg-soft); color: var(--primary);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}