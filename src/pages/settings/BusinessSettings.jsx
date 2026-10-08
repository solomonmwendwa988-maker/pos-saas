import { useState } from 'react';
import { Building2, MapPin, Phone, Upload } from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import InstallButton from '@/components/common/InstallButton';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import './Settings.css';

const BUSINESS_TYPES = [
  'Mini-market',
  'Supermarket',
  'Boutique',
  'Electronics',
  'Pharmacy',
  'Hardware',
  'Stationery',
  'Restaurant',
  'Other',
];

export default function BusinessSettings() {
  const { business, update } = useBusiness();
  const toast = useToast();

  const [form, setForm] = useState({ ...business });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onLogo = file => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo must be under 1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('logoDataUrl', reader.result);
    reader.readAsDataURL(file);
  };

  const save = async e => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Business name is required.');
      return;
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      setError('Enter a valid email address.');
      return;
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    update({
      name: form.name.trim(),
      type: form.type,
      phone: form.phone.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      logoDataUrl: form.logoDataUrl,
      lowStockThreshold: Number(form.lowStockThreshold) || 10,
    });
    setSaving(false);
    toast.success('Business details saved.');
  };

  const reset = () => {
    setForm({ ...business });
    setError('');
  };

  return (
    <form onSubmit={save} className="stack gap-24">
      {/* ---------- Logo ---------- */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Business logo</div>
            <div className="settings-card-sub">
              Displayed on receipts, reports and invoices. PNG or SVG
              recommended, up to 1MB.
            </div>
          </div>
        </div>

        <div className="logo-upload">
          <div className="logo-preview">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt="Business logo" />
            ) : (
              (form.name?.[0] || 'S').toUpperCase()
            )}
          </div>

          <div className="logo-actions">
            <label htmlFor="logo-file">
              <span
                className="btn btn-outline btn-md"
                style={{ display: 'inline-flex', cursor: 'pointer' }}
              >
                <Upload size={14} />
                <span>Upload logo</span>
              </span>
            </label>
            <input
              id="logo-file"
              type="file"
              accept="image/*"
              className="file-input"
              onChange={e => onLogo(e.target.files?.[0])}
            />

            {form.logoDataUrl && (
              <button
                type="button"
                className="logo-remove"
                onClick={() => set('logoDataUrl', null)}
              >
                Remove
              </button>
            )}

            <span className="logo-hint">
              Recommended 512×512px, square, under 1MB
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Business details ---------- */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Business details</div>
            <div className="settings-card-sub">
              These appear on every receipt, invoice and report you generate.
            </div>
          </div>
        </div>

        <div className="stack gap-16">
          <div className="grid-2">
            <Input
              label="Business name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              leftIcon={<Building2 size={15} />}
              placeholder="e.g. Kamau Mini Market"
            />
            <div className="field">
              <label className="field-label" htmlFor="business-type">
                Business type
              </label>
              <div className="field-control">
                <select
                  id="business-type"
                  className="field-input"
                  value={form.type}
                  onChange={e => set('type', e.target.value)}
                >
                  {BUSINESS_TYPES.map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <Input
              label="Phone number"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              leftIcon={<Phone size={15} />}
              placeholder="0712 345 678"
            />
            <Input
              label="Email address"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="owner@duka.co.ke"
            />
          </div>

          <Input
            label="Business location"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            leftIcon={<MapPin size={15} />}
            placeholder="e.g. Nakuru Town"
          />

          <Input
            label="Default low-stock threshold"
            type="number"
            min="1"
            value={form.lowStockThreshold}
            onChange={e => set('lowStockThreshold', e.target.value)}
            hint="Used as the default when adding new products. Each product can override this."
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="settings-actions">
          <Button variant="outline" type="button" onClick={reset}>
            Reset
          </Button>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </section>

      {/* ---------- Install app ---------- */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Install Sokoni</div>
            <div className="settings-card-sub">
              Install Sokoni on this device for one-tap access, offline
              support and automatic updates. It works like a native app —
              no app store required.
            </div>
          </div>
        </div>

        <div className="settings-install">
          <InstallButton />
        </div>

        <div className="settings-install-notes">
          <div className="settings-install-note">
            <strong>Works offline.</strong> Sell, add products and take
            inventory counts with no internet. Everything syncs when you're
            back online.
          </div>
          <div className="settings-install-note">
            <strong>One-tap access.</strong> Launch Sokoni straight from your
            home screen or desktop — no browser tab needed.
          </div>
          <div className="settings-install-note">
            <strong>Automatic updates.</strong> New features and fixes are
            delivered without you doing anything.
          </div>
        </div>
      </section>

      <style>{`
        .form-error {
          background: var(--danger-bg);
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
        }
        .settings-install {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .settings-install-notes {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 8px;
        }
        @media (max-width: 720px) {
          .settings-install-notes { grid-template-columns: 1fr; }
        }
        .settings-install-note {
          padding: 12px 14px;
          background: var(--bg-soft);
          border-radius: 10px;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .settings-install-note strong {
          color: var(--text);
          font-weight: 700;
        }
      `}</style>
    </form>
  );
}