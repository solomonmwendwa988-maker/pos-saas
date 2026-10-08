// Onboarding.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Check, CreditCard, FileText,
  MapPin, Phone, Receipt, Settings2, ShoppingCart,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Card from '@/components/common/Card';
import Logo from '@/components/common/Logo';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import './Onboarding.css';

const STEPS = [
  { id: 0, label: 'Business', icon: Building2 },
  { id: 1, label: 'Tax', icon: FileText },
  { id: 2, label: 'Receipt', icon: Receipt },
  { id: 3, label: 'Finish', icon: Check },
];

const BUSINESS_TYPES = [
  'Mini-market', 'Supermarket', 'Boutique', 'Electronics',
  'Pharmacy', 'Hardware', 'Stationery', 'Restaurant', 'Other',
];

export default function Onboarding() {
  const nav = useNavigate();
  const toast = useToast();
  const { business, completeOnboarding } = useBusiness();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: business.name === 'Kamau Mini Market' ? '' : business.name,
    type: business.type,
    phone: business.phone,
    location: business.location,
    currency: 'KSh',
    taxRate: business.taxRate,
    receiptFooter: business.receiptFooter,
    lowStockThreshold: business.lowStockThreshold,
    paymentMethods: { ...business.paymentMethods },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPayment = (k, v) =>
    setForm(f => ({ ...f, paymentMethods: { ...f.paymentMethods, [k]: v } }));

  const stepValid = useMemo(() => {
    if (step === 0) return form.name.trim().length > 1 && form.phone.trim().length > 6 && form.location.trim().length > 1;
    if (step === 1) return form.currency && Number(form.taxRate) >= 0 && Number(form.taxRate) <= 30;
    if (step === 2) return form.receiptFooter.trim().length > 0 && (form.paymentMethods.cash || form.paymentMethods.mpesa);
    return true;
  }, [step, form]);

  const next = () => { if (stepValid) setStep(s => s + 1); };
  const back = () => setStep(s => Math.max(0, s - 1));

  const finish = () => {
    completeOnboarding({
      name: form.name.trim(),
      type: form.type,
      phone: form.phone,
      location: form.location,
      currency: form.currency,
      taxRate: Number(form.taxRate),
      receiptFooter: form.receiptFooter.trim(),
      lowStockThreshold: Number(form.lowStockThreshold),
      paymentMethods: form.paymentMethods,
    });
    toast.success('Your workspace is ready', { title: 'Welcome to Sokoni' });
    nav('/dashboard', { replace: true });
  };

  return (
    <div className="ob">
      <header className="ob-head">
        <Logo />
        <div className="ob-progress">
          <span className="ob-progress-text">Step {step + 1} of {STEPS.length}</span>
          <div className="ob-progress-track">
            <span
              className="ob-progress-fill"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="ob-main">
        <aside className="ob-side">
          <div className="ob-side-inner">
            <h2 className="ob-side-title">Welcome to Sokoni</h2>
            <p className="ob-side-sub">
              Let's set up your workspace. This takes less than two minutes
              and you can change everything later in Settings.
            </p>
            <ol className="ob-steps">
              {STEPS.map(s => {
                const Icon = s.icon;
                return (
                  <li
                    key={s.id}
                    className={
                      s.id < step ? 'done' : s.id === step ? 'active' : ''
                    }
                  >
                    <span className="ob-step-dot">
                      {s.id < step ? <Check size={13} /> : <Icon size={14} />}
                    </span>
                    <span className="ob-step-label">{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <section className="ob-content">
          <div className="ob-card fade-up">
            {step === 0 && (
              <>
                <header className="ob-title-block">
                  <h1 className="ob-title">Tell us about your business</h1>
                  <p className="ob-sub">This appears on receipts and reports.</p>
                </header>
                <div className="stack gap-16">
                  <Input
                    label="Business name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Kamau Mini Market"
                    leftIcon={<Building2 size={16} />}
                  />
                  <div className="field">
                    <label className="field-label">Business type</label>
                    <div className="field-control">
                      <select
                        className="field-input"
                        value={form.type}
                        onChange={e => set('type', e.target.value)}
                      >
                        {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <Input
                      label="Phone number"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="0712 345 678"
                      leftIcon={<Phone size={16} />}
                    />
                    <Input
                      label="Location"
                      value={form.location}
                      onChange={e => set('location', e.target.value)}
                      placeholder="e.g. Nakuru Town"
                      leftIcon={<MapPin size={16} />}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <header className="ob-title-block">
                  <h1 className="ob-title">Currency and tax</h1>
                  <p className="ob-sub">
                    Set the currency you sell in and the VAT rate applied to sales.
                  </p>
                </header>
                <div className="stack gap-16">
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
                    hint="Kenya standard rate is 16%. Set to 0 if you are not VAT-registered."
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <header className="ob-title-block">
                  <h1 className="ob-title">Receipts and payments</h1>
                  <p className="ob-sub">
                    Choose the payment methods you accept at the counter.
                  </p>
                </header>
                <div className="stack gap-16">
                  <div>
                    <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
                      Accepted payment methods
                    </label>
                    <div className="ob-toggle-grid">
                      <button
                        type="button"
                        className={`ob-toggle ${form.paymentMethods.cash ? 'on' : ''}`}
                        onClick={() => setPayment('cash', !form.paymentMethods.cash)}
                      >
                        <ShoppingCart size={18} />
                        <div>
                          <div className="ob-toggle-name">Cash</div>
                          <div className="ob-toggle-desc">Physical till payments</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`ob-toggle ${form.paymentMethods.mpesa ? 'on' : ''}`}
                        onClick={() => setPayment('mpesa', !form.paymentMethods.mpesa)}
                      >
                        <CreditCard size={18} />
                        <div>
                          <div className="ob-toggle-name">M-Pesa</div>
                          <div className="ob-toggle-desc">STK push to customer phone</div>
                        </div>
                      </button>
                    </div>
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
                        placeholder="Thank you for shopping with us."
                      />
                    </div>
                    <span className="field-hint">
                      Printed at the bottom of every customer receipt.
                    </span>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <header className="ob-title-block">
                  <h1 className="ob-title">Almost ready</h1>
                  <p className="ob-sub">
                    One last setting, then we'll open your dashboard.
                  </p>
                </header>
                <div className="stack gap-16">
                  <Input
                    label="Default low-stock threshold"
                    type="number"
                    min="1"
                    value={form.lowStockThreshold}
                    onChange={e => set('lowStockThreshold', e.target.value)}
                    hint="Products are flagged when stock drops to or below this number."
                  />

                  <Card padding="md" className="ob-summary">
                    <div className="ob-summary-title">
                      <Settings2 size={15} /> Workspace summary
                    </div>
                    <div className="ob-summary-grid">
                      <SummaryRow label="Business" value={form.name || '—'} />
                      <SummaryRow label="Type" value={form.type} />
                      <SummaryRow label="Location" value={form.location || '—'} />
                      <SummaryRow label="Currency" value={form.currency} />
                      <SummaryRow label="VAT rate" value={`${form.taxRate}%`} />
                      <SummaryRow
                        label="Payments"
                        value={
                          [
                            form.paymentMethods.cash && 'Cash',
                            form.paymentMethods.mpesa && 'M-Pesa',
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'
                        }
                      />
                    </div>
                  </Card>
                </div>
              </>
            )}

            <div className="ob-actions">
              {step > 0 ? (
                <Button variant="outline" leftIcon={<ArrowLeft size={14} />} onClick={back}>
                  Back
                </Button>
              ) : <span />}

              {step < STEPS.length - 1 ? (
                <Button
                  rightIcon={<ArrowRight size={14} />}
                  onClick={next}
                  disabled={!stepValid}
                >
                  Continue
                </Button>
              ) : (
                <Button onClick={finish} rightIcon={<Check size={14} />}>
                  Finish and open dashboard
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="ob-summary-row">
      <span className="muted">{label}</span>
      <span className="bold">{value}</span>
    </div>
  );
}