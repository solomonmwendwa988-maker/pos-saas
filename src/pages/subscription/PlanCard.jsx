import { Building2, Check, Sparkles, Store, Zap } from 'lucide-react';
import { formatKSh } from '@/utils/format';
import { planPrice, planSavings } from '@/config/plans';
import Badge from '@/components/common/Badge';
import './PlanCard.css';

const ICONS = { Store, Zap, Building2 };

export default function PlanCard({
  plan,
  annual,
  isCurrent,
  isPending,
  onSelect,
  ctaLabel,
  disabled,
}) {
  const Icon = ICONS[plan.icon] || Sparkles;
  const price = planPrice(plan.id, annual);
  const savings = planSavings(plan.id);

  return (
    <div
      className={[
        'plan-card',
        plan.popular ? 'popular' : '',
        isCurrent ? 'current' : '',
      ].join(' ')}
    >
      {plan.popular && <span className="plan-ribbon">Most popular</span>}
      {isCurrent && <span className="plan-current">Current plan</span>}
      {isPending && <span className="plan-pending">Scheduled</span>}

      <div className="plan-head">
        <span className="plan-icon"><Icon size={20} /></span>
        <div>
          <h3 className="plan-name">{plan.name}</h3>
          <p className="plan-tagline">{plan.tagline}</p>
        </div>
      </div>

      <div className="plan-price">
        <span className="plan-cur">KSh</span>
        <span className="plan-num">{price.toLocaleString()}</span>
        <span className="plan-per">/month</span>
      </div>

      {annual && (
        <div className="plan-savings">
          Billed annually · save {formatKSh(savings)}/year
        </div>
      )}

      <ul className="plan-feats">
        {plan.features.map(f => (
          <li key={f}>
            <Check size={14} color="var(--success)" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.highlight && plan.highlight.length > 0 && (
        <div className="plan-highlights">
          {plan.highlight.map(h => (
            <Badge key={h} tone="neutral">{h}</Badge>
          ))}
        </div>
      )}

      <button
        className={`plan-cta ${isCurrent ? 'ghost' : plan.popular ? 'primary' : 'outline'}`}
        onClick={() => onSelect?.(plan)}
        disabled={disabled || isCurrent}
      >
        {isCurrent ? 'Current plan' : ctaLabel || (plan.popular ? 'Upgrade' : 'Choose plan')}
      </button>
    </div>
  );
}