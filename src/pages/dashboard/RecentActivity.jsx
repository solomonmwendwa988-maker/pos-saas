import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RecentActivity({ items }) {
  return (
    <ul className="activity">
      {items.map((a, i) => (
        <li key={i} className="activity-item">
          <span className={`activity-icon ${a.type === 'alert' ? 'warn' : 'ok'}`}>
            {a.type === 'alert' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          </span>
          <div className="activity-body">
            <span className="activity-text">{a.text}</span>
            <span className="activity-time">{a.time}</span>
          </div>
        </li>
      ))}
      <style>{`
        .activity { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
        .activity-item { display: flex; gap: 12px; align-items: flex-start; }
        .activity-icon {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .activity-icon.ok { background: var(--success-bg); color: var(--success); }
        .activity-icon.warn { background: var(--warning-bg); color: var(--warning); }
        .activity-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .activity-text { font-size: 13.5px; color: var(--text); }
        .activity-time { font-size: 11.5px; color: var(--text-faint); }
      `}</style>
    </ul>
  );
}