import { useEffect, useMemo, useState } from 'react';
import { Edit2, Filter, Package, Plus, Search, Trash2 } from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LimitGate from '../subscription/LimitGate';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { formatKSh } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { useSubscription } from '@/context/SubscriptionContext';
import ProductForm from './ProductForm';
import './Products.css';

const stockTone = p =>
  p.stock === 0 ? 'danger' : p.stock <= p.threshold ? 'warning' : 'success';

const stockLabel = p =>
  p.stock === 0 ? 'Out of stock' : p.stock <= p.threshold ? 'Low stock' : 'In stock';

export default function Products() {
  const toast = useToast();
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

  useEffect(() => { load(); }, []);

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

  // Plan limits — show a soft warning line if the shop is close to the cap
  const productLimit = limits?.products;
  const productUsage = usage?.products ?? items.length;
  const unlimited = productLimit === -1 || productLimit === undefined;
  const usagePct = unlimited ? 0 : Math.min(100, Math.round((productUsage / productLimit) * 100));
  const nearLimit = !unlimited && usagePct >= 80 && productUsage < productLimit;
  const atLimit = !unlimited && productUsage >= productLimit;

  const columns = [
    { key: 'name', label: 'Product', render: p => (
      <div className="prod-cell">
        <span className="prod-thumb">{p.name[0]}</span>
        <div>
          <div className="prod-name">{p.name}</div>
          <div className="prod-sku mono">{p.sku}</div>
        </div>
      </div>
    )},
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', align: 'right', render: p => (
      <div>
        <div className="mono bold">{formatKSh(p.price)}</div>
        <div className="mono faint" style={{ fontSize: 11 }}>
          Buy {formatKSh(p.buyingPrice)}
        </div>
      </div>
    )},
    { key: 'stock', label: 'Stock', align: 'center', render: p => (
      <div className="stack center gap-4">
        <span className="mono bold">{p.stock}</span>
        <Badge tone={stockTone(p)}>{stockLabel(p)}</Badge>
      </div>
    )},
    { key: 'supplier', label: 'Supplier', render: p => p.supplier || '—' },
    { key: 'actions', label: '', align: 'right', render: p => (
      <div className="row gap-4" style={{ justifyContent: 'flex-end' }}>
        <button
          className="icon-btn"
          onClick={() => { setEditing(p); setOpenForm(true); }}
          aria-label="Edit"
        >
          <Edit2 size={15} />
        </button>
        <button
          className="icon-btn danger"
          onClick={() => setConfirm(p)}
          aria-label="Delete"
        >
          <Trash2 size={15} />
        </button>
      </div>
    )},
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
    }
    setConfirm(null);
    await load();
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub muted">
            {items.length === 0
              ? 'Add your first product to start selling'
              : `${items.length} product${items.length === 1 ? '' : 's'} in your catalogue`}
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
            onClick={() => { setEditing(null); setOpenForm(true); }}
          >
            Add product
          </Button>
        </LimitGate>
      </header>

      {/* Soft warning when approaching the plan limit but not there yet */}
      {nearLimit && (
        <div className="prod-limit-warn">
          <div className="prod-limit-warn-body">
            <strong>{productUsage} of {productLimit}</strong> products used.
            You are approaching your plan limit.
          </div>
          <a href="/subscription" className="prod-limit-warn-cta">
            Upgrade plan
          </a>
        </div>
      )}

      {items.length === 0 && !loading ? (
        <Card padding="lg">
          <div className="empty-cta">
            <span className="empty-cta-icon"><Package size={28} /></span>
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
                onClick={() => { setEditing(null); setOpenForm(true); }}
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
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                leftIcon={<Search size={15} />}
              />
            </div>
            <div className="prod-filters">
              <select
                className="select"
                value={category}
                onChange={e => { setCategory(e.target.value); setPage(1); }}
              >
                <option value="all">All categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                className="select"
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="all">All statuses</option>
                <option value="in">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
              <button className="icon-btn" aria-label="Filters">
                <Filter size={15} />
              </button>
            </div>
          </div>

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

      <Modal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditing(null); }}
        title={editing ? 'Edit product' : 'Add new product'}
        subtitle={editing ? `Editing ${editing.name}` : 'Fill in the details to add a new product'}
        size="lg"
      >
        <ProductForm
          initial={editing}
          categories={categories}
          onSubmit={saveProduct}
          onCancel={() => { setOpenForm(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={deleteProduct}
        title="Delete product"
        message={confirm ? `Are you sure you want to delete "${confirm.name}"? This cannot be undone.` : ''}
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
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          background: #f59e0b;
          color: #fff;
          font-size: 12.5px;
          white-space: nowrap;
        }
        .prod-limit-warn-cta:hover { background: #d97706; }
      `}</style>
    </div>
  );
}