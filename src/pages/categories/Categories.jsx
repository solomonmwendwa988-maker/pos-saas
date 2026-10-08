import { useEffect, useState } from 'react';
import { Edit2, Plus, Tag, Trash2 } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { categoryService } from '@/services/categoryService';
import { productService } from '@/services/productService';
import { useToast } from '@/context/ToastContext';

export default function Categories() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [cats, products] = await Promise.all([
      categoryService.list(),
      productService.list(),
    ]);
    setItems(cats);
    const map = {};
    products.forEach(p => { map[p.category] = (map[p.category] || 0) + 1; });
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setName(''); setError(''); setOpen(true); };
  const openEdit = c => { setEditing(c); setName(c.name); setError(''); setOpen(true); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Category name is required.');
    if (items.some(c => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing?.id))
      return setError('Category with that name already exists.');

    if (editing) {
      await categoryService.update(editing.id, { name: trimmed });
      toast.success('Category updated.');
    } else {
      await categoryService.create({ name: trimmed });
      toast.success('Category created.');
    }
    setOpen(false);
    await load();
  };

  const remove = async () => {
    if (confirm) {
      await categoryService.remove(confirm.id);
      toast.success('Category deleted.');
    }
    setConfirm(null);
    await load();
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub muted">
            {items.length === 0
              ? 'Group your products for faster search and reporting'
              : `${items.length} categories`}
          </p>
        </div>
        <Button leftIcon={<Plus size={14} />} onClick={openNew}>Add category</Button>
      </header>

      {loading ? (
        <div className="cat-grid">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg">
          <div className="empty-cta">
            <span className="empty-cta-icon"><Tag size={28} /></span>
            <h3>No categories yet</h3>
            <p className="muted">
              Categories help you group products, filter the POS, and see which
              parts of your shop are performing.
            </p>
            <Button leftIcon={<Plus size={14} />} onClick={openNew}>Create your first category</Button>
          </div>
        </Card>
      ) : (
        <div className="cat-grid">
          {items.map(c => (
            <div key={c.id} className="cat-card">
              <span className="cat-icon"><Tag size={18} /></span>
              <div className="cat-body">
                <div className="cat-name">{c.name}</div>
                <div className="cat-count mono">{counts[c.name] || 0} products</div>
              </div>
              <div className="row gap-4">
                <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Edit">
                  <Edit2 size={15} />
                </button>
                <button className="icon-btn danger" onClick={() => setConfirm(c)} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit category' : 'Add category'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save changes' : 'Create'}</Button>
          </>
        }
      >
        <Input
          label="Category name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Beverages"
          autoFocus
        />
        {error && (
          <div style={{
            background: 'var(--danger-bg)', color: '#b91c1c',
            border: '1px solid #fecaca', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, marginTop: 12,
          }}>{error}</div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="Delete category"
        message={confirm ? `Delete "${confirm.name}"? Products will become uncategorised.` : ''}
        confirmLabel="Delete"
      />

      <style>{`
        .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 900px) { .cat-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .cat-grid { grid-template-columns: 1fr; } }
        .cat-card {
          background: #fff; border: 1px solid var(--border); border-radius: var(--r-lg);
          padding: 18px; display: flex; align-items: center; gap: 14px;
          transition: transform var(--dur), box-shadow var(--dur);
        }
        .cat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .cat-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cat-body { flex: 1; min-width: 0; }
        .cat-name { font-weight: 700; font-size: 14px; }
        .cat-count { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .icon-btn:hover { background: var(--bg-soft); color: var(--text); border-color: var(--border-strong); }
        .icon-btn.danger:hover { color: var(--danger); border-color: #fecaca; background: var(--danger-bg); }
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
        .empty-cta p { max-width: 380px; font-size: 13.5px; line-height: 1.6; margin: 0 0 12px; }
      `}</style>
    </div>
  );
}