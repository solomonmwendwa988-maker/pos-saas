import { Zap } from 'lucide-react';
import { formatKSh } from '@/utils/format';
import './QuickKeys.css';

export default function QuickKeys({ products, onAdd }) {
  if (!products.length) return null;

  return (
    <div className="qk">
      <div className="qk-head">
        <Zap size={12} />
        <span>Quick keys</span>
      </div>
      <div className="qk-row">
        {products.map(p => {
          const out = p.stock === 0;
          return (
            <button
              key={p.id}
              className={`qk-key ${out ? 'out' : ''}`}
              onClick={() => !out && onAdd(p)}
              disabled={out}
              title={`${p.name} — ${formatKSh(p.price)}`}
            >
              <span className="qk-initial">{p.name[0]}</span>
              <span className="qk-body">
                <span className="qk-name">{p.name}</span>
                <span className="qk-price mono">{formatKSh(p.price)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}