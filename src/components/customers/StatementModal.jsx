import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { customerLedgerService } from '@/services/customerLedgerService';
import { useBusiness } from '@/context/BusinessContext';
import { formatKSh } from '@/utils/format';
import { formatShortDate, formatLongDateTime } from '@/utils/billing';

export default function StatementModal({ open, customer, onClose }) {
  const { business } = useBusiness();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);
    (async () => {
      const list = await customerLedgerService.forCustomer(customer.id);
      // Statement reads oldest first
      setEntries([...list].sort((a, b) => a.createdAt - b.createdAt));
      setLoading(false);
    })();
  }, [open, customer]);

  const balance = useMemo(() => {
    if (!entries.length) return 0;
    return entries[entries.length - 1].balance;
  }, [entries]);

  if (!customer) return null;

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
  const statementRef = `STM-${customer.id.slice(-6).toUpperCase()}-${today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customer statement"
      subtitle={customer.name}
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            leftIcon={<Printer size={14} />}
            onClick={() => window.print()}
          >
            Print / Save
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="stmt print-area">
        <header className="stmt-head">
          <div>
            <div className="stmt-brand">Sokoni</div>
            <div className="stmt-biz">{business.name || 'Your Business'}</div>
            {(business.location || business.phone) && (
              <div className="stmt-biz-meta">
                {[business.location, business.phone].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div className="stmt-meta">
            <div className="stmt-meta-title">Statement of account</div>
            <div className="stmt-meta-line">
              <span>Statement</span>
              <span className="mono">{statementRef}</span>
            </div>
            <div className="stmt-meta-line">
              <span>Issued</span>
              <span className="mono">{formatShortDate(today.toISOString())}</span>
            </div>
            <div className="stmt-meta-line">
              <span>Period</span>
              <span className="mono">
                {formatShortDate(thirtyDaysAgo.toISOString())} —{' '}
                {formatShortDate(today.toISOString())}
              </span>
            </div>
          </div>
        </header>

        <section className="stmt-customer">
          <div>
            <div className="stmt-label">Statement for</div>
            <div className="stmt-customer-name">{customer.name}</div>
            {customer.phone && (
              <div className="stmt-customer-sub mono">{customer.phone}</div>
            )}
            {customer.email && (
              <div className="stmt-customer-sub">{customer.email}</div>
            )}
          </div>
          <div className="stmt-balance-box">
            <div className="stmt-label">Balance due</div>
            <div className="stmt-balance mono">{formatKSh(Math.max(0, balance))}</div>
          </div>
        </section>

        <section className="stmt-entries">
          <div className="stmt-entries-head">
            <span>Date</span>
            <span>Description</span>
            <span style={{ textAlign: 'right' }}>Debit</span>
            <span style={{ textAlign: 'right' }}>Credit</span>
            <span style={{ textAlign: 'right' }}>Balance</span>
          </div>

          {loading ? (
            <div className="stmt-empty">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="stmt-empty">No transactions recorded.</div>
          ) : (
            entries.map(e => {
              const isDebit = e.amount > 0;
              const desc =
                e.type === 'credit_sale'
                  ? `Credit sale${e.reference ? ` · ${e.reference}` : ''}`
                  : e.type === 'payment'
                  ? `Payment received${
                      e.method === 'mpesa' ? ' (M-Pesa)' : ''
                    }${e.reference ? ` · ${e.reference}` : ''}`
                  : e.reference || e.type;
              return (
                <div key={e.id} className="stmt-entry">
                  <span className="stmt-entry-date">
                    {formatShortDate(new Date(e.createdAt).toISOString())}
                  </span>
                  <span className="stmt-entry-desc">
                    {desc}
                    {e.note && <span className="stmt-entry-note">{e.note}</span>}
                  </span>
                  <span className="stmt-entry-amt mono">
                    {isDebit ? formatKSh(e.amount) : ''}
                  </span>
                  <span className="stmt-entry-amt mono">
                    {!isDebit ? formatKSh(Math.abs(e.amount)) : ''}
                  </span>
                  <span className="stmt-entry-bal mono">
                    {formatKSh(e.balance)}
                  </span>
                </div>
              );
            })
          )}
        </section>

        <footer className="stmt-foot">
          <div className="stmt-foot-line">
            <span>Opening balance</span>
            <span className="mono">
              {formatKSh(entries[0] ? entries[0].balance - entries[0].amount : 0)}
            </span>
          </div>
          <div className="stmt-foot-line">
            <span>Total charges this period</span>
            <span className="mono">
              {formatKSh(
                entries
                  .filter(e => e.amount > 0)
                  .reduce((s, e) => s + e.amount, 0)
              )}
            </span>
          </div>
          <div className="stmt-foot-line">
            <span>Total payments this period</span>
            <span className="mono">
              {formatKSh(
                entries
                  .filter(e => e.amount < 0)
                  .reduce((s, e) => s + Math.abs(e.amount), 0)
              )}
            </span>
          </div>
          <div className="stmt-foot-line grand">
            <span>Closing balance</span>
            <span className="mono">{formatKSh(Math.max(0, balance))}</span>
          </div>
        </footer>

        <div className="stmt-note">
          Generated {formatLongDateTime(today.toISOString())}. Please settle any
          outstanding balance at your earliest convenience.
        </div>
      </div>

      <style>{`
        .stmt {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 28px;
          font-size: 13px;
        }
        .stmt-head {
          display: flex; justify-content: space-between;
          gap: 24px; flex-wrap: wrap;
          padding-bottom: 18px; border-bottom: 1px solid var(--border);
        }
        .stmt-brand {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #6d5efc, #22d3ee);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .stmt-biz { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .stmt-biz-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .stmt-meta { text-align: right; display: flex; flex-direction: column; gap: 6px; }
        .stmt-meta-title {
          font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--text-muted);
        }
        .stmt-meta-line {
          display: flex; justify-content: flex-end; gap: 10px; font-size: 12.5px;
        }
        .stmt-meta-line span:first-child { color: var(--text-muted); }

        .stmt-customer {
          display: flex; justify-content: space-between; gap: 24px;
          padding: 20px 0; border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .stmt-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-faint);
        }
        .stmt-customer-name { font-size: 15px; font-weight: 700; margin-top: 4px; }
        .stmt-customer-sub {
          font-size: 12.5px; color: var(--text-muted); margin-top: 2px;
        }
        .stmt-balance-box { text-align: right; }
        .stmt-balance {
          font-size: 24px; font-weight: 800; letter-spacing: -0.02em;
          font-family: var(--font-display); margin-top: 4px;
        }

        .stmt-entries { padding: 16px 0; }
        .stmt-entries-head {
          display: grid;
          grid-template-columns: 100px 1fr 100px 100px 110px;
          gap: 10px;
          padding: 10px 4px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .stmt-entry {
          display: grid;
          grid-template-columns: 100px 1fr 100px 100px 110px;
          gap: 10px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--border);
          align-items: center;
        }
        .stmt-entry:last-child { border-bottom: 0; }
        .stmt-entry-date { font-size: 12px; color: var(--text-faint); }
        .stmt-entry-desc {
          display: flex; flex-direction: column; min-width: 0;
        }
        .stmt-entry-note {
          font-size: 11.5px; color: var(--text-faint);
          font-style: italic; margin-top: 2px;
        }
        .stmt-entry-amt { text-align: right; font-size: 12.5px; }
        .stmt-entry-bal {
          text-align: right; font-weight: 700;
        }
        .stmt-empty {
          padding: 40px 20px; text-align: center; color: var(--text-muted);
          font-size: 13.5px;
        }

        .stmt-foot {
          padding-top: 16px;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 8px;
        }
        .stmt-foot-line {
          display: flex; justify-content: space-between;
          font-size: 13px; color: var(--text-muted);
        }
        .stmt-foot-line.grand {
          padding-top: 10px; margin-top: 4px;
          border-top: 1px dashed var(--border-strong);
          font-size: 16px; font-weight: 800; color: var(--text);
        }
        .stmt-note {
          margin-top: 20px; font-size: 11.5px;
          color: var(--text-faint); text-align: center; line-height: 1.6;
        }

        @media (max-width: 720px) {
          .stmt { padding: 20px 16px; }
          .stmt-head, .stmt-customer { flex-direction: column; gap: 12px; }
          .stmt-meta { text-align: left; }
          .stmt-meta-line { justify-content: flex-start; }
          .stmt-balance-box { text-align: left; }
          .stmt-entries-head { display: none; }
          .stmt-entry {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "date bal"
              "desc desc"
              "debit credit";
            row-gap: 6px;
          }
          .stmt-entry-date { grid-area: date; }
          .stmt-entry-bal { grid-area: bal; }
          .stmt-entry-desc { grid-area: desc; }
          .stmt-entry-amt:nth-of-type(1) { grid-area: debit; text-align: left; }
          .stmt-entry-amt:nth-of-type(2) { grid-area: credit; text-align: right; }
        }
      `}</style>
    </Modal>
  );
}