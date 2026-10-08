import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Calendar, CheckCircle2, CreditCard, Download, Eye,
  RefreshCcw, Sparkles, TrendingUp,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PlanCard from './PlanCard';
import UsageBar from './UsageBar';
import ComparisonTable from './ComparisonTable';
import InvoicePreview from './InvoicePreview';
import { subscriptionService } from '@/services/subscriptionService';
import { useSubscription } from '@/context/SubscriptionContext';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import { formatShortDate } from '@/utils/billing';
import { PLANS } from '@/config/plans';
import './Subscription.css';

const STATUS_TONE = {
  trial: 'warning',
  active: 'success',
  pending: 'info',
  cancelled: 'danger',
  past_due: 'danger',
};

const STATUS_LABEL = {
  trial: 'Trial',
  active: 'Active',
  pending: 'Pending',
  cancelled: 'Cancelled',
  past_due: 'Past due',
};

function daysWord(n) {
  return n === 1 ? 'day' : 'days';
}

export default function Subscription() {
  const toast = useToast();
  const {
    subscription,
    usage,
    limits,
    isInTrial,
    trialDaysLeft,
    daysUntilCycleEnd,
    cancelPendingChange,
    cancelSubscription,
    reactivate,
  } = useSubscription();

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [annual, setAnnual] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInvoicesLoading(true);
      try {
        const list = await subscriptionService.invoices();
        if (!cancelled) setInvoices(list);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[subscription] invoice load failed', err);
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subscription?.planId, subscription?.status, subscription?.cycleEnd]);

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
        used: usage?.[k] || 0,
        limit: limits?.[k],
      })),
    [usage, limits]
  );

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelSubscription('Owner requested');
      toast.success('Subscription cancelled. Access continues until end of cycle.');
    } catch (err) {
      toast.error(err.message || 'Could not cancel subscription.');
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate();
      toast.success('Subscription reactivated.');
    } catch (err) {
      toast.error(err.message || 'Could not reactivate subscription.');
    }
  };

  const handleCancelPending = async () => {
    try {
      await cancelPendingChange();
      toast.success('Scheduled plan change cancelled.');
    } catch (err) {
      toast.error(err.message || 'Could not cancel the scheduled change.');
    }
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
          r.status === 'paid' ? 'success'
          : r.status === 'credited' ? 'info'
          : r.status === 'pending' ? 'warning'
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

  if (!subscription) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 240 }} />
        <div className="skeleton" style={{ height: 140 }} />
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  const plan = subscription.plan;
  const pendingPlan = subscription.pendingPlan;
  const statusKey = subscription.status;
  const statusLabel = STATUS_LABEL[statusKey] || statusKey;

  // -------- Days-left chip shown in the status row --------
  let daysChip = null;
  if (statusKey === 'trial' && trialDaysLeft > 0) {
    daysChip = (
      <span className="sub-status-chip sub-status-chip-trial">
        {trialDaysLeft} {daysWord(trialDaysLeft)} left in trial
      </span>
    );
  } else if (statusKey === 'active' && daysUntilCycleEnd > 0) {
    daysChip = (
      <span className="sub-status-chip sub-status-chip-active">
        Renews in {daysUntilCycleEnd} {daysWord(daysUntilCycleEnd)}
      </span>
    );
  } else if (statusKey === 'cancelled' && daysUntilCycleEnd > 0) {
    daysChip = (
      <span className="sub-status-chip sub-status-chip-danger">
        {daysUntilCycleEnd} {daysWord(daysUntilCycleEnd)} until access ends
      </span>
    );
  } else if (statusKey === 'pending') {
    daysChip = (
      <span className="sub-status-chip sub-status-chip-pending">
        Awaiting payment confirmation
      </span>
    );
  }

  return (
    <div className="stack gap-24">
      {/* ---------- Page header ---------- */}
      <header className="page-head">
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="page-sub">
            Manage your plan, usage, billing and invoices
          </p>
        </div>
        <div className="billing-toggle">
          <button
            type="button"
            className={!annual ? 'on' : ''}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={annual ? 'on' : ''}
            onClick={() => setAnnual(true)}
          >
            Annual <span className="save-tag">Save 17%</span>
          </button>
        </div>
      </header>

      {/* ---------- Status card ---------- */}
      <section className={`sub-status sub-status-${statusKey}`}>
        <div className="sub-status-main">
          <span className="sub-status-icon">
            {statusKey === 'active' ? <CheckCircle2 size={22} /> : <Sparkles size={22} />}
          </span>
          <div className="sub-status-body">
            <div className="sub-status-row">
              <h2 className="sub-status-name">{plan.name} plan</h2>
              <Badge tone={STATUS_TONE[statusKey] || 'neutral'}>
                {statusLabel}
              </Badge>
              {daysChip}
            </div>

            <p className="sub-status-tagline">{plan.tagline}</p>

            <div className="sub-status-meta">
              <span>
                Price:
                <strong className="mono">{formatKSh(plan.price)}/month</strong>
              </span>
              {statusKey === 'trial' && (
                <span>
                  Trial ends:
                  <strong className="mono">
                    {formatShortDate(subscription.trialEnd)}
                  </strong>
                </span>
              )}
              {statusKey === 'active' && (
                <span>
                  Renews on:
                  <strong className="mono">
                    {formatShortDate(subscription.cycleEnd)}
                  </strong>
                </span>
              )}
              {statusKey === 'cancelled' && (
                <span>
                  Access ends:
                  <strong className="mono">
                    {formatShortDate(subscription.cycleEnd)}
                  </strong>
                </span>
              )}
            </div>

            {pendingPlan && (
              <div className="sub-pending">
                <AlertTriangle size={14} />
                <span>
                  Downgrade to <strong>{pendingPlan.name}</strong> scheduled for{' '}
                  <strong>
                    {formatShortDate(subscription.pendingChangeEffectiveAt)}
                  </strong>
                  .
                </span>
                <button type="button" onClick={handleCancelPending}>
                  Cancel change
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Actions ---------- */}
        <div className="sub-status-actions">
          {statusKey === 'cancelled' ? (
            <Button
              leftIcon={<RefreshCcw size={14} />}
              onClick={handleReactivate}
            >
              Reactivate
            </Button>
          ) : statusKey === 'trial' ? (
            <>
              <Link to="/subscription/checkout?plan=pro">
                <Button full leftIcon={<TrendingUp size={14} />}>
                  Upgrade plan
                </Button>
              </Link>
              <Button
                variant="outline"
                full
                onClick={() => setConfirmCancel(true)}
              >
                Cancel subscription
              </Button>
            </>
          ) : statusKey === 'active' ? (
            /* Paid — no upgrade CTA, just a quiet link to plan options */
            <a href="#plans" className="sub-status-quiet-link">
              Compare plans
            </a>
          ) : statusKey === 'pending' ? (
            <span className="sub-status-quiet-note">
              Waiting for payment confirmation…
            </span>
          ) : null}
        </div>
      </section>

      {/* ---------- Usage ---------- */}
      <Card
        title="Plan usage"
        subtitle="Live tracking of your workspace against plan limits"
        action={
          <Link to="/subscription/checkout?plan=pro">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<TrendingUp size={13} />}
            >
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

      {/* ---------- Available plans ---------- */}
      <section className="sub-section" id="plans">
        <div className="sub-section-head">
          <div>
            <h2 className="sub-section-title">Available plans</h2>
            <p className="sub-section-sub">
              Upgrades take effect immediately. Downgrades apply at the end of
              your current cycle.
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
                  window.location.assign(
                    `/subscription/checkout?plan=${p.id}${annual ? '&annual=1' : ''}`
                  );
                }}
              />
            );
          })}
        </div>
      </section>

      {/* ---------- Feature comparison ---------- */}
      <section className="sub-section">
        <div className="sub-section-head">
          <div>
            <h2 className="sub-section-title">Compare all features</h2>
            <p className="sub-section-sub">
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
          empty={
            invoicesLoading
              ? 'Loading invoices…'
              : 'No invoices yet — you are still on the free trial.'
          }
        />
      </Card>

      {/* ---------- Payment method ---------- */}
      <Card
        title="Payment method"
        subtitle="How we collect your subscription payment"
      >
        <div className="sub-pay">
          <span className="sub-pay-icon">
            <CreditCard size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bold" style={{ fontSize: 13.5 }}>
              {subscription.paymentMethod === 'mpesa'
                ? 'M-Pesa STK push'
                : 'M-Pesa (default)'}
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              A payment request is sent to your registered phone number each
              cycle. No card details are stored on our servers.
            </div>
          </div>
          <Badge tone="info">M-Pesa</Badge>
        </div>
        <div className="sub-pay-note">
          <Calendar size={13} />
          <span>
            {statusKey === 'active'
              ? `Next payment of ${formatKSh(plan.price)} on ${formatShortDate(subscription.cycleEnd)} (${daysUntilCycleEnd} ${daysWord(daysUntilCycleEnd)} from now).`
              : statusKey === 'cancelled'
              ? `No further payments. Access ends on ${formatShortDate(subscription.cycleEnd)}.`
              : 'You will not be charged until you choose a plan.'}
          </span>
        </div>
      </Card>

      {/* ---------- Modals ---------- */}
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
    </div>
  );
}