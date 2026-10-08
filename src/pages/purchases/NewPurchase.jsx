import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, Plus, Search, Trash2,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { supplierService } from '@/services/supplierService';
import { productService } from '@/services/productService';
import { purchaseService } from '@/services/purchaseService';
import { formatKSh } from '@/utils/format';
import { useToast } from '@/context/ToastContext';
import './NewPurchase.css';

export default function NewPurchase() {
  const toast = useToast();
  const nav = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [supplierId, setSupplierId] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Product picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, p] = await Promise.all([
        supplierService.list(),
        productService.list(),
      ]);
      setSuppliers(s);
      setProducts(p);
      setLoading(false);
    })();
  }, []);

  const filteredPickerProducts = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    return products
      .filter(p => !lines.some(l => l.productId === p.id))
      .filter(p => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [products, pickerSearch, lines]);

  const addLine = product => {
    setLines(prev => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        qty: 1,
        buyingPrice: product.buyingPrice || 0,
      },
    ]);
    setPickerOpen(false);
    setPickerSearch('');
  };

  const updateLine = (idx, patch) =>
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const removeLine = idx =>
    setLines(prev => prev.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.buyingPrice, 0);

  const submit = async () => {
    setError('');

    if (!supplierId) {
      setError('Select a supplier for this purchase order.');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one line item.');
      return;
    }
    if (lines.some(l => !l.qty || l.qty <= 0)) {
      setError('Every line must have a quantity greater than zero.');
      return;
    }
    if (lines.some(l => !l.buyingPrice || l.buyingPrice <= 0)) {
      setError('Every line must have a buying price greater than zero.');
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) {
      setError('Supplier not found.');
      return;
    }

    setSaving(true);
    try {
      const po = await purchaseService.create({
        supplierId,
        supplierName: supplier.name,
        items: lines,
        notes,
        expectedAt: expectedAt || null,
      });
      toast.success(`Purchase order ${po.number} created.`);
      nav(`/purchases/${po.id}`);
    } catch (err) {
      setError(err.message || 'Could not create purchase order.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 220 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  const noSuppliers = suppliers.length === 0;
  const noProducts = products.length === 0;

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <Link to="/purchases" className="back-link">
            <ArrowLeft size={14} /> Back to purchases
          </Link>
          <h1 className="page-title">New purchase order</h1>
          <p className="page-sub muted">
            Record what you're buying from a supplier. Stock is added when you receive the order.
          </p>
        </div>
      </header>

      {noSuppliers && (
        <div className="np-warn">
          You don't have any suppliers yet.{' '}
          <Link to="/suppliers">Add a supplier</Link> first.
        </div>
      )}

      {noProducts && (
        <div className="np-warn">
          You don't have any products yet.{' '}
          <Link to="/products">Add products</Link> first.
        </div>
      )}

      <Card padding="lg" title="Purchase details">
        <div className="np-details">
          <div className="np-field">
            <label className="np-label">Supplier</label>
            <select
              className="np-select"
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
            >
              <option value="">Select a supplier…</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="np-field">
            <label className="np-label">Expected delivery (optional)</label>
            <input
              type="date"
              className="np-select"
              value={expectedAt}
              onChange={e => setExpectedAt(e.target.value)}
            />
          </div>
        </div>

        <div className="np-field np-field-full">
          <label className="np-label">Notes (optional)</label>
          <div className="np-textarea-wrap">
            <textarea
              rows={2}
              className="np-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions or delivery notes"
            />
          </div>
        </div>
      </Card>

      <Card
        padding="lg"
        title="Line items"
        subtitle={`${lines.length} item${lines.length === 1 ? '' : 's'} · ${formatKSh(subtotal)}`}
        action={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Plus size={13} />}
            onClick={() => setPickerOpen(true)}
            disabled={noProducts}
          >
            Add item
          </Button>
        }
      >
        {lines.length === 0 ? (
          <div className="np-empty">
            <p className="muted">
              No line items yet. Click "Add item" to choose products from your catalogue.
            </p>
          </div>
        ) : (
          <div className="np-lines">
            <div className="np-lines-head">
              <span>Product</span>
              <span>Qty</span>
              <span>Buying price</span>
              <span style={{ textAlign: 'right' }}>Line total</span>
              <span />
            </div>
            {lines.map((line, idx) => (
              <div key={line.productId} className="np-line">
                <div className="np-line-prod">
                  <div className="np-line-name">{line.name}</div>
                  <div className="np-line-sku mono">{line.sku}</div>
                </div>
                <input
                  type="number"
                  min="1"
                  className="np-line-input mono"
                  value={line.qty}
                  onChange={e => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  min="0"
                  className="np-line-input mono"
                  value={line.buyingPrice}
                  onChange={e =>
                    updateLine(idx, { buyingPrice: Number(e.target.value) || 0 })
                  }
                />
                <div className="np-line-total mono">
                  {formatKSh(line.qty * line.buyingPrice)}
                </div>
                <button
                  className="np-line-remove"
                  onClick={() => removeLine(idx)}
                  aria-label="Remove line"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <div className="np-lines-foot">
              <div className="np-subtotal">
                <span className="muted">Subtotal</span>
                <span className="mono bold">{formatKSh(subtotal)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {error && <div className="np-error">{error}</div>}

      <div className="np-actions">
        <Link to="/purchases">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          onClick={submit}
          loading={saving}
          disabled={noSuppliers || noProducts || lines.length === 0}
        >
          Create purchase order
        </Button>
      </div>

      {/* Product picker modal */}
      {pickerOpen && (
        <div className="np-picker-scrim fade-in" onClick={() => setPickerOpen(false)}>
          <div className="np-picker" onClick={e => e.stopPropagation()}>
            <div className="np-picker-head">
              <div className="np-picker-title">Add products</div>
              <Input
                placeholder="Search products by name or SKU"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                leftIcon={<Search size={14} />}
                autoFocus
              />
            </div>
            <div className="np-picker-body">
              {filteredPickerProducts.length === 0 ? (
                <div className="np-picker-empty muted">
                  No products match your search.
                </div>
              ) : (
                filteredPickerProducts.map(p => (
                  <button
                    key={p.id}
                    className="np-picker-item"
                    onClick={() => addLine(p)}
                  >
                    <div className="np-picker-item-main">
                      <div className="np-picker-name">{p.name}</div>
                      <div className="np-picker-sub mono">
                        {p.sku} · {p.stock} in stock · Buy {formatKSh(p.buyingPrice)}
                      </div>
                    </div>
                    <Plus size={14} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}