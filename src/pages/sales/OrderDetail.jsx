import { useState } from 'react';
import { Download, Printer, RotateCcw } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useBusiness } from '@/context/BusinessContext';
import { formatKSh } from '@/utils/format';

const statusTone = {
  COMPLETED: 'success',
  PENDING: 'warning',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

export default function OrderDetail({ open, order, onClose, onRefund }) {
  const { business } = useBusiness();
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const items = order.itemsList || [];
  const subtotal = order.subtotal ?? Math.round(order.total / 1.16);
  const tax = order.tax ?? order.total - subtotal;

  const handleRefund = async () => {
    setBusy(true);
    try {
      await onRefund(order.id);
      setConfirmRefund(false);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Order #${order.id}`}
        subtitle={`${order.date} · ${order.cashier || 'Owner'}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" leftIcon={<Printer size={14} />} onClick={() => window.print()}>
              Print receipt
            </Button>
            <Button variant="outline" leftIcon={<Download size={14} />}>
              Download
            </Button>
            {order.status === 'COMPLETED' && (
              <Button
                variant="danger"
                leftIcon={<RotateCcw size={14} />}
                onClick={() => setConfirmRefund(true)}
              >
                Refund
              </Button>
            )}
          </>
        }
      >
        <div className="stack gap-20">
          <div className="od-head print-hide">
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Customer</div>
              <div className="bold" style={{ fontSize: 15 }}>{order.customer}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Payment</div>
              <div className="bold" style={{ fontSize: 15 }}>{order.method}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Status</div>
              <Badge tone={statusTone[order.status]}>{order.status}</Badge>
            </div>
            {order.reference && (
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Reference</div>
                <div className="mono bold" style={{ fontSize: 13 }}>{order.reference}</div>
              </div>
            )}
          </div>

          <div className="od-items">
            <div className="od-items-head">
              <span>Item</span>
              <span className="mono">Qty</span>
              <span className="mono">Price</span>
              <span className="mono" style={{ textAlign: 'right' }}>Total</span>
            </div>
            {items.map((it, i) => (
              <div key={i} className="od-row">
                <span>{it.name}</span>
                <span className="mono">{it.qty}</span>
                <span className="mono">{formatKSh(it.price)}</span>
                <span className="mono bold" style={{ textAlign: 'right' }}>
                  {formatKSh(it.qty * it.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="od-totals">
            <div className="od-total-row"><span>Subtotal</span><span className="mono">{formatKSh(subtotal)}</span></div>
            <div className="od-total-row"><span>VAT</span><span className="mono">{formatKSh(tax)}</span></div>
            {order.discount > 0 && (
              <div className="od-total-row"><span>Discount</span><span className="mono">-{formatKSh(order.discount)}</span></div>
            )}
            <div className="od-total-row grand">
              <span>Total</span>
              <span className="mono">{formatKSh(order.total)}</span>
            </div>
          </div>

          <div className="od-receipt print-area">
            <div className="od-receipt-brand">{business.name || 'Your Business'}</div>
            {(business.location || business.phone) && (
              <div className="od-receipt-meta">
                {[business.location, business.phone].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="od-receipt-meta">
              Order #{order.id} · {order.date}
            </div>
            <div className="od-receipt-meta">
              Paid via {order.method}{order.reference ? ` · Ref ${order.reference}` : ''}
            </div>
          </div>
        </div>

        <style>{`
          .od-head {
            display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 16px; padding: 16px;
            background: var(--bg-soft); border-radius: 12px;
          }
          @media (max-width: 720px) { .od-head { grid-template-columns: 1fr 1fr; } }
          .od-items { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
          .od-items-head {
            display: grid; grid-template-columns: 2fr 60px 110px 120px;
            padding: 10px 14px; background: #f8fafc;
            font-size: 11.5px; font-weight: 700; color: var(--text-muted);
            text-transform: uppercase; letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border);
          }
          .od-row {
            display: grid; grid-template-columns: 2fr 60px 110px 120px;
            padding: 12px 14px; font-size: 13.5px;
            border-bottom: 1px solid var(--border);
          }
          .od-row:last-child { border-bottom: 0; }
          .od-totals {
            display: flex; flex-direction: column; gap: 8px;
            padding: 4px 4px 0; font-size: 13.5px;
          }
          .od-total-row { display: flex; justify-content: space-between; color: var(--text-muted); }
          .od-total-row.grand {
            color: var(--text); font-size: 16px; font-weight: 800;
            padding-top: 10px; border-top: 1px dashed var(--border-strong); margin-top: 4px;
          }
          .od-receipt {
            border: 1px dashed var(--border-strong); border-radius: 12px;
            padding: 14px; text-align: center;
            font-family: 'Courier New', monospace;
          }
          .od-receipt-brand { font-weight: 700; font-size: 15px; }
          .od-receipt-meta { font-size: 11.5px; color: var(--text-muted); margin-top: 4px; }
        `}</style>
      </Modal>

      <ConfirmDialog
        open={confirmRefund}
        onClose={() => setConfirmRefund(false)}
        onConfirm={handleRefund}
        title="Refund this order"
        message={
          busy
            ? 'Processing refund…'
            : `Refund #${order.id} for ${formatKSh(order.total)}? Stock will be restored and M-Pesa will be reversed if applicable.`
        }
        confirmLabel={busy ? 'Refunding…' : 'Refund order'}
      />
    </>
  );
}