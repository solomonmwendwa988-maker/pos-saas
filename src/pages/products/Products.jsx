import { useEffect, useMemo, useState } from 'react';
import {
  Edit2, Filter, Package, Plus, QrCode, Search, Trash2,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LimitGate from '../subscription/LimitGate';
import LabelSheetModal from '@/components/products/LabelSheetModal';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { pdfService } from '@/services/pdfService';
import { barcodeService } from '@/services/barcodeService';
import { formatKSh } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useBusiness } from '@/context/BusinessContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useToast } from '@/context/ToastContext';
import ProductForm from './ProductForm';
import './Products.css';

const stockTone = p =>
  p.stock === 0 ? 'danger' : p.stock <= p.threshold ? 'warning' : 'success';

const stockLabel = p =>
  p.stock === 0 ? 'Out of stock' : p.stock <= p.threshold ? 'Low stock' : 'In stock';

export default function Products() {
  const toast = useToast();
  const { business } = useBusiness();
  const { usage, limits } = useSubscription();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Bulk selection
  const [selected, setSelected] = useState(new Set());
  const [labelsFor, setLabelsFor] = useState(null); // array of products

  // Single-product labels
  const [singleLabelsFor, setSingleLabelsFor] = useState(null);
  const [copies, setCopies] = useState('1');
  const [printing, setPrinting] = useState(false);

  const perPage = 8;
  const debouncedSearch = useDebounce(search, 250);

  const load = async () => {
    setLoading(true);
    const [products, cats] = await Promise.all([
      productService.list(),
      categoryService.list(),
    ]);
    setItems(products);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return items.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (status === 'low' && !(p.stock > 0 && p.stock <= p.threshold)) return false;
      if (status === 'out' && p.stock !== 0) return false;
      if (status === 'in' && p.stock <= p.threshold) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
      );
    });
  }, [items, debouncedSearch, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const productLimit = limits?.products;
  const productUsage = usage?.products ?? items.length;
  const unlimited = productLimit === -1 || productLimit === undefined;
  const usagePct = unlimited
    ? 0
    : Math.min(100, Math.round((productUsage / productLimit) * 100));
  const nearLimit = !unlimited && usagePct >= 80 && productUsage < productLimit;

  const toggleSelect = id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPagedSelected =
    paged.length > 0 && paged.every(p => selected.has(p.id));

  const toggleAllPaged = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPagedSelected) {
        paged.forEach(p => next.delete(p.id));
      } else {
        paged.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const columns = [
    {
      key: 'select',
      label: '',
      width: 40,
      render: p => (
        <input
          type="checkbox"
          checked={selected.has(p.id)}
          onChange={() => toggleSelect(p.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select ${p.name}`}
          style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
        />
      ),
    },
    {
      key: 'name',
      label: 'Product',
      render: p => (
        <div className="prod-cell">
          <span className="prod-thumb">{p.name[0]}</span>
          <div>
            <div className="prod-name">{p.name}</div>
            <div className="prod-sku mono">{p.sku}</div>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category' },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      render: p => (
        <div>
          <div className="mono bold">{formatKSh(p.price)}</div>
          <div className="mono faint" style={{ fontSize: 11 }}>
            Buy {formatKSh(p.buyingPrice)}
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      align: 'center',
      render: p => (
        <div className="stack center gap-4">
          <span className="mono bold">{p.stock}</span>
          <Badge tone={stockTone(p)}>{stockLabel(p)}</Badge>
        </div>
      ),
    },
    { key: 'supplier', label: 'Supplier', render: p => p.supplier || '—' },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: p => (
        <div className="row gap-4" style={{ justifyContent: 'flex-end' }}>
          <button
            className="icon-btn"
            onClick={e => {
              e.stopPropagation();
              setSingleLabelsFor(p);
              setCopies('1');
            }}
            aria-label="Print labels"
            title="Print barcode labels"
          >
            <QrCode size={15} />
          </button>
          <button
            className="icon-btn"
            onClick={e => {
              e.stopPropagation();
              setEditing(p);
              setOpenForm(true);
            }}
            aria-label="Edit"
          >
            <Edit2 size={15} />
          </button>
          <button
            className="icon-btn danger"
            onClick={e => {
              e.stopPropagation();
              setConfirm(p);
            }}
            aria-label="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const saveProduct = async data => {
    if (editing) {
      await productService.update(editing.id, data);
      toast.success('Product updated.');
    } else {
      await productService.create(data);
      toast.success('Product created.');
    }
    setOpenForm(false);
    setEditing(null);
    await load();
  };

  const deleteProduct = async () => {
    if (confirm) {
      await productService.remove(confirm.id);
      toast.success('Product deleted.');
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(confirm.id);
        return next;
      });
    }
    setConfirm(null);
    await load();
  };

  const printSingleLabels = async () => {
    if (!singleLabelsFor) return;
    setPrinting(true);
    try {
      const copiesCount = Math.max(1, Number(copies) || 1);
      const expanded = [];
      for (let i = 0; i < copiesCount; i++) expanded.push(singleLabelsFor);
      const blob = await barcodeService.generateLabelSheet({
        business,
        products: expanded,
      });
      pdfService.downloadBlob(blob, `labels-${singleLabelsFor.sku || 'product'}.pdf`);
      toast.success('Labels PDF downloaded.');
      setSingleLabelsFor(null);
    } catch (err) {
      toast.error(err.message || 'Could not generate labels.');
    } finally {
      setPrinting(false);
    }
  };

  const singleLabelPages = Math.max(
    1,
    Math.ceil((Number(copies) || 1) / 24)
  );

  const bulkPrintLabels = () => {
    const list = items.filter(p => selected.has(p.id));
    if (list.length === 0) {
      toast.warning('Select at least one product.');
      return;
    }
    setLabelsFor(list);
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub muted">
            {items.length === 0
              ? 'Add your first product to start selling'
              : `${items.length} product${
                  items.length === 1 ? '' : 's'
                } in your catalogue`}
          </p>
        </div>

        <LimitGate
          limitKey="products"
          used={productUsage}
          limit={productLimit}
          message={`Your plan allows up to ${productLimit} products. Upgrade to add more.`}
        >
          <Button
            leftIcon={<Plus size={14} />}
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            Add product
          </Button>
        </LimitGate>
      </header>

      {nearLimit && (
        <div className="prod-limit-warn">
          <div className="prod-limit-warn-body">
            <strong>
              {productUsage} of {productLimit}
            </strong>{' '}
            products used. You are approaching your plan limit.
          </div>
          <a href="/subscription" className="prod-limit-warn-cta">
            Upgrade plan
          </a>
        </div>
      )}

      {items.length === 0 && !loading ? (
        <Card padding="lg">
          <div className="empty-cta">
            <span className="empty-cta-icon">
              <Package size={28} />
            </span>
            <h3>No products yet</h3>
            <p className="muted">
              Add your products one by one, or import them from a CSV. Once you
              have products in your catalogue, the POS becomes live.
            </p>
            <LimitGate
              limitKey="products"
              used={productUsage}
              limit={productLimit}
              message={`Your plan allows up to ${productLimit} products. Upgrade to add more.`}
            >
              <Button
                leftIcon={<Plus size={14} />}
                onClick={() => {
                  setEditing(null);
                  setOpenForm(true);
                }}
              >
                Add your first product
              </Button>
            </LimitGate>
          </div>
        </Card>
      ) : (
        <Card padding="md">
          <div className="prod-toolbar">
            <div style={{ flex: 1, minWidth: 240 }}>
              <Input
                placeholder="Search by name, SKU or barcode"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search size={15} />}
              />
            </div>
            <div className="prod-filters">
              <select
                className="select"
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={status}
                onChange={e => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="in">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
              <button
                type="button"
                className="select-all-btn"
                onClick={toggleAllPaged}
              >
                {allPagedSelected ? 'Deselect page' : 'Select page'}
              </button>
              <button className="icon-btn" aria-label="Filters">
                <Filter size={15} />
              </button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="bulk-bar">
              <div className="bulk-bar-info">
                <strong>{selected.size}</strong> selected
              </div>
              <div className="bulk-bar-actions">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={bulkPrintLabels}
                  leftIcon={<QrCode size={13} />}
                >
                  Print labels
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Table
              columns={columns}
              rows={paged}
              empty={loading ? 'Loading products…' : 'No products match your filters.'}
            />
          </div>

          {totalPages > 1 && (
            <div className="pager">
              <span className="muted" style={{ fontSize: 13 }}>
                {filtered.length} products · Page {page} of {totalPages}
              </span>
              <div className="row gap-8">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
        title={editing ? 'Edit product' : 'Add new product'}
        subtitle={
          editing
            ? `Editing ${editing.name}`
            : 'Fill in the details to add a new product'
        }
        size="lg"
      >
        <ProductForm
          initial={editing}
          categories={categories}
          onSubmit={saveProduct}
          onCancel={() => {
            setOpenForm(false);
            setEditing(null);
          }}
        />
      </Modal>

      {/* Single-product labels modal */}
      <Modal
        open={!!singleLabelsFor}
        onClose={() => setSingleLabelsFor(null)}
        title="Print barcode labels"
        subtitle={singleLabelsFor ? singleLabelsFor.name : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSingleLabelsFor(null)}>
              Cancel
            </Button>
            <Button onClick={printSingleLabels} loading={printing}>
              Download labels PDF
            </Button>
          </>
        }
      >
        {singleLabelsFor && (
          <div className="stack gap-16">
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              Generates an A4 sheet of barcode labels. Each label includes the
              business name, product name, retail price and the barcode.
            </p>
            <Input
              label="Copies"
              type="number"
              min="1"
              value={copies}
              onChange={e => setCopies(e.target.value)}
              autoFocus
            />
            <div className="muted" style={{ fontSize: 12.5 }}>
              {singleLabelPages} page{singleLabelPages === 1 ? '' : 's'} · 24 labels
              per page
            </div>
            {!singleLabelsFor.barcode && (
              <div className="prod-labels-warn">
                This product doesn't have a barcode. The label will use the SKU
                instead.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Bulk labels modal */}
      <LabelSheetModal
        open={!!labelsFor}
        products={labelsFor || []}
        onClose={() => {
          setLabelsFor(null);
          clearSelection();
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={deleteProduct}
        title="Delete product"
        message={
          confirm
            ? `Are you sure you want to delete "${confirm.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
      />

      <style>{`
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .icon-btn:hover {
          background: var(--bg-soft);
          color: var(--text);
          border-color: var(--border-strong);
        }
        .icon-btn.danger:hover {
          color: var(--danger);
          border-color: #fecaca;
          background: var(--danger-bg);
        }
        .select {
          border: 1px solid var(--border-strong); border-radius: 10px;
          padding: 9px 12px; font-size: 13px; background: #fff;
          color: var(--text); cursor: pointer; outline: none;
        }
        .select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-50);
        }
        .select-all-btn {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: #fff;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
        }
        .select-all-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .empty-cta {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 40px 24px; gap: 10px;
        }
        .empty-cta-icon {
          width: 64px; height: 64px; border-radius: 20px;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px;
        }
        .empty-cta h3 { font-size: 18px; font-weight: 700; margin: 4px 0 0; }
        .empty-cta p {
          max-width: 380px; font-size: 13.5px;
          line-height: 1.6; margin: 0 0 12px;
        }

        .prod-limit-warn {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; flex-wrap: wrap;
          padding: 12px 16px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--r-md);
          font-size: 13px;
          color: #92400e;
        }
        .prod-limit-warn-body { line-height: 1.5; }
        .prod-limit-warn-cta {
          font-weight: 700; padding: 6px 12px; border-radius: 8px;
          background: #f59e0b; color: #fff; font-size: 12.5px;
          white-space: nowrap;
        }
        .prod-limit-warn-cta:hover { background: #d97706; }

        .prod-labels-warn {
          padding: 10px 12px; border-radius: 10px;
          background: #fffbeb; border: 1px solid #fde68a;
          font-size: 12.5px; color: #92400e; line-height: 1.55;
        }

        .bulk-bar {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px;
          padding: 10px 14px;
          margin-top: 12px;
          background: var(--primary-50);
          border: 1px solid var(--primary-100);
          border-radius: 12px;
          flex-wrap: wrap;
        }
        .bulk-bar-info {
          font-size: 13px;
          color: var(--primary-700);
        }
        .bulk-bar-info strong { font-weight: 800; }
        .bulk-bar-actions { display: flex; gap: 8px; }
      `}</style>
    </div>
  );
}