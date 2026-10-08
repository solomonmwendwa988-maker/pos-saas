import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import { formatKSh } from '@/utils/format';

const KENYAN_PHONE = /^(?:\+254|0)(7\d{8}|1\d{8})$/;

export default function MpesaModal({ open, onClose, amount, onSuccess }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setError('');
      setRef('');
      setSecondsLeft(0);
    }
  }, [open]);

  useEffect(() => {
    if (step !== 'waiting') return;
    setSecondsLeft(45);
    const t = setInterval(() => setSecondsLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step === 'waiting' && secondsLeft === 0) setStep('timeout');
  }, [step, secondsLeft]);

  const sendPush = () => {
    if (!KENYAN_PHONE.test(phone.replace(/\s/g, ''))) {
      setError('Enter a valid Kenyan mobile number (07XX XXX XXX or +254 7XX XXX XXX).');
      return;
    }
    setError('');
    setStep('waiting');
    // Simulated status: backend will poll /api/payments/mpesa/status/:id
    setTimeout(() => {
      const ok = Math.random() > 0.15;
      if (ok) {
        setRef('QK' + Math.random().toString(36).slice(2, 8).toUpperCase());
        setStep('success');
      } else {
        setStep('failed');
      }
    }, 4200);
  };

  const finish = () => {
    onSuccess(ref);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="M-Pesa payment"
      subtitle={amount ? `Amount: ${formatKSh(amount)}` : ''}
      size="sm"
      footer={
        step === 'phone' ? (
          <>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={sendPush} leftIcon={<Smartphone size={14} />}>Send request</Button>
          </>
        ) : step === 'success' ? (
          <Button onClick={finish} full>Complete sale</Button>
        ) : step === 'failed' || step === 'timeout' ? (
          <>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => setStep('phone')}>Try again</Button>
          </>
        ) : null
      }
    >
      {step === 'phone' && (
        <div className="stack gap-14">
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>
            Enter the customer's phone number to receive the M-Pesa payment request.
          </p>
          <Input
            label="Customer phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0712 345 678"
            leftIcon={<Smartphone size={15} />}
            autoFocus
          />
          {error && <div className="form-error">{error}</div>}
        </div>
      )}

      {step === 'waiting' && (
        <div className="mpesa-state">
          <Loader2 className="spin" size={36} />
          <h4 className="mpesa-state-title">Waiting for customer</h4>
          <p className="mpesa-state-sub">
            An STK push was sent to <strong className="mono">{phone}</strong>.
            The customer needs to enter their M-Pesa PIN.
          </p>
          <Badge tone="warning">Expires in {secondsLeft}s</Badge>
        </div>
      )}

      {step === 'success' && (
        <div className="mpesa-state">
          <CheckCircle2 size={40} color="var(--success)" />
          <h4 className="mpesa-state-title">Payment received</h4>
          <p className="mpesa-state-sub">M-Pesa transaction confirmed.</p>
          <div className="mpesa-ref">
            <div className="row between"><span className="muted">Reference</span><span className="mono bold">{ref}</span></div>
            <div className="row between"><span className="muted">Amount</span><span className="mono bold">{formatKSh(amount)}</span></div>
            <div className="row between"><span className="muted">Phone</span><span className="mono">{phone}</span></div>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div className="mpesa-state">
          <XCircle size={40} color="var(--danger)" />
          <h4 className="mpesa-state-title">Payment failed</h4>
          <p className="mpesa-state-sub">
            The customer cancelled or the request failed. Try again or use cash.
          </p>
        </div>
      )}

      {step === 'timeout' && (
        <div className="mpesa-state">
          <XCircle size={40} color="var(--warning)" />
          <h4 className="mpesa-state-title">Request timed out</h4>
          <p className="mpesa-state-sub">
            The customer did not respond in time. Send another request.
          </p>
        </div>
      )}

      <style>{`
        .form-error {
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
        }
        .mpesa-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0; text-align: center; }
        .mpesa-state-title { font-size: 16px; font-weight: 700; margin: 0; }
        .mpesa-state-sub { color: var(--text-muted); font-size: 13.5px; margin: 0; max-width: 340px; }
        .mpesa-ref {
          width: 100%; background: var(--bg-soft); border-radius: 12px;
          padding: 14px 16px; margin-top: 6px;
          display: flex; flex-direction: column; gap: 10px; font-size: 13px;
        }
        .spin { animation: spin 0.9s linear infinite; }
      `}</style>
    </Modal>
  );
}