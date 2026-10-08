import { useState } from 'react';
import { Printer, Receipt } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import './Settings.css';

export default function ReceiptSettings() {
  const { business, update } = useBusiness();
  const toast = useToast();
  const [form, setForm] = useState({
    currency: business.currency,
    taxRate: business.taxRate,
    receiptFooter: business.receiptFooter,
    paymentMethods: { ...business.paymentMethods },
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPayment = (k, v) =>
    setForm(f => ({ ...f, paymentMethods: { ...f.paymentMethods, [k]: v } }));

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    update({
      currency: form.currency,
      taxRate: Number(form.taxRate),
      receiptFooter: form.receiptFooter.trim(),
      paymentMethods: form.paymentMethods,
    });
    setSaving(false);
    toast.success('Receipt settings saved.');
  };

  // Static preview only — shows format, not real transactions.
  const sample = {
    id: '1001',
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    method: 'M-Pesa',
    ref: 'QK12H7X9AB',
    total: 1250,
  };
  const subtotal = Math.round(sample.total / 1.16);
  const tax = sample.total - subtotal;

  return (
    <form onSubmit={save} className="stack gap-24">
      <section className="settings-card print-hide">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Receipt and tax</div>
            <div className="settings-card-sub">
              Applied to every sale receipt and printed at the bottom of each receipt.
            </div>
          </div>
        </div>

        <div className="stack gap-16">
          <div className="grid-2">
            <div className="field">
              <label className="field-label">Currency</label>
              <div className="field-control">
                <select
                  className="field-input"
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                >
                  <option value="KSh">Kenyan Shilling (KSh)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="TZS">Tanzanian Shilling (TZS)</option>
                  <option value="UGX">Ugandan Shilling (UGX)</option>
                </select>
              </div>
            </div>
            <Input
              label="VAT rate (%)"
              type="number"
              min="0"
              max="30"
              value={form.taxRate}
              onChange={e => set('taxRate', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">Receipt footer</label>
            <div className="field-control" style={{ padding: 0 }}>
              <textarea
                rows={3}
                className="field-input"
                style={{ padding: '11px 12px', resize: 'vertical' }}
                value={form.receiptFooter}
                onChange={e => set('receiptFooter', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
              Accepted payment methods
            </label>
            <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={form.paymentMethods.cash}
                  onChange={e => setPayment('cash', e.target.checked)}
                />
                <span>Cash</span>
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={form.paymentMethods.mpesa}
                  onChange={e => setPayment('mpesa', e.target.checked)}
                />
                <span>M-Pesa</span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <Button
            variant="outline"
            type="button"
            leftIcon={<Printer size={14} />}
            onClick={() => window.print()}
          >
            Test print
          </Button>
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </section>

      <Card
        title="Live receipt preview"
        subtitle="This is the format customers will see."
        action={<Receipt size={16} className="muted" />}
      >
        <div className="receipt print-area">
          <div className="receipt-head">
            <div className="receipt-brand">Sokoni POS</div>
            <div className="receipt-shop">{business.name || 'Your Business'}</div>
            <div className="receipt-meta">
              {business.location || '—'} {business.phone ? `· ${business.phone}` : ''}
            </div>
            <div className="receipt-meta">
              Order #{sample.id} · {sample.date}
            </div>
          </div>

          <div className="receipt-items">
            <div className="receipt-row"><span>Sample item 1</span><span className="mono">{formatKSh(390)}</span></div>
            <div className="receipt-row"><span>Sample item 2</span><span className="mono">{formatKSh(525)}</span></div>
            <div className="receipt-row"><span>Sample item 3</span><span className="mono">{formatKSh(335)}</span></div>
          </div>

          <div className="receipt-totals">
            <div className="receipt-row"><span>Subtotal</span><span className="mono">{formatKSh(subtotal)}</span></div>
            <div className="receipt-row"><span>VAT ({form.taxRate}%)</span><span className="mono">{formatKSh(tax)}</span></div>
            <div className="receipt-row grand"><span>Total</span><span className="mono">{formatKSh(sample.total)}</span></div>
          </div>

          <div className="receipt-pay">
            Paid via {sample.method} · Ref {sample.ref}
          </div>
          <div className="receipt-footer">{form.receiptFooter}</div>
        </div>
      </Card>

      <style>{`
        .check-line {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13.5px; color: var(--text); cursor: pointer;
          padding: 8px 14px; border-radius: 10px;
          border: 1px solid var(--border-strong); background: #fff;
        }
        .check-line input { accent-color: var(--primary); }
        .receipt {
          background: #fff; border: 1px dashed var(--border-strong);
          border-radius: 12px; padding: 22px;
          font-family: 'Courier New', monospace; max-width: 420px; margin: 0 auto;
        }
        .receipt-head {
          text-align: center; padding-bottom: 12px;
          border-bottom: 1px dashed var(--border-strong); margin-bottom: 12px;
        }
        .receipt-brand { font-size: 11px; letter-spacing: 0.15em; color: var(--text-muted); }
        .receipt-shop { font-weight: 700; font-size: 15px; margin-top: 4px; }
        .receipt-meta { font-size: 11.5px; color: var(--text-faint); margin-top: 4px; }
        .receipt-items { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; }
        .receipt-row { display: flex; justify-content: space-between; }
        .receipt-totals {
          margin-top: 12px; padding-top: 12px;
          border-top: 1px dashed var(--border-strong);
          display: flex; flex-direction: column; gap: 6px; font-size: 12.5px;
        }
        .receipt-row.grand { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .receipt-pay {
          text-align: center; font-size: 11.5px; color: var(--text-muted);
          margin-top: 12px; padding-top: 12px;
          border-top: 1px dashed var(--border-strong);
        }
        .receipt-footer {
          text-align: center; font-size: 11.5px; color: var(--text-muted);
          margin-top: 10px; font-style: italic;
        }
      `}</style>
    </form>
  );
}