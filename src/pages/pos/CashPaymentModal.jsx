import { useEffect, useMemo, useState } from 'react';
import { Banknote, Check, Minus, Plus } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { formatKSh } from '@/utils/format';

/** Common Kenyan cash denominations, quick-tap. */
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function CashPaymentModal({
  open,
  total,
  onClose,
  onConfirm, // ({ tendered, change }) => void
  busy,
}) {
  const [tendered, setTendered] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTendered('');
      setError('');
    }
  }, [open]);

  const tenderedNum = Number(tendered) || 0;
  const change = tenderedNum - total;
  const enough = tenderedNum >= total - 0.01;

  const denomButtons = useMemo(() => {
    // Round the total up to the nearest 50, then produce quick adds
    const rounded = Math.ceil(total / 50) * 50;
    const list = new Set([
      rounded,
      ...QUICK_AMOUNTS.filter(a => a >= rounded),
    ]);
    return Array.from(list).slice(0, 5);
  }, [total]);

  const appendDenom = amount => {
    setTendered(prev => {
      const current = Number(prev) || 0;
      return String(current + amount);
    });
  };

  const exact = () => setTendered(String(Math.round(total)));

  const submit = () => {
    if (!enough) {
      setError('Cash tendered is less than the total.');
      return;
    }
    onConfirm({
      tendered: tenderedNum,
      change: Math.round(change),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cash payment"
      subtitle={`Total due: ${formatKSh(total)}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={busy}
            disabled={!enough}
            leftIcon={<Check size={14} />}
          >
            Confirm payment
          </Button>
        </>
      }
    >
      <div className="cr stack gap-16">
        {/* Total */}
        <div className="cr-total">
          <div className="cr-total-label">Amount due</div>
          <div className="cr-total-value mono">{formatKSh(total)}</div>
        </div>

        {/* Tendered input */}
        <div className="field">
          <label className="field-label" htmlFor="cash-tendered">
            Cash received
          </label>
          <div className="field-control cr-input-wrap">
            <span className="cr-cur">KSh</span>
            <input
              id="cash-tendered"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              className="field-input cr-input"
              value={tendered}
              onChange={e => {
                setTendered(e.target.value.replace(/[^\d.]/g, ''));
                setError('');
              }}
              placeholder="0"
              autoFocus
            />
            <button
              type="button"
              className="cr-clear"
              onClick={() => setTendered('')}
              aria-label="Clear"
            >
              <Minus size={14} />
            </button>
          </div>
          <div className="cr-quick-row">
            <button type="button" className="cr-quick" onClick={exact}>
              Exact · {formatKSh(total)}
            </button>
            {denomButtons.map(a => (
              <button
                key={a}
                type="button"
                className="cr-quick"
                onClick={() => appendDenom(a)}
              >
                + {formatKSh(a)}
              </button>
            ))}
          </div>
        </div>

        {/* Change summary */}
        <div className={`cr-summary ${enough ? 'ok' : 'warn'}`}>
          <div className="cr-line">
            <span>Total</span>
            <span className="mono">{formatKSh(total)}</span>
          </div>
          <div className="cr-line">
            <span>Cash received</span>
            <span className="mono">{formatKSh(tenderedNum)}</span>
          </div>
          <div className="cr-line grand">
            <span>{enough ? 'Change due' : 'Short by'}</span>
            <span className="mono">
              {formatKSh(Math.abs(change))}
            </span>
          </div>
        </div>

        {error && <div className="cr-error">{error}</div>}

        <div className="cr-hint">
          <Banknote size={14} />
          <span>
            Enter the amount the customer handed over. The change is
            calculated automatically.
          </span>
        </div>
      </div>

      <style>{`
        .cr-total {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 18px 16px;
          background: var(--primary-50);
          border-radius: 14px;
        }
        .cr-total-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--primary-700);
        }
        .cr-total-value {
          font-size: 28px;
          font-weight: 800;
          font-family: var(--font-display);
          letter-spacing: -0.03em;
          color: var(--primary-700);
        }

        .cr-input-wrap { position: relative; }
        .cr-cur {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-faint);
          margin-right: 6px;
        }
        .cr-input {
          font-size: 20px !important;
          font-weight: 800;
          text-align: right;
          font-family: var(--font-display);
          letter-spacing: -0.02em;
        }
        .cr-clear {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .cr-clear:hover { background: var(--bg-soft); color: var(--danger); }

        .cr-quick-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .cr-quick {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 160ms ease;
        }
        .cr-quick:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-50);
        }

        .cr-summary {
          display: flex; flex-direction: column; gap: 8px;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 13.5px;
        }
        .cr-summary.ok { background: var(--success-bg); color: #14532d; }
        .cr-summary.warn { background: var(--warning-bg); color: #78350f; }
        .cr-line { display: flex; justify-content: space-between; }
        .cr-line.grand {
          padding-top: 10px;
          margin-top: 4px;
          border-top: 1px dashed rgba(0,0,0,0.15);
          font-weight: 800;
          font-size: 15px;
        }
        .cr-error {
          padding: 10px 14px;
          background: var(--danger-bg);
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
        }
        .cr-hint {
          display: flex; gap: 8px; align-items: flex-start;
          padding: 10px 12px;
          background: var(--bg-soft);
          border-radius: 10px;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.55;
        }
        .cr-hint svg { flex-shrink: 0; margin-top: 2px; }
      `}</style>
    </Modal>
  );
}