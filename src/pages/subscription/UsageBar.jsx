import './UsageBar.css';

export default function UsageBar({ label, used, limit, onUpgrade }) {
  const unlimited = limit === -1 || limit === undefined;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const near = !unlimited && pct >= 80;
  const full = !unlimited && used >= limit;

  return (
    <div className="ub">
      <div className="ub-head">
        <span className="ub-label">{label}</span>
        <span className="ub-value mono">
          {used} / {unlimited ? '∞' : limit}
        </span>
      </div>
      <div className="ub-track">
        <span
          className={`ub-fill ${near ? 'near' : ''} ${full ? 'full' : ''} ${unlimited ? 'unlimited' : ''}`}
          style={{ width: unlimited ? '100%' : `${pct}%` }}
        />
      </div>
      {full && onUpgrade && (
        <button className="ub-upgrade" onClick={onUpgrade}>
          Limit reached — Upgrade for more
        </button>
      )}
      {near && !full && (
        <div className="ub-hint">
          Running low on {label.toLowerCase()}. Consider upgrading.
        </div>
      )}
    </div>
  );
}