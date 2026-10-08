import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, CheckCircle2, Clock, PackageCheck, Play,
  Printer, StopCircle, Truck, XCircle,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { purchaseService } from '@/services/purchaseService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import { formatLongDateTime } from '@/utils/billing';
import './PurchaseDetail.css';

const STATUS_TONE = {
  draft: 'neutral',
  ordered: 'info',
  partial: 'warning',
  received: 'success',
  cancelled: 'danger',
};

const STATUS_LABEL = {
  draft: 'Draft',
  ordered: 'Ordered',
  partial: 'Partially received',
  received: 'Received',
  cancelled: 'Cancelled',
};

export default function PurchaseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { business } = useBusiness();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState({});
  const [receiveNote, setReceiveNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = await purchaseService.get(id);
    setPo(p);
    setLoading(false);
    return p;
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off = eventBus.on(EVENTS.PO_UPDATED, updated => {
      if (updated && updated.id === id) setPo(updated);
    });
    return off;
  }, [id]);

  const totals = useMemo(() => {
    if (!po) return { ordered: 0, received: 0, receivedValue: 0, remainingValue: 0 };
    const ordered = po.items.reduce((s, i) => s + i.qty, 0);
    const received = po.items.reduce((s, i) => s + (i.received || 0), 0);
    const receivedValue = po.items.reduce(
      (s, i) => s + (i.received || 0) * i.buyingPrice,
      0
    );
    const remainingValue = po.items.reduce(
      (s, i) => s + (i.qty - (i.received || 0)) * i.buyingPrice,
      0
    );
    return { ordered, received, receivedValue, remainingValue };
  }, [po]);

  const openReceive = () => {
    if (!po) return;
    const defaults = {};
    po.items.forEach(i => {
      const remaining = i.qty - (i.received || 0);
      defaults[i.productId] = remaining > 0 ? remaining : 0;
    });
    setReceiveQty(defaults);
    setReceiveNote('');
    setReceiveOpen(true);
  };

  const doReceive = async () => {
    if (!po) return;
    const lines = Object.entries(receiveQty)
      .map(([productId, qty]) => ({ productId, qty: Number(qty) || 0 }))
      .filter(l => l.qty > 0);

    if (lines.length === 0) {
      toast.warning('Enter at least one quantity to receive.');
      return;
    }

    setBusy(true);
    try {
      await purchaseService.receive(po.id, { lines, note: receiveNote });
      toast.success('Stock received and inventory updated.');
      setReceiveOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not receive stock.');
    } finally {
      setBusy(false);
    }
  };

  const doMarkOrdered = async () => {
    setBusy(true);
    try {
      await purchaseService.markOrdered(po.id);
      toast.success('Purchase order marked as ordered.');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update order.');
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    setBusy(true);
    try {
      await purchaseService.cancel(po.id);
      toast.success('Purchase order cancelled.');
      setConfirmCancel(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not cancel order.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 260 }} />
        <div className="skeleton" style={{ height: 140 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="stack gap-16">
        <h1 className="page-title">Purchase order not found</h1>
        <Link to="/purchases">
          <Button variant="outline" leftIcon={<ArrowLeft size={14} />}>
            Back to purchases
          </Button>
        </Link>
      </div>
    );
  }

  const canReceive = po.status === 'ordered' || po.status === 'partial';
  const canCancel = po.status === 'draft' || po.status === 'ordered';
  const canOrder = po.status === 'draft';

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <button className="back-link" onClick={() => nav('/purchases')}>
            <ArrowLeft size={14} /> Back to purchases
          </button>
          <div className="row gap-12" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <h1 className="page-title mono">{po.number}</h1>
            <Badge tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status]}</Badge>
          </div>
          <p className="page-sub muted">
            {po.supplierName} · created {formatLongDateTime(po.createdAt)}
          </p>
        </div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          {canOrder && (
            <Button
              variant="outline"
              leftIcon={<Play size={14} />}
              onClick={doMarkOrdered}
              loading={busy}
            >
              Mark as ordered
            </Button>
          )}
          {canReceive && (
            <Button leftIcon={<PackageCheck size={14} />} onClick={openReceive}>
              Receive stock
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              leftIcon={<StopCircle size={14} />}
              onClick={() => setConfirmCancel(true)}
            >
              Cancel
            </Button>
          )}
        </div>
      </header>

      <section className="pd-status-strip">
        <div className="pd-strip-cell">
          <Clock size={14} />
          <div>
            <div className="pd-strip-label">Created</div>
            <div className="pd-strip-value mono">{formatLongDateTime(po.createdAt)}</div>
          </div>
        </div>
        <div className="pd-strip-cell">
          <Play size={14} />
          <div>
            <div className="pd-strip-label">Ordered</div>
            <div className="pd-strip-value mono">
              {po.orderedAt ? formatLongDateTime(po.orderedAt) : '—'}
            </div>
          </div>
        </div>
        <div className="pd-strip-cell">
          <PackageCheck size={14} />
          <div>
            <div className="pd-strip-label">Received</div>
            <div className="pd-strip-value mono">
              {po.receivedAt ? formatLongDateTime(po.receivedAt) : '—'}
            </div>
          </div>
        </div>
        <div className="pd-strip-cell">
          <Truck size={14} />
          <div>
            <div className="pd-strip-label">Expected</div>
            <div className="pd-strip-value mono">
              {po.expectedAt
                ? new Date(po.expectedAt).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                : 'Not set'}
            </div>
          </div>
        </div>
      </section>

      <Card title="Line items" subtitle={`${po.items.length} product${po.items.length === 1 ? '' : 's'}`}>
        <div className="pd-lines">
          <div className="pd-lines-head">
            <span>Product</span>
            <span>Ordered</span>
            <span>Received</span>
            <span>Buying price</span>
            <span style={{ textAlign: 'right' }}>Line total</span>
          </div>
          {po.items.map(i => {
            const remaining = i.qty - (i.received || 0);
            const fully = remaining === 0;
            return (
              <div key={i.productId} className={`pd-line ${fully ? 'done' : ''}`}>
                <div className="pd-line-prod">
                  <div className="pd-line-name">
                    {i.name}
                    {fully && (
                      <span className="pd-line-check">
                        <CheckCircle2 size={13} />
                      </span>
                    )}
                  </div>
                  <div className="pd-line-sku mono">{i.sku}</div>
                </div>
                <div className="mono">{i.qty}</div>
                <div className="mono">
                  <strong>{i.received || 0}</strong>
                  {!fully && (
                    <span className="pd-line-rem">
                      · {remaining} left
                    </span>
                  )}
                </div>
                <div className="mono">{formatKSh(i.buyingPrice)}</div>
                <div className="mono bold" style={{ textAlign: 'right' }}>
                  {formatKSh(i.qty * i.buyingPrice)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pd-totals">
          <div className="pd-totals-row">
            <span className="muted">Subtotal</span>
            <span className="mono">{formatKSh(po.subtotal)}</span>
          </div>
          <div className="pd-totals-row">
            <span className="muted">Received value</span>
            <span className="mono">{formatKSh(totals.receivedValue)}</span>
          </div>
          {totals.remainingValue > 0 && (
            <div className="pd-totals-row warn">
              <span>Still to receive</span>
              <span className="mono">{formatKSh(totals.remainingValue)}</span>
            </div>
          )}
          <div className="pd-totals-row grand">
            <span>Total</span>
            <span className="mono">{formatKSh(po.total)}</span>
          </div>
        </div>
      </Card>

      {po.notes && (
        <Card title="Notes">
          <p className="pd-notes">{po.notes}</p>
        </Card>
      )}

      {/* Receive modal */}
      <Modal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title="Receive stock"
        subtitle={`${po.number} · ${po.supplierName}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={doReceive} loading={busy} leftIcon={<PackageCheck size={14} />}>
              Receive now
            </Button>
          </>
        }
      >
        <div className="stack gap-16">
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Enter how much of each line you are receiving now. Adjust the
            quantities if some items did not arrive. Remaining quantities can be
            received later.
          </p>

          <div className="pd-receive-list">
            {po.items.map(i => {
              const remaining = i.qty - (i.received || 0);
              const fully = remaining === 0;
              const value = receiveQty[i.productId] || 0;
              return (
                <div key={i.productId} className={`pd-receive-row ${fully ? 'done' : ''}`}>
                  <div className="pd-receive-prod">
                    <div className="pd-line-name">{i.name}</div>
                    <div className="pd-line-sku mono">
                      {i.sku} · remaining {remaining} of {i.qty}
                    </div>
                  </div>
                  {fully ? (
                    <Badge tone="success">Complete</Badge>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      className="pd-receive-input mono"
                      value={value}
                      onChange={e => {
                        const raw = Math.max(0, Math.min(Number(e.target.value) || 0, remaining));
                        setReceiveQty(prev => ({ ...prev, [i.productId]: raw }));
                      }}
                    />
                  )}
                  <div className="pd-receive-total mono">
                    {formatKSh(value * i.buyingPrice)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pd-receive-summary">
            <span className="muted">Value of this receipt</span>
            <span className="mono bold">
              {formatKSh(
                Object.entries(receiveQty).reduce((sum, [pid, qty]) => {
                  const item = po.items.find(i => i.productId === pid);
                  return sum + (item ? qty * item.buyingPrice : 0);
                }, 0)
              )}
            </span>
          </div>

          <div className="pd-field">
            <label className="pd-label">Note (optional)</label>
            <div className="pd-textarea-wrap">
              <textarea
                rows={2}
                className="pd-textarea"
                value={receiveNote}
                onChange={e => setReceiveNote(e.target.value)}
                placeholder="e.g. 2 units damaged, returned to supplier"
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title="Cancel purchase order"
        message={`Cancel ${po.number}? Any received stock stays in your inventory; the rest will not be delivered against this order.`}
        confirmLabel="Cancel order"
      />
    </div>
  );
}