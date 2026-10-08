import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Boxes, History, PackageX, Search, TrendingDown, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import StatCard from '../dashboard/StatCard';
import { productService } from '@/services/productService';
import { stockMovementService } from '@/services/stockMovementService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { formatKSh } from '@/utils/format';
import { formatLongDateTime } from '@/utils/billing';
import { useToast } from '@/context/ToastContext';

const stockStatus = p =>
  p.stock === 0
    ? { tone: 'danger', label: 'Out of stock' }
    : p.stock <= p.threshold
    ? { tone: 'warning', label: 'Low stock' }
    : { tone: 'success', label: 'In stock' };

const MOVEMENT_LABEL = {
  sale: 'Sale',
  purchase: 'Purchase',
  adjustment: 'Adjustment',
  return: 'Return',
  writeoff: 'Write-off',
};

export default function Inventory() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restocking, setRestocking] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  // History modal state
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setItems(await productService.list());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // React to stock + product changes so this page always reflects reality
  useEffect(() => {
    const off1 = eventBus.on(EVENTS.PRODUCTS_CHANGED, load);
    const off2 = eventBus.on(EVENTS.STOCK_CHANGED, load);
    return () => {
      off1();
      off2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const inventoryValue = items.reduce(
      (s, p) => s + p.buyingPrice * p.stock,
      0
    );
    const low = items.filter(p => p.stock > 0 && p.stock <= p.threshold).length;
    const out = items.filter(p => p.stock === 0).length;
    return { inventoryValue, low, out, total: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(
      p =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [items, search]);

  const openRestock = p => {
    setRestocking(p);
    setRestockQty('');
  };

  const confirmRestock = async () => {
    const qty = Number(restockQty);
    if (!qty || qty <= 0) return;
    const product = items.find(p => p.id === restocking.id);
    if (!product) return;

    // Use adjustStock so the movement is logged
    await productService.adjustStock([{ id: product.id, qty }], +1, {
      type: 'adjustment',
      reference: 'Manual restock',
    });

    toast.success(`${product.name} restocked by ${qty}.`);
    setRestocking(null);
    await load();
  };

  const openHistory = async p => {
    setHistoryFor(p);
    setHistoryLoading(true);
    const list = await stockMovementService.listByProduct(p.id);
    setHistory(list);
    setHistoryLoading(false);
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: p => (
        <div>
          <div className="bold">{p.name}</div>
          <div className="mono faint" style={{ fontSize: 11 }}>{p.sku}</div>
        </div>
      ),
    },
    { key: 'category', label: 'Category' },
    {
      key: 'buying',
      label: 'Buying',
      align: 'right',
      render: p => <span className="mono">{formatKSh(p.buyingPrice)}</span>,
    },
    {
      key: 'retail',
      label: 'Retail',
      align: 'right',
      render: p => <span className="mono bold">{formatKSh(p.price)}</span>,
    },
    {
      key: 'stock',
      label: 'Stock',
      align: 'center',
      render: p => (
        <div className="stack center gap-4">
          <span className="mono bold">{p.stock}</span>
          <Badge tone={stockStatus(p).tone}>{stockStatus(p).label}</Badge>
        </div>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      align: 'right',
      render: p => (
        <span className="mono">{formatKSh(p.buyingPrice * p.stock)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: p => (
        <div className="row gap-4" style={{ justifyContent: 'flex-end' }}>
          <button
            className="icon-btn"
            onClick={() => openHistory(p)}
            aria-label="History"
            title="Stock history"
          >
            <History size={14} />
          </button>
          <Button size="sm" variant="outline" onClick={() => openRestock(p)}>
            Restock
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="stack gap-16">
        <div className="skeleton" style={{ height: 32, width: 200 }} />
        <div className="inv-kpis">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 110 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="stack gap-24">
        <header className="page-head">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-sub muted">No products to track yet</p>
          </div>
        </header>

        <Card padding="lg">
          <div className="empty-cta">
            <span className="empty-cta-icon"><Boxes size={28} /></span>
            <h3>Inventory starts with products</h3>
            <p className="muted">
              Add products to your catalogue and this page will show stock levels,
              inventory value and restocking needs automatically.
            </p>
            <a href="/products"><Button>Go to Products</Button></a>
          </div>
        </Card>

        <style>{`
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

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-sub muted">
            Track stock levels, value and restocking needs
          </p>
        </div>
      </header>

      <section className="inv-kpis">
        <StatCard
          label="Total products"
          value={totals.total}
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label="Inventory value"
          value={formatKSh(totals.inventoryValue)}
          icon={Wallet}
          tone="success"
          sub="at buying price"
        />
        <StatCard
          label="Low stock items"
          value={totals.low}
          icon={TrendingDown}
          tone="warning"
          sub="below threshold"
        />
        <StatCard
          label="Out of stock"
          value={totals.out}
          icon={PackageX}
          tone="danger"
          sub="need restocking"
        />
      </section>

      {(totals.low > 0 || totals.out > 0) && (
        <div className="inv-alert">
          <AlertTriangle size={18} />
          <div>
            <div className="inv-alert-title">Stock attention required</div>
            <div className="inv-alert-sub">
              {totals.low} low-stock items and {totals.out} out-of-stock items
              need restocking.
            </div>
          </div>
        </div>
      )}

      <Card padding="md">
        <div style={{ marginBottom: 14 }}>
          <Input
            placeholder="Search inventory"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={15} />}
          />
        </div>
        <Table
          columns={columns}
          rows={filtered}
          empty="No inventory items found."
        />
      </Card>

      {/* ---------- Restock modal ---------- */}
      <Modal
        open={!!restocking}
        onClose={() => setRestocking(null)}
        title="Restock product"
        subtitle={restocking ? `${restocking.name} (${restocking.sku})` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRestocking(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRestock} disabled={!Number(restockQty)}>
              Add stock
            </Button>
          </>
        }
      >
        {restocking && (
          <div className="stack gap-16">
            <div className="row between" style={{ fontSize: 13 }}>
              <span className="muted">Current stock</span>
              <span className="mono bold">{restocking.stock}</span>
            </div>
            <Input
              label="Quantity to add"
              type="number"
              min="1"
              value={restockQty}
              onChange={e => setRestockQty(e.target.value)}
              placeholder="e.g. 24"
              autoFocus
            />
            {Number(restockQty) > 0 && (
              <div className="row between" style={{ fontSize: 13 }}>
                <span className="muted">New stock level</span>
                <span className="mono bold">
                  {restocking.stock + Number(restockQty)}
                </span>
              </div>
            )}
            <div className="inv-restock-note">
              For supplier purchases, use a purchase order instead so the cost and
              supplier balance are tracked.
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- Stock history modal ---------- */}
      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title={historyFor ? `Stock history · ${historyFor.name}` : ''}
        subtitle={
          historyFor
            ? `${historyFor.sku} · ${historyFor.stock} currently in stock`
            : ''
        }
        size="md"
        footer={<Button onClick={() => setHistoryFor(null)}>Close</Button>}
      >
        {historyLoading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : history.length === 0 ? (
          <div
            className="muted"
            style={{ padding: 24, textAlign: 'center', fontSize: 13.5 }}
          >
            No stock movements recorded yet. Sales, purchases and adjustments
            will appear here.
          </div>
        ) : (
          <div className="inv-history">
            {history.map(m => (
              <div key={m.id} className="inv-history-row">
                <span className={`inv-history-qty ${m.qty > 0 ? 'in' : 'out'}`}>
                  {m.qty > 0 ? '+' : ''}
                  {m.qty}
                </span>
                <div className="inv-history-body">
                  <div className="inv-history-type">
                    {MOVEMENT_LABEL[m.type] || m.type}
                  </div>
                  <div className="inv-history-meta">
                    {m.reference ? `Ref ${m.reference} · ` : ''}
                    Balance after {m.balance}
                  </div>
                  {m.note && (
                    <div className="inv-history-note">{m.note}</div>
                  )}
                </div>
                <span className="inv-history-time">
                  {formatLongDateTime(new Date(m.createdAt).toISOString())}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <style>{`
        .page-head {
          display: flex; justify-content: space-between; align-items: flex-end;
          gap: 16px; flex-wrap: wrap;
        }
        .page-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
        .page-sub { font-size: 13px; margin: 4px 0 0; }

        .inv-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 1100px) { .inv-kpis { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .inv-kpis { grid-template-columns: 1fr; } }

        .inv-alert {
          display: flex; gap: 14px; align-items: flex-start;
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: var(--r-lg); padding: 16px 20px; color: #92400e;
        }
        .inv-alert-title { font-weight: 700; font-size: 14px; }
        .inv-alert-sub { font-size: 13px; margin-top: 2px; }

        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .icon-btn:hover {
          background: var(--bg-soft);
          color: var(--primary);
          border-color: var(--primary);
        }

        .inv-restock-note {
          padding: 10px 12px;
          background: var(--bg-soft);
          border-radius: 10px;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.55;
        }

        .inv-history { display: flex; flex-direction: column; gap: 8px; }
        .inv-history-row {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .inv-history-qty {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 14px;
          min-width: 48px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .inv-history-qty.in { color: var(--success); }
        .inv-history-qty.out { color: var(--danger); }
        .inv-history-body { flex: 1; min-width: 0; }
        .inv-history-type {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text);
        }
        .inv-history-meta {
          font-size: 11.5px;
          color: var(--text-faint);
          margin-top: 2px;
        }
        .inv-history-note {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 4px;
          font-style: italic;
        }
        .inv-history-time {
          font-size: 11px;
          color: var(--text-faint);
          flex-shrink: 0;
          text-align: right;
        }
      `}</style>
    </div>
  );
}