import { Printer } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { useBusiness } from '@/context/BusinessContext';
import { formatKSh } from '@/utils/format';
import { formatShortDate, formatLongDateTime } from '@/utils/billing';
import './InvoicePreview.css';

export default function InvoicePreview({ invoice, open, onClose }) {
  const { business } = useBusiness();
  if (!invoice) return null;

  const statusTone =
    invoice.status === 'paid' || invoice.status === 'credited'
      ? 'paid'
      : invoice.status === 'pending'
      ? 'pending'
      : 'failed';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invoice"
      subtitle={invoice.number}
      size="md"
      footer={
        <>
          <Button variant="outline" leftIcon={<Printer size={14} />} onClick={() => window.print()}>
            Print / Save
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="inv print-area">
        <header className="inv-head">
          <div>
            <div className="inv-brand">Sokoni</div>
            <div className="inv-biz-name">{business.name || 'Your Business'}</div>
            {(business.location || business.phone) && (
              <div className="inv-biz-meta">
                {[business.location, business.phone].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div className="inv-meta">
            <div className={`inv-status inv-status-${statusTone}`}>{invoice.status.toUpperCase()}</div>
            <div className="inv-meta-line">
              <span>Issued</span>
              <span className="mono">{formatShortDate(invoice.issuedAt)}</span>
            </div>
            {invoice.periodStart && (
              <div className="inv-meta-line">
                <span>Period</span>
                <span className="mono">
                  {formatShortDate(invoice.periodStart)} — {formatShortDate(invoice.periodEnd)}
                </span>
              </div>
            )}
          </div>
        </header>

        <section className="inv-detail">
          <div className="inv-detail-row">
            <span className="inv-detail-label">Invoice number</span>
            <span className="mono">{invoice.number}</span>
          </div>
          <div className="inv-detail-row">
            <span className="inv-detail-label">Issued on</span>
            <span className="mono">{formatLongDateTime(invoice.issuedAt)}</span>
          </div>
          <div className="inv-detail-row">
            <span className="inv-detail-label">Payment method</span>
            <span className="mono">
              {invoice.method === 'mpesa' ? 'M-Pesa' : invoice.method || '—'}
            </span>
          </div>
        </section>

        <section className="inv-items">
          <div className="inv-items-head">
            <span>Description</span>
            <span>Cycle</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          <div className="inv-row">
            <span>
              <strong>{invoice.planName}</strong>
              <div className="inv-row-sub">
                {invoice.type === 'proration-charge' && 'Prorated upgrade charge'}
                {invoice.type === 'proration-credit' && 'Prorated credit applied'}
                {invoice.type === 'subscription' && 'Subscription payment'}
              </div>
            </span>
            <span className="inv-cycle">
              {invoice.cycle === 'annual' ? 'Annual' : invoice.cycle === 'proration' ? 'Prorated' : 'Monthly'}
            </span>
            <span className="mono bold" style={{ textAlign: 'right' }}>
              {formatKSh(invoice.amount)}
            </span>
          </div>
        </section>

        <footer className="inv-total">
          <div className="inv-total-line">
            <span>Subtotal</span>
            <span className="mono">{formatKSh(invoice.amount)}</span>
          </div>
          <div className="inv-total-line">
            <span>VAT (included)</span>
            <span className="mono">{formatKSh(Math.round(invoice.amount * 0.16 / 1.16))}</span>
          </div>
          <div className="inv-total-line grand">
            <span>Total</span>
            <span className="mono">{formatKSh(invoice.amount)}</span>
          </div>
        </footer>

        <div className="inv-foot">
          Thank you for using Sokoni. For questions about this invoice, contact
          support@sokoni.co.ke.
        </div>
      </div>
    </Modal>
  );
}