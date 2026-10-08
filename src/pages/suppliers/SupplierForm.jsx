import { useState } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const KENYAN_PHONE = /^(?:\+254|0)(7\d{8}|1\d{8})$/;

export default function SupplierForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    contact: initial?.contact ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    status: initial?.status ?? 'active',
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = e => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Supplier name is required.');
    if (!form.contact.trim()) return setError('Contact person is required.');
    if (!KENYAN_PHONE.test(form.phone.replace(/\s/g, ''))) {
      return setError('Enter a valid Kenyan phone number.');
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      return setError('Enter a valid email address.');
    }
    setError('');
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="stack gap-16" noValidate>
      <Input
        label="Supplier name" value={form.name}
        onChange={e => set('name', e.target.value)}
        placeholder="e.g. Brookside Dairy" autoFocus
      />
      <Input
        label="Contact person" value={form.contact}
        onChange={e => set('contact', e.target.value)}
        placeholder="e.g. James Kimani"
      />
      <div className="row gap-12" style={{ alignItems: 'stretch' }}>
        <Input
          label="Phone number" value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="0722 100 200"
        />
        <Input
          label="Email" type="email" value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="sales@supplier.co.ke"
        />
      </div>
      <div className="field">
        <label className="field-label">Status</label>
        <div className="field-control">
          <select
            className="field-input"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-bg)', color: '#b91c1c',
          border: '1px solid #fecaca', borderRadius: 10,
          padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}

      <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save changes' : 'Create supplier'}</Button>
      </div>
    </form>
  );
}