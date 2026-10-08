import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import './UpgradePrompt.css';
import './LimitGate.css';

export default function LimitGate({
  limitKey,
  used,
  limit,
  children,
  message,
}) {
  const unlimited = limit === -1 || limit === undefined;
  const full = !unlimited && used >= limit;

  if (unlimited || !full) return children;

  return (
    <div className="lg">
      <div className="lg-locked">
        <span className="lg-icon"><Lock size={16} /></span>
        <div className="lg-body">
          <div className="lg-title">You've reached your plan limit</div>
          <div className="lg-message">
            {message || `Your plan allows up to ${limit}. Upgrade to add more.`}
          </div>
        </div>
        <Link to="/subscription" className="up-cta">Upgrade</Link>
      </div>
    </div>
  );
}