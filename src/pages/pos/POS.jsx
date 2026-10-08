import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, Search } from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import MpesaModal from './MpesaModal';
import QuickKeys from './QuickKeys';
import HeldCarts from './HeldCarts';
import ShiftPanel from './ShiftPanel';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { salesService } from '@/services/salesService';
import { heldCartService } from '@/services/heldCartService';
import { formatKSh } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { useShift } from '@/context/ShiftContext';
import { useToast } from '@/context/ToastContext';
import './POS.css';

const TAX_RATE = 0.16;

export default function POS() {
  const toast = useToast();
  const { business } = useBusiness();
  const { user } = useAuth();
  const { activeShift } = useShift();

  // ---------- Data ----------
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [heldCarts, setHeldCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- Filters ----------
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 120);

  // ---------- Cart ----------
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [cashier, setCashier] = useState(user?.fullName?.trim() || 'Owner');

  // ---------- Grid focus ----------
  const [focusedIndex, setFocusedIndex] = useState(0);

  // ---------- Modals ----------
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMpesa, setShowMpesa] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [processing, setProcessing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // ---------- Refs ----------
  const searchRef = useRef(null);
  const gridRef = useRef(null);

  const anyModalOpen = showCheckout || showMpesa || showHold || !!lastReceipt || confirmClear;

  // ---------- Load ----------
  const load = useCallback(async () => {
    const [prods, cats, ords, held] = await Promise.all([
      productService.list(),
      categoryService.list(),
      salesService.list(),
      heldCartService.list(),
    ]);
    setProducts(prods);
    setCategories(cats);
    setOrders(ords);
    setHeldCarts(held);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setTimeout(() => searchRef.current?.focus(), 60);
    })();
  }, [load]);

  // Keep cashier default in sync with user name
  useEffect(() => {
    if (!cashier || cashier === 'Owner') {
      const next = user?.fullName?.trim() || 'Owner';
      if (next !== cashier) setCashier(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.fullName]);

  // ---------- Visible products ----------
  const visibleProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return products.filter(p => {
      if (activeCategory !== 'All' && p.category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
      );
    });
  }, [products, debouncedSearch, activeCategory]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [debouncedSearch, activeCategory]);

  // ---------- Quick keys: top sellers ----------
  const quickKeys = useMemo(() => {
    const sold = new Map();
    orders
      .filter(o => o.status === 'COMPLETED')
      .forEach(o => {
        (o.itemsList || []).forEach(i => {
          sold.set(i.name, (sold.get(i.name) || 0) + i.qty);
        });
      });
    const ranked = products
      .filter(p => p.stock > 0)
      .map(p => ({ ...p, sold: sold.get(p.name) || 0 }))
      .sort((a, b) => b.sold - a.sold);
    return ranked.slice(0, 8);
  }, [products, orders]);

  // ---------- Cart operations ----------
  const addToCart = useCallback(
    product => {
      setCart(prev => {
        const existing = prev.find(i => i.id === product.id);
        if (existing) {
          if (existing.qty >= product.stock) {
            toast.warning(`Only ${product.stock} of ${product.name} in stock.`);
            return prev;
          }
          return prev.map(i => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
        }
        return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
      });
    },
    [toast]
  );

  const inc = id => {
    const product = products.find(p => p.id === id);
    setCart(prev =>
      prev.map(i => {
        if (i.id !== id) return i;
        if (product && i.qty >= product.stock) {
          toast.warning(`Only ${product.stock} in stock.`);
          return i;
        }
        return { ...i, qty: i.qty + 1 };
      })
    );
  };

  const dec = id =>
    setCart(prev =>
      prev.map(i => (i.id === id ? { ...i, qty: i.qty - 1 } : i)).filter(i => i.qty > 0)
    );

  const remove = id => setCart(prev => prev.filter(i => i.id !== id));

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // ---------- Totals ----------
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  // ---------- Barcode scan ----------
  const handleBarcodeScan = useCallback(
    code => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const match = products.find(
        p => p.sku?.toLowerCase() === trimmed.toLowerCase() || p.barcode === trimmed
      );
      if (match) {
        if (match.stock === 0) {
          toast.error(`${match.name} is out of stock.`);
          return;
        }
        addToCart(match);
        toast.success(`Added ${match.name}`);
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 30);
      } else {
        toast.error(`No product found for code ${trimmed}.`);
      }
    },
    [products, addToCart, toast]
  );

  useBarcodeScanner(handleBarcodeScan, { enabled: !anyModalOpen });

  // ---------- Search Enter behaviour ----------
  const onSearchKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = search.trim().toLowerCase();
      if (!q) {
        gridRef.current?.focus();
        return;
      }
      const exact = products.find(p => p.sku?.toLowerCase() === q || p.barcode === q);
      if (exact) {
        if (exact.stock === 0) {
          toast.error(`${exact.name} is out of stock.`);
        } else {
          addToCart(exact);
          setSearch('');
          toast.success(`Added ${exact.name}`);
        }
        return;
      }
      if (visibleProducts.length === 1) {
        const only = visibleProducts[0];
        if (only.stock === 0) {
          toast.error(`${only.name} is out of stock.`);
        } else {
          addToCart(only);
          setSearch('');
          toast.success(`Added ${only.name}`);
        }
        return;
      }
      gridRef.current?.focus();
    } else if (e.key === 'Escape') {
      if (search) {
        setSearch('');
      } else {
        gridRef.current?.focus();
      }
    }
  };

  // ---------- Grid keyboard nav ----------
  const onGridKeyDown = e => {
    if (visibleProducts.length === 0) return;

    const readColumns = () => {
      if (!gridRef.current) return 1;
      const cols = getComputedStyle(gridRef.current).gridTemplateColumns;
      return cols.split(' ').filter(Boolean).length || 1;
    };

    const cols = readColumns();
    const total = visibleProducts.length;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + cols, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - cols, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(total - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const product = visibleProducts[focusedIndex];
      if (product && product.stock > 0) {
        addToCart(product);
      } else if (product) {
        toast.error(`${product.name} is out of stock.`);
      }
    } else if (e.key === 'Escape') {
      searchRef.current?.focus();
    }
  };

  // ---------- Global hotkeys ----------
  useKeyboardShortcut(
    () => {
      searchRef.current?.focus();
      searchRef.current?.select?.();
    },
    { key: 'F2', enabled: !anyModalOpen }
  );

  useKeyboardShortcut(
    () => {
      if (!cart.length) {
        toast.warning('Cart is empty.');
        return;
      }
      setPaymentMethod('CASH');
      setShowCheckout(true);
    },
    { key: 'F4', enabled: !anyModalOpen }
  );

  useKeyboardShortcut(
    () => {
      if (!cart.length) {
        toast.warning('Cart is empty.');
        return;
      }
      setPaymentMethod('CASH');
      setShowCheckout(true);
    },
    { key: 'F8', enabled: !anyModalOpen }
  );

  useKeyboardShortcut(
    () => {
      if (!cart.length) return;
      setConfirmClear(true);
    },
    { key: 'F9', enabled: !anyModalOpen }
  );

  useKeyboardShortcut(
    () => {
      if (!cart.length) {
        toast.warning('Cart is empty.');
        return;
      }
      setHoldLabel('');
      setShowHold(true);
    },
    { key: 'F10', enabled: !anyModalOpen }
  );

  // ---------- Hold / Recall ----------
  const confirmHold = async () => {
    await heldCartService.hold({
      items: cart,
      label: holdLabel,
      cashier,
    });
    setShowHold(false);
    clearCart();
    toast.success('Cart held.');
    setHeldCarts(await heldCartService.list());
  };

  const recallCart = async held => {
    if (cart.length) {
      await heldCartService.hold({
        items: cart,
        label: 'Auto-held',
        cashier,
      });
      toast.success('Current cart held automatically.');
    }
    const recalled = await heldCartService.recall(held.id);
    if (recalled) {
      setCart(recalled.items);
      setDiscount(0);
      toast.success(`${recalled.label} recalled.`);
    }
    setHeldCarts(await heldCartService.list());
  };

  const removeHeld = async held => {
    await heldCartService.remove(held.id);
    setHeldCarts(await heldCartService.list());
    toast.success('Held cart removed.');
  };

  const refreshHeld = async () => {
    setHeldCarts(await heldCartService.list());
  };

  // ---------- Complete sale ----------
  const complete = async (method, reference) => {
    if (!cart.length) return;
    setProcessing(true);
    try {
      const order = await salesService.create({
        items: cart,
        subtotal,
        tax,
        discount,
        total,
        method,
        reference,
        cashier: cashier.trim() || 'Owner',
        shiftId: activeShift?.id || null,
      });
      setLastReceipt({
        ref: reference || `CASH-${order.id}`,
        method,
        total,
        items: cart,
        time: new Date(),
        orderId: order.id,
        cashier,
      });
      clearCart();
      setShowCheckout(false);
      setShowMpesa(false);
      toast.success(`${method} sale completed · Order #${order.id}`);
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not complete sale.');
    } finally {
      setProcessing(false);
    }
  };

  const openCheckout = () => {
    if (!cart.length) {
      toast.warning('Cart is empty.');
      return;
    }
    setPaymentMethod('CASH');
    setShowCheckout(true);
  };

  const startMpesa = () => {
    setShowCheckout(false);
    setShowMpesa(true);
  };

  // ---------- Loading / Empty ----------
  if (loading) {
    return (
      <div className="pos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ height: '80%', width: '100%', borderRadius: 18 }} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="stack gap-24">
        <header className="page-head">
          <div>
            <h1 className="page-title">Point of Sale</h1>
            <p className="page-sub muted">Add products to start selling</p>
          </div>
        </header>

        <div className="empty-cta-pos">
          <div className="empty-cta-icon">
            <Package size={28} />
          </div>
          <h3>No products in your catalogue</h3>
          <p className="muted">
            The POS pulls from your product list. Add at least one product from the
            Products page and it will appear here instantly.
          </p>
          <a href="/products"><Button>Go to Products</Button></a>
        </div>

        <style>{`
          .empty-cta-pos {
            display: flex; flex-direction: column; align-items: center; text-align: center;
            padding: 60px 24px; gap: 10px;
            background: #fff; border: 1px dashed var(--border-strong);
            border-radius: var(--r-lg);
          }
          .empty-cta-pos .empty-cta-icon {
            width: 64px; height: 64px; border-radius: 20px;
            background: var(--primary-50); color: var(--primary);
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 8px;
          }
          .empty-cta-pos h3 { font-size: 18px; font-weight: 700; margin: 4px 0 0; }
          .empty-cta-pos p { max-width: 380px; font-size: 13.5px; line-height: 1.6; margin: 0 0 12px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pos">
      {/* LEFT: categories */}
      <aside className="pos-cats">
        <Input
          ref={searchRef}
          placeholder="Search or scan (F2)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          leftIcon={<Search size={15} />}
        />
        <div className="pos-cats-list">
          <button
            className={`pos-cat ${activeCategory === 'All' ? 'on' : ''}`}
            onClick={() => setActiveCategory('All')}
          >
            All products
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={`pos-cat ${activeCategory === c.name ? 'on' : ''}`}
              onClick={() => setActiveCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="pos-shortcuts">
          <div className="pos-shortcuts-title">Shortcuts</div>
          <ul>
            <li><kbd>F2</kbd> Search</li>
            <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Grid</li>
            <li><kbd>↵</kbd> Add focused</li>
            <li><kbd>F4</kbd> Checkout</li>
            <li><kbd>F9</kbd> Clear cart</li>
            <li><kbd>F10</kbd> Hold cart</li>
          </ul>
        </div>
      </aside>

      {/* CENTER: quick keys + grid */}
      <main className="pos-main">
        <div className="pos-main-head">
          <h1 className="pos-title">Point of Sale</h1>
          <div className="row gap-12">
            <ShiftPanel />
            <span className="muted" style={{ fontSize: 13 }}>
              {visibleProducts.length} products
            </span>
            <HeldCarts
              carts={heldCarts}
              onRecall={recallCart}
              onRemove={removeHeld}
              onRefresh={refreshHeld}
            />
          </div>
        </div>

        {!search && activeCategory === 'All' && (
          <QuickKeys products={quickKeys} onAdd={addToCart} />
        )}

        <ProductGrid
          products={visibleProducts}
          onAdd={addToCart}
          focusedIndex={focusedIndex}
          onFocusChange={setFocusedIndex}
          gridRef={gridRef}
          onKeyDown={onGridKeyDown}
        />
      </main>

      {/* RIGHT: cart */}
      <aside className="pos-cart">
        <Cart
          items={cart}
          onInc={inc}
          onDec={dec}
          onRemove={remove}
          onClear={() => setConfirmClear(true)}
          discount={discount}
          setDiscount={setDiscount}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onCheckout={openCheckout}
        />
      </aside>

      {/* ---------- Checkout modal ---------- */}
      <Modal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Complete payment"
        subtitle={`Total: ${formatKSh(total)}`}
        size="sm"
      >
        <div className="stack gap-16">
          {!activeShift && (
            <div className="shift-warn">
              <strong>No active shift.</strong> Start a shift to record this sale
              against a cashier session — you can still complete the sale without one.
            </div>
          )}

          <div className="row gap-8">
            <button
              className={`pay-method ${paymentMethod === 'CASH' ? 'on' : ''}`}
              onClick={() => setPaymentMethod('CASH')}
            >
              Cash
            </button>
            <button
              className={`pay-method ${paymentMethod === 'MPESA' ? 'on' : ''}`}
              onClick={() => setPaymentMethod('MPESA')}
            >
              M-Pesa
            </button>
          </div>

          <div className="field">
            <label className="field-label">Cashier</label>
            <div className="field-control">
              <input
                className="field-input"
                value={cashier}
                onChange={e => setCashier(e.target.value)}
                placeholder="Your name or cashier name"
              />
            </div>
          </div>

          {paymentMethod === 'CASH' && (
            <>
              <div className="checkout-summary">
                <div className="row between"><span className="muted">Subtotal</span><span className="mono">{formatKSh(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="row between"><span className="muted">Discount</span><span className="mono">-{formatKSh(discount)}</span></div>
                )}
                <div className="row between"><span className="muted">VAT (16%)</span><span className="mono">{formatKSh(tax)}</span></div>
                <div className="row between total"><span>Total</span><span className="mono">{formatKSh(total)}</span></div>
              </div>
              <Button full size="lg" loading={processing} onClick={() => complete('Cash', null)}>
                Confirm cash payment
              </Button>
            </>
          )}

          {paymentMethod === 'MPESA' && (
            <>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>
                Send an STK push to the customer's phone to collect payment via M-Pesa.
              </p>
              <Button full size="lg" onClick={startMpesa}>Continue to M-Pesa</Button>
            </>
          )}
        </div>
      </Modal>

      {/* ---------- M-Pesa modal ---------- */}
      <MpesaModal
        open={showMpesa}
        onClose={() => setShowMpesa(false)}
        amount={total}
        onSuccess={ref => complete('M-Pesa', ref)}
      />

      {/* ---------- Hold modal ---------- */}
      <Modal
        open={showHold}
        onClose={() => setShowHold(false)}
        title="Hold this cart"
        subtitle={`${cart.length} item${cart.length === 1 ? '' : 's'} · ${formatKSh(total)}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowHold(false)}>Cancel</Button>
            <Button onClick={confirmHold}>Hold cart</Button>
          </>
        }
      >
        <div className="field">
          <label className="field-label">Label (optional)</label>
          <div className="field-control">
            <input
              className="field-input"
              value={holdLabel}
              onChange={e => setHoldLabel(e.target.value)}
              placeholder="e.g. Customer in blue shirt"
              autoFocus
            />
          </div>
          <span className="field-hint">
            Give the cart a name so you can find it quickly later.
          </span>
        </div>
      </Modal>

      {/* ---------- Clear confirm ---------- */}
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { clearCart(); setConfirmClear(false); }}
        title="Clear cart"
        message="Remove all items from the current sale?"
        confirmLabel="Clear cart"
      />

      {/* ---------- Receipt ---------- */}
      <Modal
        open={!!lastReceipt}
        onClose={() => setLastReceipt(null)}
        title="Sale completed"
        subtitle={lastReceipt ? `Reference: ${lastReceipt.ref}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()}>Print receipt</Button>
            <Button onClick={() => setLastReceipt(null)}>Done</Button>
          </>
        }
      >
        {lastReceipt && (
          <div className="receipt print-area">
            <div className="receipt-head">
              <div className="receipt-brand">Sokoni</div>
              <div className="receipt-shop">{business.name || 'Your Business'}</div>
              {(business.location || business.phone) && (
                <div className="receipt-meta">
                  {[business.location, business.phone].filter(Boolean).join(' · ')}
                </div>
              )}
              <div className="receipt-meta">
                {new Date(lastReceipt.time).toLocaleString('en-KE')}
              </div>
              {lastReceipt.cashier && (
                <div className="receipt-meta">Cashier: {lastReceipt.cashier}</div>
              )}
            </div>
            <div className="receipt-items">
              {lastReceipt.items.map(i => (
                <div key={i.id} className="receipt-row">
                  <span>{i.name}</span>
                  <span className="mono">{i.qty} × {formatKSh(i.price)}</span>
                </div>
              ))}
            </div>
            <div className="receipt-total">
              <span>Total</span>
              <span className="mono">{formatKSh(lastReceipt.total)}</span>
            </div>
            <div className="receipt-pay">
              Paid via {lastReceipt.method} · Ref {lastReceipt.ref}
            </div>
            {business.receiptFooter && (
              <div className="receipt-pay">{business.receiptFooter}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}