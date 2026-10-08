import { useEffect, useRef, useState } from 'react';
import { Clock, Inbox, Trash2, X } from 'lucide-react';
import { heldCartService } from '@/services/heldCartService';
import { formatKSh } from '@/utils/format';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useToast } from '@/context/ToastContext';
import './HeldCarts.css';

export default function HeldCarts({ carts, onRecall, onRemove, onRefresh }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useClickOutside(wrapRef, () => setOpen(false), open);

  const count = carts.length;

  const timeAgo = iso => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  return (
    <div className="hc" ref={wrapRef}>
      <button
        className={`hc-trigger ${open ? 'on' : ''}`}
        onClick={() => { setOpen(o => !o); onRefresh(); }}
        aria-label={`Held carts (${count})`}
        title="Held carts"
      >
        <Inbox size={16} />
        <span>Held</span>
        {count > 0 && <span className="hc-badge">{count}</span>}
      </button>

      {open && (
        <div className="hc-panel fade-in">
          <header className="hc-head">
            <div>
              <div className="hc-title">Held carts</div>
              <div className="hc-sub">
                {count === 0 ? 'No carts on hold' : `${count} cart${count > 1 ? 's' : ''} on hold`}
              </div>
            </div>
            <button className="hc-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={14} />
            </button>
          </header>

          <div className="hc-body">
            {count === 0 ? (
              <div className="hc-empty">
                <Inbox size={28} />
                <p>No held carts</p>
                <span className="muted">Press F10 or use the cart to park a sale.</span>
              </div>
            ) : (
              <ul className="hc-list">
                {carts.map(c => (
                  <li key={c.id} className="hc-item">
                    <div className="hc-item-main">
                      <div className="hc-item-label">{c.label}</div>
                      <div className="hc-item-meta">
                        <Clock size={11} />
                        <span>{timeAgo(c.heldAt)}</span>
                        <span className="dot" />
                        <span>{c.itemCount} item{c.itemCount !== 1 ? 's' : ''}</span>
                        <span className="dot" />
                        <span className="mono">{formatKSh(c.subtotal)}</span>
                      </div>
                      {(c.customerName || c.cashier) && (
                        <div className="hc-item-sub muted">
                          {[c.customerName, c.cashier].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div className="hc-item-actions">
                      <button
                        className="hc-action primary"
                        onClick={() => { onRecall(c); setOpen(false); }}
                      >
                        Recall
                      </button>
                      <button
                        className="hc-action"
                        onClick={() => { onRemove(c); }}
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="hc-foot">
            Recalling a cart replaces your current cart. It will be held automatically.
          </footer>
        </div>
      )}
    </div>
  );
}