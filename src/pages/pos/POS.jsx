import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, ScanLine, Search, User } from 'lucide-react';
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
import CustomerPicker from './CustomerPicker';
import WhatsAppShareModal from '@/components/common/WhatsAppShareModal';
import WhatsAppIcon from '@/components/common/WhatsAppIcon';
import BarcodeScannerModal from '@/components/common/BarcodeScannerModal';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { salesService } from '@/services/salesService';
import { heldCartService } from '@/services/heldCartService';
import { customerService } from '@/services/customerService';
import { whatsappService } from '@/services/whatsappService';
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
  const [customer, setCustomer] = useState(null);

  // ---------- Grid focus ----------
  const [focusedIndex, setFocusedIndex] = useState(0);

  // ---------- Modals ----------
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMpesa, setShowMpesa] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [lastReceiptPhone, setLastReceiptPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [processing, setProcessing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const searchRef = useRef(null);
  const gridRef = useRef(null);

  const anyModalOpen =
    showCheckout ||
    showMpesa ||
    showHold ||
    showCustomer ||
    showWhatsApp ||
    showScanner ||
    !!lastReceipt ||
    confirmClear;

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

  // ---------- Quick keys ----------
  const quickKeys = useMemo(() => {
    const sold = new Map();
    orders
      .filter(o => o.status === 'COMPLETED')
      .forEach(o => {
        (o.itemsList || []).forEach(i => {
          sold.set(i.name, (sold.get(i.name) || 0) + i.qty);
        });
      });
    return products
      .filter(p => p.stock > 0)
      .map(p => ({ ...p, sold: sold.get(p.name) || 0 }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 8);
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
          return prev.map(i =>
            i.id === product.id ? { ...i, qty: i.qty + 1 } : i
          );
        }
        return [
          ...prev,
          { id: product.id, name: product.name, price: product.price, qty: 1 },
        ];
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
      prev
        .map(i => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter(i => i.qty > 0)
    );

  const remove = id => setCart(prev => prev.filter(i => i.id !== id));

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomer(null);
  };

  // ---------- Totals ----------
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  // ---------- Barcode handling ----------
  // Used by: the software barcode scanner hook (USB scanner),
  //          the camera scanner modal, and manual entry from the camera modal.
  const handleBarcodeScan = useCallback(
    code => {
      const trimmed = String(code || '').trim();
      if (!trimmed) return;

      const match = products.find(
        p =>
          (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase()) ||
          (p.barcode && String(p.barcode) === trimmed)
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

  // USB / Bluetooth barcode scanner (behaves as a keyboard)
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
      const exact = products.find(
        p =>
          (p.sku && p.sku.toLowerCase() === q) ||
          (p.barcode && String(p.barcode) === q)
      );
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
      if (search) setSearch('');
      else gridRef.current?.focus();
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
      if (product && product.stock > 0) addToCart(product);
      else if (product) toast.error(`${product.name} is out of stock.`);
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
    await heldCartService.hold({ items: cart, label: holdLabel, cashier });
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

    if (method === 'On credit' && !customer) {
      toast.error('Select a customer for a credit sale.');
      return;
    }

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
        customerId: customer?.id || null,
        customerName: customer?.name || null,
        cashier: cashier.trim() || 'Owner',
        shiftId: activeShift?.id || null,
      });

      setLastReceipt({
        ref: reference || `CASH-${order.id}`,
        method,
        total,
        subtotal,
        tax,
        discount,
        items: cart,
        time: new Date(),
        orderId: order.id,
        cashier,
        customer: customer?.name || 'Walk-in',
        customerId: customer?.id || null,
      });

      clearCart();
      setShowCheckout(false);
      setShowMpesa(false);
      toast.success(
        method === 'On credit'
          ? `Credit sale recorded for ${customer.name}`
          : `${method} sale completed · Order #${order.id}`
      );
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

  // ---------- WhatsApp receipt ----------
  const openWhatsAppForReceipt = async () => {
    if (!lastReceipt) return;
    let phone = '';
    if (lastReceipt.customerId) {
      try {
        const c = await customerService.get(lastReceipt.customerId);
        if (c?.phone) phone = c.phone;
      } catch {
        // ignore — the cashier can type the number manually
      }
    }
    setLastReceiptPhone(phone);
    setShowWhatsApp(true);
  };

  // ---------- Camera scanner handler ----------
  const openCameraScanner = () => {
    setShowScanner(true);
  };

  // ---------- Loading / Empty ----------
  if (loading) {
    return (
      <div
        className="pos"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="skeleton"
          style={{ height: '80%', width: '100%', borderRadius: 18 }}
        />
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
            The POS pulls from your product list. Add at least one product from
            the Products page and it will appear here instantly.
          </p>
          <a href="/products">
            <Button>Go to Products</Button>
          </a>
        </div>
        <style>{`
          .empty-cta-pos {
            display: flex; flex-direction: column; align-items: center;
            text-align: center; padding: 60px 24px; gap: 10px;
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
          .empty-cta-pos p {
            max-width: 380px; font-size: 13.5px;
            line-height: 1.6; margin: 0 0 12px;
          }
        `}</style>
      </div>
    );
  }

  // ---------- WhatsApp message ----------
  const whatsappMessage = lastReceipt
    ? whatsappService.buildReceiptMessage({
        business,
        order: {
          id: lastReceipt.orderId,
          date: lastReceipt.time.toISOString(),
          itemsList: lastReceipt.items.map(i => ({
            name: i.name,
            qty: i.qty,
            price: i.price,
          })),
          subtotal: lastReceipt.subtotal,
          tax: lastReceipt.tax,
          discount: lastReceipt.discount,
          total: lastReceipt.total,
          method: lastReceipt.method,
          reference: lastReceipt.ref,
          paymentStatus:
            lastReceipt.method === 'On credit' ? 'credit' : 'paid',
          customer: lastReceipt.customer,
          cashier: lastReceipt.cashier,
        },
        footerNote: business.receiptFooter,
      })
    : '';

  return (
    <div className="pos">
      {/* LEFT: categories + search */}
      <aside className="pos-cats">
        <div className="pos-search-row">
          <Input
            ref={searchRef}
            placeholder="Search or scan (F2)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            leftIcon={<Search size={15} />}
          />
          <button
            type="button"
            className="pos-scan-btn"
            onClick={openCameraScanner}
            title="Scan barcode with camera"
            aria-label="Scan barcode with camera"
          >
            <ScanLine size={18} />
          </button>
        </div>

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
            <li>
              <kbd>F2</kbd> Search
            </li>
            <li>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <kbd>←</kbd>
              <kbd>→</kbd> Grid
            </li>
            <li>
              <kbd>↵</kbd> Add focused
            </li>
            <li>
              <kbd>F4</kbd> Checkout
            </li>
            <li>
              <kbd>F9</kbd> Clear cart
            </li>
            <li>
              <kbd>F10</kbd> Hold cart
            </li>
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
        <button
          type="button"
          className={`pos-customer ${customer ? 'on' : ''}`}
          onClick={() => setShowCustomer(true)}
        >
          <User size={14} />
          <span className="pos-customer-name">
            {customer ? customer.name : 'Add customer (optional)'}
          </span>
        </button>

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
              <strong>No active shift.</strong> Start a shift to record this
              sale against a cashier session.
            </div>
          )}

          {customer && (
            <div className="co-customer">
              <User size={14} />
              <span>{customer.name}</span>
              <button type="button" onClick={() => setShowCustomer(true)}>
                Change
              </button>
            </div>
          )}

          <div className="co-methods">
            <button
              type="button"
              className={`pay-method ${paymentMethod === 'CASH' ? 'on' : ''}`}
              onClick={() => setPaymentMethod('CASH')}
            >
              Cash
            </button>
            <button
              type="button"
              className={`pay-method ${paymentMethod === 'MPESA' ? 'on' : ''}`}
              onClick={() => setPaymentMethod('MPESA')}
            >
              M-Pesa
            </button>
            <button
              type="button"
              className={`pay-method ${paymentMethod === 'CREDIT' ? 'on' : ''}`}
              onClick={() => {
                if (!customer) {
                  setShowCustomer(true);
                } else {
                  setPaymentMethod('CREDIT');
                }
              }}
            >
              On credit
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
                <div className="row between">
                  <span className="muted">Subtotal</span>
                  <span className="mono">{formatKSh(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="row between">
                    <span className="muted">Discount</span>
                    <span className="mono">-{formatKSh(discount)}</span>
                  </div>
                )}
                <div className="row between">
                  <span className="muted">VAT (16%)</span>
                  <span className="mono">{formatKSh(tax)}</span>
                </div>
                <div className="row between total">
                  <span>Total</span>
                  <span className="mono">{formatKSh(total)}</span>
                </div>
              </div>
              <Button
                full
                size="lg"
                loading={processing}
                onClick={() => complete('Cash', null)}
              >
                Confirm cash payment
              </Button>
            </>
          )}

          {paymentMethod === 'MPESA' && (
            <>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-muted)',
                  fontSize: 13.5,
                }}
              >
                Send an STK push to the customer's phone to collect payment via
                M-Pesa.
              </p>
              <Button full size="lg" onClick={startMpesa}>
                Continue to M-Pesa
              </Button>
            </>
          )}

          {paymentMethod === 'CREDIT' && customer && (
            <>
              <div className="co-credit-note">
                <strong>{customer.name}</strong> will owe {formatKSh(total)}{' '}
                after this sale. You can record a payment later from their
                profile.
              </div>
              <Button
                full
                size="lg"
                loading={processing}
                onClick={() => complete('On credit', null)}
              >
                Record credit sale
              </Button>
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
        subtitle={`${cart.length} item${
          cart.length === 1 ? '' : 's'
        } · ${formatKSh(total)}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowHold(false)}>
              Cancel
            </Button>
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
        onConfirm={() => {
          clearCart();
          setConfirmClear(false);
        }}
        title="Clear cart"
        message="Remove all items from the current sale?"
        confirmLabel="Clear cart"
      />

      {/* ---------- Receipt modal ---------- */}
      <Modal
        open={!!lastReceipt}
        onClose={() => setLastReceipt(null)}
        title="Sale completed"
        subtitle={lastReceipt ? `Reference: ${lastReceipt.ref}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
            <Button
              variant="outline"
              leftIcon={<WhatsAppIcon size={14} />}
              onClick={openWhatsAppForReceipt}
            >
              WhatsApp
            </Button>
            <Button onClick={() => setLastReceipt(null)}>Done</Button>
          </>
        }
      >
        {lastReceipt && (
          <div className="receipt print-area">
            <div className="receipt-head">
              <div className="receipt-brand">Sokoni</div>
              <div className="receipt-shop">
                {business.name || 'Your Business'}
              </div>
              {(business.location || business.phone) && (
                <div className="receipt-meta">
                  {[business.location, business.phone]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
              <div className="receipt-meta">
                {new Date(lastReceipt.time).toLocaleString('en-KE')}
              </div>
              {lastReceipt.cashier && (
                <div className="receipt-meta">
                  Cashier: {lastReceipt.cashier}
                </div>
              )}
              {lastReceipt.customer &&
                lastReceipt.customer !== 'Walk-in' && (
                  <div className="receipt-meta">
                    Customer: {lastReceipt.customer}
                  </div>
                )}
            </div>
            <div className="receipt-items">
              {lastReceipt.items.map(i => (
                <div key={i.id} className="receipt-row">
                  <span>{i.name}</span>
                  <span className="mono">
                    {i.qty} × {formatKSh(i.price)}
                  </span>
                </div>
              ))}
            </div>
            <div className="receipt-total">
              <span>Total</span>
              <span className="mono">{formatKSh(lastReceipt.total)}</span>
            </div>
            <div className="receipt-pay">
              {lastReceipt.method === 'On credit'
                ? `On credit — charged to ${lastReceipt.customer}`
                : `Paid via ${lastReceipt.method} · Ref ${lastReceipt.ref}`}
            </div>
            {business.receiptFooter && (
              <div className="receipt-pay">{business.receiptFooter}</div>
            )}
          </div>
        )}
      </Modal>

      {/* ---------- WhatsApp share ---------- */}
      {lastReceipt && (
        <WhatsAppShareModal
          open={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
          defaultPhone={lastReceiptPhone}
          customerName={
            lastReceipt.customer && lastReceipt.customer !== 'Walk-in'
              ? lastReceipt.customer
              : ''
          }
          message={whatsappMessage}
          title="Send receipt on WhatsApp"
        />
      )}

      {/* ---------- Customer picker ---------- */}
      <CustomerPicker
        open={showCustomer}
        selected={customer}
        onSelect={c => {
          setCustomer(c);
          setShowCustomer(false);
        }}
        onClear={() => {
          setCustomer(null);
          setShowCustomer(false);
        }}
        onClose={() => setShowCustomer(false)}
      />

      {/* ---------- Camera barcode scanner ---------- */}
      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan product"
        subtitle="Point the camera at a barcode to add it to the cart"
        manualLabel="Type the code instead"
        onManualEntry={handleBarcodeScan}
      />

      <style>{`
        .pos-search-row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .pos-search-row > .field {
          flex: 1;
          min-width: 0;
        }
        .pos-scan-btn {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--primary);
          color: #fff;
          border: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 160ms ease, transform 160ms ease;
          box-shadow: 0 6px 18px rgba(109, 94, 252, 0.28);
        }
        .pos-scan-btn:hover {
          background: var(--primary-600);
        }
        .pos-scan-btn:active {
          transform: scale(0.96);
        }

        .pay-method {
          flex: 1; padding: 12px; border-radius: 12px;
          border: 1px solid var(--border-strong); background: #fff;
          cursor: pointer; font-weight: 600; font-size: 13.5px;
          color: var(--text-muted); transition: all var(--dur);
        }
        .pay-method.on {
          border-color: var(--primary); background: var(--primary-50);
          color: var(--primary); box-shadow: 0 0 0 3px var(--primary-50);
        }
        .co-methods { display: flex; gap: 8px; }
        .checkout-summary {
          background: var(--bg-soft); border-radius: 12px;
          padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
          font-size: 13.5px;
        }
        .checkout-summary .total {
          font-weight: 700; font-size: 15px;
          padding-top: 8px; border-top: 1px dashed var(--border-strong);
        }
        .receipt {
          background: #fff; border: 1px dashed var(--border-strong);
          border-radius: 12px; padding: 20px;
          font-family: 'Courier New', monospace;
        }
        .receipt-head {
          text-align: center; border-bottom: 1px dashed var(--border-strong);
          padding-bottom: 12px; margin-bottom: 12px;
        }
        .receipt-brand {
          font-size: 12px; letter-spacing: 0.15em; color: var(--text-muted);
        }
        .receipt-shop { font-weight: 700; font-size: 16px; margin-top: 4px; }
        .receipt-meta {
          font-size: 11.5px; color: var(--text-faint); margin-top: 4px;
        }
        .receipt-items {
          display: flex; flex-direction: column; gap: 6px; font-size: 13px;
        }
        .receipt-row { display: flex; justify-content: space-between; }
        .receipt-total {
          display: flex; justify-content: space-between;
          font-weight: 700; font-size: 15px; margin-top: 12px;
          padding-top: 12px; border-top: 1px dashed var(--border-strong);
        }
        .receipt-pay {
          text-align: center; font-size: 11.5px;
          color: var(--text-muted); margin-top: 12px;
        }
        .shift-warn {
          padding: 10px 12px; background: #fffbeb;
          border: 1px solid #fcd34d; border-radius: 10px;
          font-size: 12.5px; color: #92400e; line-height: 1.55;
        }
        .co-customer, .co-credit-note {
          display: flex; gap: 8px; align-items: center;
          padding: 10px 12px; background: var(--primary-50);
          border: 1px solid var(--primary-100); border-radius: 10px;
          font-size: 12.5px; color: var(--primary-700);
        }
        .co-customer button {
          margin-left: auto; background: transparent; border: 0;
          color: inherit; font-weight: 700; cursor: pointer;
          text-decoration: underline; font-size: 12px; padding: 0;
        }
        .co-credit-note { line-height: 1.55; display: block; }
        .pos-customer {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; margin-bottom: 12px;
          border-radius: 12px;
          background: #fff;
          border: 1px dashed var(--border-strong);
          color: var(--text-muted);
          font-size: 12.5px; font-weight: 600;
          cursor: pointer;
          transition: all var(--dur);
        }
        .pos-customer:hover {
          border-color: var(--primary); color: var(--primary);
        }
        .pos-customer.on {
          border-style: solid;
          border-color: var(--primary);
          background: var(--primary-50);
          color: var(--primary-700);
        }
        .pos-customer-name {
          flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: left;
        }
      `}</style>
    </div>
  );
}