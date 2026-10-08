import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import BarcodeScannerModal from '@/components/common/BarcodeScannerModal';

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

export default function ProductForm({
  initial,
  categories = [],
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial }
      : {
          ...blank,
          category: categories[0]?.name || 'Uncategorised',
        }
  );
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = e => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.sku.trim()) return setError('SKU is required.');
    if (!form.price || Number(form.price) <= 0)
      return setError('Selling price must be greater than zero.');
    if (Number(form.buyingPrice) > Number(form.price))
      return setError('Buying price cannot be greater than selling price.');
    setError('');
    onSubmit(form);
  };

  const handleScanned = code => {
    set('barcode', String(code).replace(/\D/g, ''));
  };

  return (
    <form onSubmit={submit} className="stack gap-16" noValidate>
      <div className="grid-2">
        <Input
          label="Product name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Milk 500ml"
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={e => set('sku', e.target.value.toUpperCase())}
          placeholder="MLK-500"
          hint="Short code you'll use to find this product. Can be anything — e.g. MILK1"
        />
      </div>

      <div className="grid-2">
        <div className="pf-barcode-row">
          <Input
            label="Barcode (optional)"
            value={form.barcode}
            onChange={e => set('barcode', e.target.value.replace(/\D/g, ''))}
            placeholder="Leave empty if not applicable"
            inputMode="numeric"
            hint="Only needed if you scan barcodes"
          />
          <button
            type="button"
            className="pf-scan-btn"
            onClick={() => setScanning(true)}
            title="Scan barcode with camera"
            aria-label="Scan barcode with camera"
          >
            <ScanLine size={18} />
          </button>
        </div>

        <div className="field">
          <label className="field-label">Category</label>
          <div className="field-control">
            <select
              className="field-input"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {categories.length === 0 && <option>Uncategorised</option>}
              {categories.map(c => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="pf-help">
        <strong>Don't have barcodes?</strong> That's fine. Leave the field empty
        and use the search box at the POS — you can find any product by name or
        SKU. Barcodes only matter if you have a scanner or use our phone camera
        scanner.
      </div>

      <div className="grid-2">
        <Input
          label="Buying price (KSh)"
          type="number"
          min="0"
          value={form.buyingPrice}
          onChange={e => set('buyingPrice', e.target.value)}
          placeholder="0"
          hint="What you pay the supplier"
        />
        <Input
          label="Retail price (KSh)"
          type="number"
          min="0"
          value={form.price}
          onChange={e => set('price', e.target.value)}
          placeholder="0"
          hint="What your customer pays"
        />
      </div>

      <div className="grid-2">
        <Input
          label="Current stock"
          type="number"
          min="0"
          value={form.stock}
          onChange={e => set('stock', e.target.value)}
          placeholder="0"
        />
        <Input
          label="Low stock threshold"
          type="number"
          min="0"
          value={form.threshold}
          onChange={e => set('threshold', e.target.value)}
          placeholder="10"
          hint="You'll get an alert when stock hits this number"
        />
      </div>

      <div className="grid-2">
        <Input
          label="Supplier (optional)"
          value={form.supplier}
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

      {error && <div className="form-error">{error}</div>}

      <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="outline" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button type="submit">{initial ? 'Save changes' : 'Create product'}</Button>
      </div>

      <BarcodeScannerModal
        open={scanning}
        onClose={() => setScanning(false)}
        onScan={handleScanned}
        title="Scan product barcode"
        subtitle="Point the camera at the barcode on the package"
        manualLabel="Type the barcode instead"
      />

      <style>{`
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
        .form-error {
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
        }

        .pf-barcode-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .pf-barcode-row > .field { flex: 1; min-width: 0; }
        .pf-scan-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--primary);
          color: #fff;
          border: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 160ms ease, transform 160ms ease;
          box-shadow: 0 6px 18px rgba(109, 94, 252, 0.28);
        }
        .pf-scan-btn:hover { background: var(--primary-600); }
        .pf-scan-btn:active { transform: scale(0.96); }

        .pf-help {
          padding: 12px 14px;
          background: var(--bg-soft);
          border-radius: 10px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .pf-help strong { color: var(--text); }
      `}</style>
    </form>
  );
}