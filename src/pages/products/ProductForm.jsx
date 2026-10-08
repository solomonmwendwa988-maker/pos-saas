import { useState } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const blank = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  buyingPrice: '',
  price: '',
  stock: '',
  threshold: '',
  supplier: '',
  status: 'active',
};

export default function ProductForm({ initial, categories = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(() => (initial ? { ...initial } : {
    ...blank,
    category: categories[0]?.name || 'Uncategorised',
  }));
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = e => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.sku.trim()) return setError('SKU is required.');
    if (!form.price || Number(form.price) <= 0) return setError('Selling price must be greater than zero.');
    if (Number(form.buyingPrice) > Number(form.price))
      return setError('Buying price cannot be greater than selling price.');
    setError('');
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="stack gap-16" noValidate>
      <div className="grid-2">
        <Input
          label="Product name" value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Milk 500ml"
        />
        <Input
          label="SKU" value={form.sku}
          onChange={e => set('sku', e.target.value.toUpperCase())}
          placeholder="MLK-500"
        />
      </div>

      <div className="grid-2">
        <Input
          label="Barcode" value={form.barcode}
          onChange={e => set('barcode', e.target.value.replace(/\D/g, ''))}
          placeholder="6161100001"
        />
        <div className="field">
          <label className="field-label">Category</label>
          <div className="field-control">
            <select
              className="field-input"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {categories.length === 0 && <option>Uncategorised</option>}
              {categories.map(c => <option key={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <Input
          label="Buying price (KSh)" type="number" min="0"
          value={form.buyingPrice}
          onChange={e => set('buyingPrice', e.target.value)}
          placeholder="0"
        />
        <Input
          label="Retail price (KSh)" type="number" min="0"
          value={form.price}
          onChange={e => set('price', e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="grid-2">
        <Input
          label="Current stock" type="number" min="0"
          value={form.stock}
          onChange={e => set('stock', e.target.value)}
          placeholder="0"
        />
        <Input
          label="Low stock threshold" type="number" min="0"
          value={form.threshold}
          onChange={e => set('threshold', e.target.value)}
          placeholder="10"
        />
      </div>

      <div className="grid-2">
        <Input
          label="Supplier" value={form.supplier}
          onChange={e => set('supplier', e.target.value)}
          placeholder="e.g. Brookside"
        />
        <div className="field">
          <label className="field-label">Status</label>
          <div className="field-control">
            <select
              className="field-input"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="form-error">{error}</div>
      )}

      <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="outline" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit">{initial ? 'Save changes' : 'Create product'}</Button>
      </div>

      <style>{`
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
        .form-error {
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
        }
      `}</style>
    </form>
  );
}