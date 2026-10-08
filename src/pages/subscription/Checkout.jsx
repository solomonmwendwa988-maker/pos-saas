import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Info, Lock, Smartphone, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import { useSubscription } from '@/context/SubscriptionContext';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import { PLANS, getPlan, planPrice, planSavings } from '@/config/plans';
import { computeProration, formatShortDate } from '@/utils/billing';
import { formatKSh } from '@/utils/format';
import './Checkout.css';

const KENYAN_PHONE = /^(?:\+254|0)(7\d{8}|1\d{8})$/;

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { business } = useBusiness();
  const { subscription, changePlan, scheduleDowngrade } = useSubscription();

  const planId = params.get('plan') || 'pro';
  const annual = params.get('annual') === '1';
  const target = getPlan(planId);
  const current = subscription?.plan;

  const [phone, setPhone] = useState(business?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subscription) return;
    if (planId === subscription.planId) {
      navigate('/subscription', { replace: true });
    }
  }, [planId, subscription, navigate]);

  const direction = useMemo(() => {
    if (!current) return 'same';
    if (target.price > current.price) return 'upgrade';
    if (target.price < current.price) return 'downgrade';
    return 'same';
  }, [target, current]);

  const proration = useMemo(() => {
    if (!current || direction !== 'upgrade') return { amount: 0, daysRemaining: 0 };
    return computeProration({
      fromPlan: current,
      toPlan: target,
      cycleStartIso: subscription.cycleStart,
      cycleEndIso: subscription.cycleEnd,
      annual,
    });
  }, [current, target, subscription, annual, direction]);

  const fullPrice = annual ? planPrice(target.id, true) * 12 : planPrice(target.id, false);
  const dueToday = direction === 'upgrade' && proration.amount > 0
    ? proration.amount
    : fullPrice;
  const savings = planSavings(target.id);

  const submit = async e => {
    e.preventDefault();
    setError('');

    if (direction === 'upgrade') {
      if (!phone.trim()) {
        setError('Enter the M-Pesa phone number to receive the payment prompt.');
        return;
      }
      if (!KENYAN_PHONE.test(phone.replace(/\s/g, ''))) {
        setError('Enter a valid Kenyan mobile number (07XX XXX XXX or +254 7XX XXX XXX).');
        return;
      }
    }

    setLoading(true);
    try {
      if (direction === 'downgrade') {
        await scheduleDowngrade(target.id);
        toast.success(
          `Downgrade to ${target.name} scheduled for ${formatShortDate(subscription.cycleEnd)}.`
        );
        navigate('/subscription', { replace: true });
      } else {
        const result = await changePlan({
          toPlanId: target.id,
          annual,
          paymentMethod: 'mpesa',
          proration,
        });
        toast.success(`Plan updated to ${target.name}. Invoice ${result.invoice.number} issued.`);
        navigate('/subscription', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Could not complete the plan change.');
    } finally {
      setLoading(false);
    }
  };

  if (!subscription || !current) return null;

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <button className="back-link" onClick={() => navigate('/subscription')}>
          <ArrowLeft size={14} /> Back to subscription
        </button>
        <h1 className="page-title">
          {direction === 'downgrade' ? 'Schedule a plan change' : 'Upgrade your plan'}
        </h1>
        <p className="page-sub muted">
          {direction === 'downgrade'
            ? 'Your new plan will take effect at the end of the current cycle. You keep full access until then.'
            : 'Upgrades apply immediately. Any unused balance from your current plan is credited.'}
        </p>
      </header>

      <div className="co-grid">
        <div className="co-main">
          {/* Plan summary */}
          <Card title="Plan summary" padding="lg">
            <div className="co-summary">
              <div className="co-plan-row">
                <div className="co-plan">
                  <div className="co-plan-label">From</div>
                  <div className="co-plan-name">{current.name}</div>
                  <div className="co-plan-price mono">{formatKSh(current.price)}/month</div>
                </div>
                <span className={`co-arrow ${direction === 'upgrade' ? 'up' : 'down'}`}>
                  {direction === 'downgrade' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                </span>
                <div className="co-plan current">
                  <div className="co-plan-label">To</div>
                  <div className="co-plan-name">{target.name}</div>
                  <div className="co-plan-price mono">
                    {annual
                      ? `${formatKSh(planPrice(target.id, true))}/month (annual)`
                      : `${formatKSh(target.price)}/month`}
                  </div>
                </div>
              </div>

              <div className="co-features">
                <div className="co-features-title">What you get</div>
                <ul>
                  {target.features.map(f => (
                    <li key={f}><Check size={14} color="var(--success)" /> {f}</li>
                  ))}
                </ul>
              </div>

              {annual && (
                <div className="co-savings">
                  <Sparkles size={14} />
                  <span>
                    Annual billing saves <strong>{formatKSh(savings)}</strong> per year.
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Billing preview */}
          <Card title="Billing preview" padding="lg">
            <div className="co-billing">
              <div className="co-billing-line">
                <span>{target.name} · {annual ? 'annual' : 'monthly'}</span>
                <span className="mono">{formatKSh(fullPrice)}</span>
              </div>
              {direction === 'upgrade' && (
                <div className="co-billing-line">
                  <span>
                    Unused {current.name} credit ({proration.daysRemaining} day
                    {proration.daysRemaining === 1 ? '' : 's'})
                  </span>
                  <span className="mono">
                    − {formatKSh(Math.max(0, fullPrice - proration.amount))}
                  </span>
                </div>
              )}
              {direction === 'downgrade' && (
                <div className="co-billing-line muted-line">
                  <span>Charged today</span>
                  <span className="mono">Nothing</span>
                </div>
              )}
              <div className="co-billing-total">
                <span>Due today</span>
                <span className="mono">{formatKSh(dueToday)}</span>
              </div>
            </div>
          </Card>

          {/* Payment */}
          {direction === 'upgrade' && (
            <Card title="Payment" padding="lg">
              <form onSubmit={submit} className="stack gap-16" noValidate>
                <div className="co-mpesa-info">
                  <span className="co-mpesa-icon"><Smartphone size={18} /></span>
                  <div>
                    <div className="bold" style={{ fontSize: 13.5 }}>M-Pesa STK push</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      We'll send a payment request to your phone. Enter your M-Pesa PIN to confirm.
                    </div>
                  </div>
                </div>
                <Input
                  label="M-Pesa phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  leftIcon={<Smartphone size={15} />}
                />
                {error && <div className="co-error">{error}</div>}
                <Button type="submit" full size="lg" loading={loading} leftIcon={<Lock size={14} />}>
                  Confirm and pay {formatKSh(dueToday)}
                </Button>
                <div className="co-secure">
                  <Info size={12} />
                  <span>
                    Payments are collected by Safaricom M-Pesa. Sokoni never stores your M-Pesa PIN.
                  </span>
                </div>
              </form>
            </Card>
          )}

          {direction === 'downgrade' && (
            <Card title="Confirm change" padding="lg">
              <div className="co-downgrade">
                <div className="co-downgrade-warn">
                  <Info size={14} />
                  <div>
                    <div className="bold" style={{ fontSize: 13.5 }}>What happens next</div>
                    <ul className="co-downgrade-list">
                      <li>You keep full {current.name} access until {formatShortDate(subscription.cycleEnd)}.</li>
                      <li>On that date, your plan switches to {target.name} automatically.</li>
                      <li>Features and limits above {target.name} will be locked.</li>
                      <li>You can cancel this scheduled change anytime before it takes effect.</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={submit} full size="lg" loading={loading}>
                  Schedule change to {target.name}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="co-side">
          <Card title="Switch to annual" padding="md">
            <div className="co-side-toggle">
              <div className="co-side-toggle-row">
                <span>Billing cycle</span>
                <Badge tone={annual ? 'success' : 'neutral'}>
                  {annual ? 'Annual' : 'Monthly'}
                </Badge>
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 12px' }}>
                {annual
                  ? `Save ${formatKSh(savings)} per year by paying annually.`
                  : 'Switch to annual billing and save 17% on any plan.'}
              </p>
              <Link to={`/subscription/checkout?plan=${planId}${annual ? '' : '&annual=1'}`}>
                <Button full variant="outline" size="sm">
                  Switch to {annual ? 'monthly' : 'annual'}
                </Button>
              </Link>
            </div>
          </Card>

          <Card title="Other plans" padding="md">
            <div className="co-other">
              {PLANS.filter(p => p.id !== target.id).map(p => (
                <Link
                  key={p.id}
                  to={`/subscription/checkout?plan=${p.id}${annual ? '&annual=1' : ''}`}
                  className="co-other-row"
                >
                  <div>
                    <div className="co-other-name">{p.name}</div>
                    <div className="co-other-price mono">
                      KSh {planPrice(p.id, annual).toLocaleString()}/month
                    </div>
                  </div>
                  <span className="co-other-arrow">→</span>
                </Link>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}