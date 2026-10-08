import { useState } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const KENYAN_PHONE = /^(?:\+254|0)(7\d{8}|1\d{8})$/;

export default function CustomerForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = e => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Customer name is required.');
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
        label="Full name" value={form.name}
        onChange={e => set('name', e.target.value)}
        placeholder="e.g. Peter Otieno" autoFocus
      />
      <Input
        label="Phone number" value={form.phone}
        onChange={e => set('phone', e.target.value)}
        placeholder="0722 111 222"
        hint="Kenyan mobile number"
      />
      <Input
        label="Email (optional)" type="email" value={form.email}
        onChange={e => set('email', e.target.value)}
        placeholder="customer@example.com"
      />

      {error && (
        <div style={{
          background: 'var(--danger-bg)', color: '#b91c1c',
          border: '1px solid #fecaca', borderRadius: 10,
          padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}

      <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save changes' : 'Create customer'}</Button>
      </div>
    </form>
  );
}