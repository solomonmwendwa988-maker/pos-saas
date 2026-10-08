import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import './UpgradePrompt.css';

export default function UpgradePrompt({
  title = 'Upgrade to unlock this',
  message = 'This feature is available on a higher plan.',
  ctaLabel = 'See plans',
  to = '/subscription',
  dismissible = true,
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="up">
      <span className="up-icon"><Sparkles size={16} /></span>
      <div className="up-body">
        <div className="up-title">{title}</div>
        <div className="up-message">{message}</div>
      </div>
      <div className="up-actions">
        <Link to={to} className="up-cta">{ctaLabel}</Link>
        {dismissible && (
          <button className="up-close" onClick={() => setDismissed(true)} aria-label="Dismiss">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}