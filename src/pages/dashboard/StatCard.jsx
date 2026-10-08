import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import './StatCard.css';

export default function StatCard({ label, value, delta, icon: Icon, tone = 'primary', sub }) {
  const up = delta >= 0;
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className={`stat-icon stat-icon-${tone}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="stat-value mono">{value}</div>
      {(delta !== undefined || sub) && (
        <div className="stat-bottom">
          {delta !== undefined && (
            <span className={`stat-delta ${up ? 'up' : 'down'}`}>
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)}%
            </span>
          )}
          {sub && <span className="stat-sub">{sub}</span>}
        </div>
      )}
    </div>
  );
}