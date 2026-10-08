import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Mail, Sparkles, X,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';
import { formatShortDate } from '@/utils/billing';
import './TrialBanner.css';

function daysWord(n) {
  return n === 1 ? 'day' : 'days';
}

export default function TrialBanner() {
  const { user } = useAuth();
  const { subscription, isInTrial, isCancelled } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !subscription) return null;

  // 1) Cancelled subscription — always show, cannot be dismissed
  if (isCancelled) {
    return (
      <div className="tb tb-danger">
        <div className="tb-inner">
          <span className="tb-icon">
            <AlertTriangle size={16} />
          </span>
          <div className="tb-body">
            <div className="tb-title">Your subscription is cancelled</div>
            <div className="tb-sub">
              Access ends {formatShortDate(subscription.cycleEnd)}. Reactivate
              anytime to keep your data.
            </div>
          </div>
        </div>
        <div className="tb-actions">
          <Link to="/subscription" className="tb-cta">
            Reactivate
          </Link>
        </div>
      </div>
    );
  }

  // 2) Pending payment confirmation
  if (subscription.status === 'pending') {
    return (
      <div className="tb tb-info">
        <div className="tb-inner">
          <span className="tb-icon">
            <Sparkles size={16} />
          </span>
          <div className="tb-body">
            <div className="tb-title">Waiting for M-Pesa confirmation</div>
            <div className="tb-sub">
              Approve the payment prompt on your phone to activate the{' '}
              {subscription.plan?.name} plan.
            </div>
          </div>
        </div>
        <div className="tb-actions">
          <Link to="/subscription" className="tb-cta">
            View subscription
          </Link>
        </div>
      </div>
    );
  }

  // 3) Active plan — no banner needed
  if (subscription.status === 'active') {
    return null;
  }

  // 4) Trial — show countdown until it ends
  if (isInTrial) {
    return (
      <TrialCountdownBanner
        endIso={subscription.trialEnd}
        onDismiss={() => setDismissed(true)}
      />
    );
  }

  return null;
}

function TrialCountdownBanner({ endIso, onDismiss }) {
  const { days, hours, minutes, seconds, total } = useTrialCountdown(endIso);

  const expired = total <= 0;
  const tone = expired ? 'danger' : days <= 1 ? 'warning' : 'info';

  return (
    <div className={`tb tb-${tone}`}>
      <div className="tb-inner">
        <span className="tb-icon">
          {expired ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
        </span>
        <div className="tb-body">
          <div className="tb-title">
            {expired
              ? 'Your free trial has ended'
              : `Free trial · ${days} ${daysWord(days)} remaining`}
          </div>
          <div className="tb-sub">
            {expired ? (
              'Choose a plan to keep using Sokoni. Your data is safe.'
            ) : (
              <>
                Ends in{' '}
                <strong className="tb-countdown">
                  {days}d {String(hours).padStart(2, '0')}h{' '}
                  {String(minutes).padStart(2, '0')}m{' '}
                  {String(seconds).padStart(2, '0')}s
                </strong>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="tb-actions">
        <Link to="/subscription" className="tb-cta">
          {expired ? 'Choose a plan' : 'Upgrade now'}
        </Link>
        <button
          className="tb-close"
          onClick={onDismiss}
          aria-label="Dismiss"
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Optional small nudge for accounts that signed up but never verified.
 * Renders nothing unless a pending signup exists in storage.
 */
export function EmailVerifyNudge() {
  const { user } = useAuth();
  if (!user?.email) return null;

  // If the user is signed in, we assume verification already happened.
  // This component is a placeholder for when you want to nudge users on
  // the onboarding page or dashboard before they verify. Keep it exported
  // so it can be mounted anywhere.
  return null;
}