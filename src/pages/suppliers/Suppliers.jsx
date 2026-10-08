import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Mail, Phone, Plus, Search, Truck } from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SupplierForm from './SupplierForm';
import { supplierService } from '@/services/supplierService';
import { purchaseService } from '@/services/purchaseService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { formatKSh } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import './Suppliers.css';
import './SupplierDetail.css';

export default function Suppliers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  const load = async () => {
    setLoading(true);
    const list = await supplierService.list(debouncedSearch);
    const balances = purchaseService.allSupplierBalances();
    const enriched = list.map(s => ({
      ...s,
      balance: balances[s.id] || 0,
    }));
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // React to PO + payment events so balances update in real time
  useEffect(() => {
    const off1 = eventBus.on(EVENTS.PO_CREATED, load);
    const off2 = eventBus.on(EVENTS.PO_UPDATED, load);
    const off3 = eventBus.on(EVENTS.SUPPLIER_PAYMENT, load);
    return () => {
      off1();
      off2();
      off3();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async data => {
    if (editing) {
      await supplierService.update(editing.id, data);
      toast.success('Supplier updated.');
    } else {
      const created = await supplierService.create(data);
      toast.success('Supplier created.');
      if (created?.id) {
        // nothing extra; load() below will enrich it
      }
    }
    setOpenForm(false);
    setEditing(null);
    await load();
  };

  const remove = async () => {
    if (confirm) {
      await supplierService.remove(confirm.id);
      toast.success('Supplier removed.');
    }
    setConfirm(null);
    await load();
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-sub muted">
            Manage vendors, balances and supplied products
          </p>
        </div>
        <Button
          leftIcon={<Plus size={14} />}
          onClick={() => { setEditing(null); setOpenForm(true); }}
        >
          Add supplier
        </Button>
      </header>

      <Card padding="md">
        <div style={{ marginBottom: 14 }}>
          <Input
            placeholder="Search suppliers by name, contact or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={15} />}
          />
        </div>

        {loading ? (
          <div className="supplier-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 160 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <Truck size={32} />
            <p>No suppliers found</p>
            <span className="muted">
              Add a supplier to start tracking purchases and balances
            </span>
          </div>
        ) : (
          <div className="supplier-grid">
            {rows.map(s => (
              <div key={s.id} className="supplier-card">
                <div className="supplier-top">
                  <span className="supplier-icon"><Truck size={18} /></span>
                  <Badge tone={s.status === 'active' ? 'success' : 'neutral'}>
                    {s.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <Link to={`/suppliers/${s.id}`} className="supplier-name-link">
                  <div className="supplier-name">{s.name}</div>
                </Link>
                <div className="supplier-contact">{s.contact}</div>

                <div className="supplier-lines">
                  <div className="supplier-line">
                    <Phone size={13} />
                    <span className="mono">{s.phone}</span>
                  </div>
                  {s.email && (
                    <div className="supplier-line">
                      <Mail size={13} />
                      <span>{s.email}</span>
                    </div>
                  )}
                </div>

                <div className="supplier-stats">
                  <div>
                    <div className="muted" style={{ fontSize: 11 }}>Products</div>
                    <div className="mono bold">{s.products || 0}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="muted" style={{ fontSize: 11 }}>Balance</div>
                    <div
                      className="mono bold"
                      style={{
                        color: s.balance > 0 ? 'var(--danger)' : 'var(--text)',
                      }}
                    >
                      {formatKSh(s.balance || 0)}
                    </div>
                  </div>
                </div>

                <div className="supplier-actions">
                  <Link to={`/suppliers/${s.id}`} className="supplier-action-link">
                    View
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Edit2 size={13} />}
                    onClick={() => { setEditing(s); setOpenForm(true); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirm(s)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditing(null); }}
        title={editing ? 'Edit supplier' : 'Add supplier'}
        subtitle={editing ? `Editing ${editing.name}` : 'Create a new vendor record'}
        size="md"
      >
        <SupplierForm
          initial={editing}
          onSubmit={save}
          onCancel={() => { setOpenForm(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="Remove supplier"
        message={
          confirm
            ? `Remove "${confirm.name}"? This does not affect historical orders.`
            : ''
        }
        confirmLabel="Remove"
      />
    </div>
  );
}