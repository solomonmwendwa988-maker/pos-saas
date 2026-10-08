import { ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react';
import { formatKSh } from '@/utils/format';
import { formatLongDateTime } from '@/utils/billing';

const TYPE_LABEL = {
  opening: 'Opening balance',
  credit_sale: 'Credit sale',
  payment: 'Payment',
  adjustment: 'Adjustment',
};

export default function LedgerTable({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="lt-empty">
        <FileText size={28} />
        <p>No ledger activity yet</p>
        <span className="muted">
          Credit sales and payments will appear here.
        </span>
      </div>
    );
  }

  return (
    <div className="lt">
      <div className="lt-head">
        <span>Date</span>
        <span>Type</span>
        <span>Reference</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span style={{ textAlign: 'right' }}>Balance</span>
      </div>
      {entries.map(e => {
        const isDebit = e.amount > 0;
        return (
          <div key={e.id} className="lt-row">
            <span className="lt-date">
              {formatLongDateTime(new Date(e.createdAt).toISOString())}
            </span>
            <span className="lt-type">
              <span className={`lt-type-dot ${isDebit ? 'debit' : 'credit'}`}>
                {isDebit ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
              </span>
              {TYPE_LABEL[e.type] || e.type}
            </span>
            <span className="lt-ref">
              {e.reference || '—'}
              {e.note && <span className="lt-note">{e.note}</span>}
            </span>
            <span className={`lt-amount mono ${isDebit ? 'debit' : 'credit'}`}>
              {isDebit ? '+' : ''}
              {formatKSh(Math.abs(e.amount))}
            </span>
            <span className="lt-balance mono">{formatKSh(e.balance)}</span>
          </div>
        );
      })}

      <style>{`
        .lt {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          font-size: 13.5px;
        }
        .lt-head {
          display: grid;
          grid-template-columns: 180px 150px 1fr 130px 130px;
          gap: 12px;
          align-items: center;
          padding: 10px 14px;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .lt-row {
          display: grid;
          grid-template-columns: 180px 150px 1fr 130px 130px;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
        }
        .lt-row:last-child { border-bottom: 0; }
        .lt-row:hover { background: #fafbff; }
        .lt-date { font-size: 12px; color: var(--text-faint); }
        .lt-type {
          display: inline-flex; align-items: center; gap: 8px;
          font-weight: 600;
        }
        .lt-type-dot {
          width: 22px; height: 22px; border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lt-type-dot.debit { background: var(--danger-bg); color: var(--danger); }
        .lt-type-dot.credit { background: var(--success-bg); color: var(--success); }
        .lt-ref {
          display: flex; flex-direction: column; min-width: 0;
          color: var(--text-muted);
        }
        .lt-note {
          font-size: 11.5px; color: var(--text-faint);
          font-style: italic; margin-top: 2px;
        }
        .lt-amount {
          font-weight: 700; text-align: right;
        }
        .lt-amount.debit { color: var(--danger); }
        .lt-amount.credit { color: var(--success); }
        .lt-balance {
          text-align: right; font-weight: 700;
        }
        .lt-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 48px 20px; text-align: center;
          color: var(--text-faint);
        }
        .lt-empty p {
          margin: 6px 0 0; font-weight: 700;
          color: var(--text-muted); font-size: 14px;
        }
        .lt-empty .muted { font-size: 12.5px; }

        @media (max-width: 900px) {
          .lt-head { display: none; }
          .lt-row {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "type date"
              "ref ref"
              "amount balance";
            row-gap: 8px;
          }
          .lt-type { grid-area: type; }
          .lt-date { grid-area: date; text-align: right; }
          .lt-ref { grid-area: ref; }
          .lt-amount { grid-area: amount; text-align: left; }
          .lt-balance {
            grid-area: balance; text-align: right;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}