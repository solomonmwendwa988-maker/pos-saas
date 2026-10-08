import { useState } from 'react';
import { Banknote, CreditCard, DollarSign } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { customerLedgerService } from '@/services/customerLedgerService';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';

export default function RecordPaymentModal({
  open,
  customer,
  balance,
  onClose,
  onRecorded,
}) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setAmount('');
    setMethod('cash');
    setReference('');
    setNote('');
    setError('');
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    const n = Number(amount);
    if (!n || n <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    if (n > balance + 0.01) {
      setError(
        `Payment is more than the outstanding balance (${formatKSh(balance)}). Reduce the amount or record an adjustment.`
      );
      return;
    }
    if (method === 'mpesa' && !reference.trim()) {
      setError('Enter the M-Pesa transaction reference.');
      return;
    }

    setBusy(true);
    try {
      await customerLedgerService.recordPayment({
        customerId: customer.id,
        amount: n,
        method,
        reference,
        note,
      });
      toast.success(`Payment of ${formatKSh(n)} recorded.`);
      reset();
      onRecorded?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not record payment.');
    } finally {
      setBusy(false);
    }
  };

  const quickAmounts = [
    Math.round(balance * 0.25),
    Math.round(balance * 0.5),
    balance,
  ].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Record payment"
      subtitle={customer ? customer.name : ''}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} leftIcon={<DollarSign size={14} />}>
            Record payment
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="stack gap-16">
        <div className="rp-balance">
          <span className="muted">Outstanding balance</span>
          <span className="mono bold">{formatKSh(balance)}</span>
        </div>

        {quickAmounts.length > 0 && (
          <div className="rp-quick">
            {quickAmounts.map(v => (
              <button
                key={v}
                type="button"
                className={`rp-quick-btn ${Number(amount) === v ? 'on' : ''}`}
                onClick={() => setAmount(String(v))}
              >
                {formatKSh(v)}
              </button>
            ))}
          </div>
        )}

        <Input
          label="Amount (KSh)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          autoFocus
        />

        <div>
          <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
            Payment method
          </label>
          <div className="row gap-8">
            <button
              type="button"
              className={`rp-method ${method === 'cash' ? 'on' : ''}`}
              onClick={() => setMethod('cash')}
            >
              <Banknote size={16} />
              <span>Cash</span>
            </button>
            <button
              type="button"
              className={`rp-method ${method === 'mpesa' ? 'on' : ''}`}
              onClick={() => setMethod('mpesa')}
            >
              <CreditCard size={16} />
              <span>M-Pesa</span>
            </button>
          </div>
        </div>

        <Input
          label={method === 'mpesa' ? 'M-Pesa reference' : 'Reference (optional)'}
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder={method === 'mpesa' ? 'e.g. QK12H7X9AB' : 'e.g. receipt number'}
        />

        <div className="field">
          <label className="field-label">Note (optional)</label>
          <div className="field-control" style={{ padding: 0 }}>
            <textarea
              rows={2}
              className="field-input"
              style={{ padding: '10px 12px', resize: 'vertical' }}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any details about this payment"
            />
          </div>
        </div>

        {error && <div className="rp-error">{error}</div>}
      </form>

      <style>{`
        .rp-balance {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 12px 14px; background: var(--bg-soft);
          border-radius: 10px; font-size: 13.5px;
        }
        .rp-quick { display: flex; gap: 8px; flex-wrap: wrap; }
        .rp-quick-btn {
          padding: 6px 12px; border-radius: 999px;
          background: #fff; border: 1px solid var(--border-strong);
          font-size: 12.5px; font-weight: 600; color: var(--text-muted);
          cursor: pointer; transition: all var(--dur);
        }
        .rp-quick-btn:hover { border-color: var(--primary); color: var(--primary); }
        .rp-quick-btn.on {
          background: var(--primary-50); border-color: var(--primary);
          color: var(--primary);
        }
        .rp-method {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 12px;
          border-radius: 10px; border: 1px solid var(--border-strong);
          background: #fff; cursor: pointer;
          font-weight: 600; font-size: 13.5px; color: var(--text-muted);
          transition: all var(--dur);
        }
        .rp-method.on {
          border-color: var(--primary); background: var(--primary-50);
          color: var(--primary);
        }
        .rp-error {
          padding: 10px 14px; border-radius: 10px;
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; font-size: 13px; font-weight: 500;
        }
      `}</style>
    </Modal>
  );
}