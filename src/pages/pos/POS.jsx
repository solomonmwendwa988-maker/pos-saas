import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Package, ScanLine, Search, Sparkles, User } from 'lucide-react';
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
import CashPaymentModal from './CashPaymentModal';
import WhatsAppShareModal from '@/components/common/WhatsAppShareModal';
import WhatsAppIcon from '@/components/common/WhatsAppIcon';
import BarcodeScannerModal from '@/components/common/BarcodeScannerModal';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { salesService } from '@/services/salesService';
import { heldCartService } from '@/services/heldCartService';
import { customerService } from '@/services/customerService';
import { whatsappService } from '@/services/whatsappService';
import { pdfService } from '@/services/pdfService';
import { shareService } from '@/services/shareService';
import { loyaltyService } from '@/services/loyaltyService';
import { formatKSh } from '@/utils/format';
import { successBeep } from '@/utils/beep';
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

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [heldCarts, setHeldCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 120);

  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [cashier, setCashier] = useState(user?.fullName?.trim() || 'Owner');
  const [customer, setCustomer] = useState(null);

  const [focusedIndex, setFocusedIndex] = useState(0);

  const [showCheckout, setShowCheckout] = useState(false);
  const [showMpesa, setShowMpesa] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [holdLabel, setHoldLabel] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [lastReceiptPhone, setLastReceiptPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [paymentMode, setPaymentMode] = useState('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);

  const searchRef = useRef(null);
  const gridRef = useRef(null);

  const anyModalOpen =
    showCheckout ||
    showMpesa ||
    showHold ||
    showCustomer ||
    showWhatsApp ||
    showScanner ||
    showCash ||
    mpesaOpen ||
    !!lastReceipt ||
    confirmClear;

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

  useEffect(() => {
    setRedeemPoints(0);
  }, [customer?.id]);

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

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  // Loyalty math
  const loyaltyBalance = customer ? loyaltyService.balance(customer.id) : 0;
  const maxRedeem = customer
    ? loyaltyService.maxRedeemable(customer.id, total)
    : { points: 0, value: 0 };
  const loyaltyDiscount = loyaltyService.pointsToValue(redeemPoints);
  const totalAfterLoyalty = Math.max(0, total - loyaltyDiscount);

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
        toast.success(`Added ${match.name}`, { duration: 1200 });
        setSearch('');
      } else {
        toast.error(`No product found for code ${trimmed}.`);
      }
    },
    [products, addToCart, toast]
  );

  useBarcodeScanner(handleBarcodeScan, { enabled: !anyModalOpen });

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
        if (exact.stock === 0) toast.error(`${exact.name} is out of stock.`);
        else {
          addToCart(exact);
          setSearch('');
          toast.success(`Added ${exact.name}`);
        }
        return;
      }
      if (visibleProducts.length === 1) {
        const only = visibleProducts[0];
        if (only.stock === 0) toast.error(`${only.name} is out of stock.`);
        else {
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

  const onGridKeyDown = e => {
    if (visibleProducts.length === 0) return;
    const readColumns = () => {
      if (!gridRef.current) return 1;
      const cols = getComputedStyle(gridRef.current).gridTemplateColumns;
      return cols.split(' ').filter(Boolean).length || 1;
    };
    const cols = readColumns();
    const totalLen = visibleProducts.length;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, totalLen - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + cols, totalLen - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - cols, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(totalLen - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const product = visibleProducts[focusedIndex];
      if (product && product.stock > 0) addToCart(product);
      else if (product) toast.error(`${product.name} is out of stock.`);
    } else if (e.key === 'Escape') {
      searchRef.current?.focus();
    }
  };

  const openCheckout = useCallback(() => {
    if (!cart.length) {
      toast.warning('Cart is empty.');
      return;
    }
    setPaymentMode('CASH');
    setCashAmount('');
    setMpesaAmount('');
    setMpesaRef('');
    setShowCheckout(true);
  }, [cart.length, toast]);

  useKeyboardShortcut(
    () => {
      searchRef.current?.focus();
      searchRef.current?.select?.();
    },
    { key: 'F2', enabled: !anyModalOpen }
  );
  useKeyboardShortcut(openCheckout, { key: 'F4', enabled: !anyModalOpen });
  useKeyboardShortcut(openCheckout, { key: 'F8', enabled: !anyModalOpen });
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
  const complete = async ({ method, reference, payments, cash, useLoyalty }) => {
    if (!cart.length) return;
    if (method === 'On credit' && !customer) {
      toast.error('Select a customer for a credit sale.');
      return;
    }

    setProcessing(true);
    try {
      const points = useLoyalty ? Number(redeemPoints) || 0 : 0;
      const pointsValue = loyaltyService.pointsToValue(points);
      const finalTotal = Math.max(0, total - pointsValue);

      let finalPayments = payments;
      if (points > 0 && Array.isArray(payments) && payments.length > 0) {
        const first = payments[0];
        const adjusted = {
          ...first,
          amount: Math.max(0, Number(first.amount) - pointsValue),
        };
        finalPayments = [adjusted, ...payments.slice(1)].filter(
          p => Number(p.amount) > 0.005
        );
      }

      const order = await salesService.create({
        items: cart,
        subtotal,
        tax,
        discount,
        total: finalTotal,
        method,
        reference,
        payments: finalPayments,
        customerId: customer?.id || null,
        customerName: customer?.name || null,
        cashier: cashier.trim() || 'Owner',
        shiftId: activeShift?.id || null,
      });

      // Loyalty write
      let loyaltyResult = null;
      if (customer?.id) {
        if (points > 0) {
          await loyaltyService.redeem({
            customerId: customer.id,
            points,
            orderId: order.id,
          });
        }
        const earned = loyaltyService.pointsForAmount(finalTotal);
        if (earned > 0) {
          await loyaltyService.earn({
            customerId: customer.id,
            amount: finalTotal,
            orderId: order.id,
          });
        }
        loyaltyResult = {
          pointsEarned: earned,
          pointsRedeemed: points,
          valueRedeemed: pointsValue,
          balance: loyaltyService.balance(customer.id),
        };
      }

      setLastReceipt({
        ref:
          reference ||
          (order.payments?.length > 1 ? 'SPLIT' : `CASH-${order.id}`),
        method: order.method,
        payments:
          order.payments || [{ method: order.method, amount: finalTotal }],
        total: finalTotal,
        subtotal,
        tax,
        discount,
        loyaltyDiscount: pointsValue,
        items: cart,
        time: new Date(),
        orderId: order.id,
        cashier,
        customer: customer?.name || 'Walk-in',
        customerId: customer?.id || null,
        loyalty: loyaltyResult,
        cash: cash || null,
      });

      successBeep();
      clearCart();
      setShowCheckout(false);
      setShowMpesa(false);
      setShowCash(false);
      setRedeemPoints(0);
      toast.success(
        method === 'On credit'
          ? `Credit sale recorded for ${customer.name}`
          : `Sale completed · Order #${order.id}`
      );
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not complete sale.');
    } finally {
      setProcessing(false);
    }
  };

  // ---------- M-Pesa flows ----------
  const startFullMpesa = () => {
    setShowCheckout(false);
    setShowMpesa(true);
  };

  const startSplitMpesa = () => {
    if (splitMpesa <= 0) {
      toast.warning('Enter an M-Pesa amount first.');
      return;
    }
    setMpesaOpen(true);
  };

  const handleMpesaSuccess = ref => {
    if (showMpesa) {
      complete({
        method: 'M-Pesa',
        reference: ref,
        useLoyalty: redeemPoints > 0,
      });
      return;
    }
    setMpesaRef(ref);
    setMpesaOpen(false);
    toast.success('M-Pesa request approved. Confirm to complete the sale.');
  };

  // Split math
  const splitCash = Number(cashAmount) || 0;
  const splitMpesa = Number(mpesaAmount) || 0;
  const splitSum = splitCash + splitMpesa;
  const splitRemaining = Math.max(0, totalAfterLoyalty - splitSum);
  const splitValid =
    splitSum <= totalAfterLoyalty + 0.01 &&
    splitSum >= totalAfterLoyalty - 0.01 &&
    (splitCash > 0 || splitMpesa > 0);

  const confirmSplit = async () => {
    if (!splitValid) {
      toast.warning('Cash + M-Pesa must equal the total.');
      return;
    }
    if (splitMpesa > 0 && !mpesaRef) {
      toast.warning('Send the M-Pesa request first, or set M-Pesa to 0.');
      return;
    }
    const payments = [];
    if (splitCash > 0)
      payments.push({ method: 'Cash', amount: splitCash, reference: null });
    if (splitMpesa > 0)
      payments.push({
        method: 'M-Pesa',
        amount: splitMpesa,
        reference: mpesaRef || null,
      });
    await complete({
      method: 'Split',
      reference: mpesaRef || null,
      payments,
      useLoyalty: redeemPoints > 0,
    });
  };

  // ---------- Share receipt as PDF ----------
  const shareReceipt = async () => {
    if (!lastReceipt) return;
    let blob;
    try {
      const pdfItems = lastReceipt.items.map(i => ({
        description: i.name,
        qty: i.qty,
        unitPrice: i.price,
        total: i.qty * i.price,
      }));
      const totalsMap = {
        Subtotal: lastReceipt.subtotal,
        'VAT (16%)': lastReceipt.tax,
      };
      if (lastReceipt.discount > 0)
        totalsMap.Discount = -lastReceipt.discount;
      if (lastReceipt.loyaltyDiscount > 0)
        totalsMap['Loyalty discount'] = -lastReceipt.loyaltyDiscount;
      totalsMap.Total = lastReceipt.total;

      blob = await pdfService.generateInvoicePdf({
        documentType: 'RECEIPT',
        documentNumber: `#${lastReceipt.orderId}`,
        issuedDate: new Date(lastReceipt.time).toLocaleString('en-KE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        business,
        partyLabel: 'Customer',
        party: { name: lastReceipt.customer || 'Walk-in customer' },
        items: pdfItems,
        totals: totalsMap,
        payments: lastReceipt.payments || [],
        loyalty: lastReceipt.loyalty || null,
        cash: lastReceipt.cash || null,
        notes: business.receiptFooter || 'Thank you for shopping with us.',
        meta: [
          { label: 'Cashier', value: lastReceipt.cashier || 'Owner' },
        ],
      });
    } catch (err) {
      toast.error('Could not generate the receipt PDF.');
      return;
    }

    const filename = `receipt-${lastReceipt.orderId}.pdf`;
    const text =
      `${business.name || 'Your business'} — Receipt #${lastReceipt.orderId}\n` +
      `Total: ${formatKSh(lastReceipt.total)}\n\n` +
      `Thank you for shopping with us.`;

    const shareResult = await shareService.tryShareFile({
      blob,
      filename,
      title: `Receipt #${lastReceipt.orderId}`,
      text,
    });
    if (shareResult.ok) return;

    shareService.downloadBlob(blob, filename);

    let phone = lastReceiptPhone;
    if (!phone && lastReceipt.customerId) {
      try {
        const c = await customerService.get(lastReceipt.customerId);
        phone = c?.phone || '';
      } catch {
        phone = '';
      }
    }
    setLastReceiptPhone(phone);
    setShowWhatsApp(true);
  };

  // ---------- Loading / Empty ----------
  if (loading) {
    return (
      <div
        className="pos"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
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
          paymentStatus: lastReceipt.method === 'On credit' ? 'credit' : 'paid',
          customer: lastReceipt.customer,
          cashier: lastReceipt.cashier,
        },
        footerNote: business.receiptFooter,
      })
    : '';

  return (
    <div className="pos">
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
            onClick={() => setShowScanner(true)}
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
            <li><kbd>F2</kbd> Search</li>
            <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Grid</li>
            <li><kbd>↵</kbd> Add focused</li>
            <li><kbd>F4</kbd> Checkout</li>
            <li><kbd>F9</kbd> Clear cart</li>
            <li><kbd>F10</kbd> Hold cart</li>
          </ul>
        </div>
      </aside>

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

      {/* Checkout modal */}
      <Modal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Complete payment"
        subtitle={`Total: ${formatKSh(totalAfterLoyalty)}`}
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

          {customer && loyaltyBalance > 0 && maxRedeem.points > 0 && (
            <div className="co-loyalty">
              <div className="co-loyalty-head">
                <Sparkles size={14} />
                <div>
                  <div className="co-loyalty-title">Loyalty points</div>
                  <div className="co-loyalty-sub">
                    {customer.name} has <strong>{loyaltyBalance}</strong> points
                  </div>
                </div>
              </div>
              <label className="co-loyalty-check">
                <input
                  type="checkbox"
                  checked={redeemPoints > 0}
                  onChange={e =>
                    setRedeemPoints(e.target.checked ? maxRedeem.points : 0)
                  }
                />
                <span>
                  Redeem {maxRedeem.points} points for {formatKSh(maxRedeem.value)} off
                </span>
              </label>
            </div>
          )}

          <div className="co-mode-tabs">
            {[
              { id: 'CASH', label: 'Cash' },
              { id: 'MPESA', label: 'M-Pesa' },
              { id: 'SPLIT', label: 'Split' },
              { id: 'CREDIT', label: 'Credit' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                className={`co-mode-tab ${paymentMode === m.id ? 'on' : ''}`}
                onClick={() => {
                  if (m.id === 'CREDIT' && !customer) {
                    setShowCustomer(true);
                  } else {
                    setPaymentMode(m.id);
                  }
                }}
              >
                {m.label}
              </button>
            ))}
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
            {loyaltyDiscount > 0 && (
              <div className="row between">
                <span className="muted">Loyalty</span>
                <span className="mono">-{formatKSh(loyaltyDiscount)}</span>
              </div>
            )}
            <div className="row between total">
              <span>Total</span>
              <span className="mono">{formatKSh(totalAfterLoyalty)}</span>
            </div>
          </div>

          {paymentMode === 'CASH' && (
            <Button
              full
              size="lg"
              loading={processing}
              onClick={() => setShowCash(true)}
            >
              Enter cash amount
            </Button>
          )}

          {paymentMode === 'MPESA' && (
            <>
              <p className="co-help">
                Send an STK push to the customer's phone to collect payment via
                M-Pesa.
              </p>
              <Button full size="lg" onClick={startFullMpesa}>
                Continue to M-Pesa
              </Button>
            </>
          )}

          {paymentMode === 'SPLIT' && (
            <div className="stack gap-14">
              <p className="co-help">
                Split the total across cash and M-Pesa.
              </p>

              <div className="co-split-row">
                <div className="co-split-label">Cash</div>
                <div className="co-split-input-wrap">
                  <span className="co-split-cur">KSh</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="co-split-input mono"
                    value={cashAmount}
                    onChange={e => {
                      const v = e.target.value;
                      setCashAmount(v);
                      const cash = Number(v) || 0;
                      const rest = Math.max(0, totalAfterLoyalty - cash);
                      setMpesaAmount(rest > 0 ? String(Math.round(rest)) : '0');
                    }}
                  />
                </div>
              </div>

              <div className="co-split-row">
                <div className="co-split-label">M-Pesa</div>
                <div className="co-split-input-wrap">
                  <span className="co-split-cur">KSh</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="co-split-input mono"
                    value={mpesaAmount}
                    onChange={e => {
                      const v = e.target.value;
                      setMpesaAmount(v);
                      const mp = Number(v) || 0;
                      const rest = Math.max(0, totalAfterLoyalty - mp);
                      setCashAmount(rest > 0 ? String(Math.round(rest)) : '0');
                    }}
                  />
                </div>
              </div>

              <div className={`co-split-summary ${splitValid ? 'ok' : 'warn'}`}>
                <span>Assigned</span>
                <span className="mono">{formatKSh(splitSum)}</span>
                {splitRemaining > 0.01 && (
                  <>
                    <span className="co-split-rem-label">Remaining</span>
                    <span className="mono">{formatKSh(splitRemaining)}</span>
                  </>
                )}
              </div>

              {splitMpesa > 0 && (
                <div className="co-split-mpesa">
                  {mpesaRef ? (
                    <div className="co-split-mpesa-ok">
                      M-Pesa approved · Ref {mpesaRef}
                    </div>
                  ) : (
                    <Button variant="outline" full onClick={startSplitMpesa}>
                      Send M-Pesa request for {formatKSh(splitMpesa)}
                    </Button>
                  )}
                </div>
              )}

              <Button
                full
                size="lg"
                loading={processing}
                disabled={!splitValid || (splitMpesa > 0 && !mpesaRef)}
                onClick={confirmSplit}
              >
                Complete sale
              </Button>
            </div>
          )}

          {paymentMode === 'CREDIT' && customer && (
            <>
              <div className="co-credit-note">
                <strong>{customer.name}</strong> will owe{' '}
                {formatKSh(totalAfterLoyalty)} after this sale.
              </div>
              <Button
                full
                size="lg"
                loading={processing}
                onClick={() =>
                  complete({
                    method: 'On credit',
                    useLoyalty: redeemPoints > 0,
                  })
                }
              >
                Record credit sale
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Cash modal */}
      <CashPaymentModal
        open={showCash}
        total={totalAfterLoyalty}
        busy={processing}
        onClose={() => setShowCash(false)}
        onConfirm={({ tendered, change }) => {
          complete({
            method: 'Cash',
            cash: { tendered, change },
            useLoyalty: redeemPoints > 0,
          });
        }}
      />

      {/* M-Pesa modals */}
      <MpesaModal
        open={showMpesa}
        onClose={() => setShowMpesa(false)}
        amount={totalAfterLoyalty}
        onSuccess={handleMpesaSuccess}
      />
      <MpesaModal
        open={mpesaOpen}
        onClose={() => setMpesaOpen(false)}
        amount={splitMpesa}
        onSuccess={handleMpesaSuccess}
      />

      {/* Hold modal */}
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

      {/* Receipt modal */}
      <Modal
        open={!!lastReceipt}
        onClose={() => setLastReceipt(null)}
        title="Sale completed"
        subtitle={lastReceipt ? `Order #${lastReceipt.orderId}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
            <Button
              variant="outline"
              leftIcon={<WhatsAppIcon size={14} />}
              onClick={shareReceipt}
            >
              Share PDF
            </Button>
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
              {lastReceipt.customer && lastReceipt.customer !== 'Walk-in' && (
                <div className="receipt-meta">Customer: {lastReceipt.customer}</div>
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

            {lastReceipt.payments && lastReceipt.payments.length > 0 && (
              <div className="receipt-payments">
                {lastReceipt.payments.map((p, idx) => (
                  <div key={idx} className="receipt-payment-row">
                    <span>
                      {p.method === 'On credit' ? 'On credit' : p.method}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </span>
                    <span className="mono">{formatKSh(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {lastReceipt.loyaltyDiscount > 0 && (
              <div className="receipt-payments">
                <div className="receipt-payment-row">
                  <span>Loyalty discount</span>
                  <span className="mono">-{formatKSh(lastReceipt.loyaltyDiscount)}</span>
                </div>
              </div>
            )}

            <div className="receipt-total">
              <span>Total</span>
              <span className="mono">{formatKSh(lastReceipt.total)}</span>
            </div>

            {lastReceipt.cash && lastReceipt.cash.tendered !== undefined && (
              <div className="receipt-payments">
                <div className="receipt-payment-row">
                  <span>Cash received</span>
                  <span className="mono">{formatKSh(lastReceipt.cash.tendered)}</span>
                </div>
                <div className="receipt-payment-row">
                  <span>Change</span>
                  <span className="mono">{formatKSh(lastReceipt.cash.change)}</span>
                </div>
              </div>
            )}

            {lastReceipt.loyalty && (
              <div className="receipt-loyalty">
                {lastReceipt.loyalty.pointsEarned > 0 && (
                  <div className="receipt-payment-row">
                    <span>Points earned</span>
                    <span className="mono">+{lastReceipt.loyalty.pointsEarned}</span>
                  </div>
                )}
                {lastReceipt.loyalty.pointsRedeemed > 0 && (
                  <div className="receipt-payment-row">
                    <span>Points redeemed</span>
                    <span className="mono">-{lastReceipt.loyalty.pointsRedeemed}</span>
                  </div>
                )}
                <div className="receipt-payment-row">
                  <span>Points balance</span>
                  <span className="mono">{lastReceipt.loyalty.balance}</span>
                </div>
              </div>
            )}

            {business.receiptFooter && (
              <div className="receipt-pay">{business.receiptFooter}</div>
            )}
          </div>
        )}
      </Modal>

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
          title="Send receipt text on WhatsApp"
        />
      )}

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

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan products"
        subtitle="Point the camera at barcodes"
        multiScan
        manualLabel="Type the code instead"
        onManualEntry={handleBarcodeScan}
      />

      <style>{`
        .pos-search-row { display: flex; gap: 8px; align-items: stretch; }
        .pos-search-row > .field { flex: 1; min-width: 0; }
        .pos-scan-btn {
          width: 42px; height: 42px; flex-shrink: 0;
          border-radius: 12px; background: var(--primary); color: #fff;
          border: 0; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 160ms ease, transform 160ms ease;
          box-shadow: 0 6px 18px rgba(109, 94, 252, 0.28);
        }
        .pos-scan-btn:hover { background: var(--primary-600); }
        .pos-scan-btn:active { transform: scale(0.96); }

        .co-mode-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          padding: 4px;
          background: var(--bg-soft);
          border-radius: 12px;
        }
        .co-mode-tab {
          padding: 9px 8px;
          border-radius: 9px;
          border: 0;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 160ms ease;
        }
        .co-mode-tab.on {
          background: #fff;
          color: var(--text);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .co-mode-tab:hover:not(.on) { color: var(--text); }

        .co-help {
          margin: 0;
          color: var(--text-muted);
          font-size: 12.5px;
          line-height: 1.55;
        }

        .co-loyalty {
          background: var(--primary-50);
          border: 1px solid var(--primary-100);
          border-radius: 12px;
          padding: 12px 14px;
        }
        .co-loyalty-head {
          display: flex; gap: 10px; align-items: flex-start;
          color: var(--primary);
        }
        .co-loyalty-title {
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--primary-700);
        }
        .co-loyalty-sub {
          font-size: 12.5px; color: var(--text); margin-top: 4px;
        }
        .co-loyalty-check {
          display: flex; align-items: center; gap: 10px;
          margin-top: 10px;
          font-size: 13px; color: var(--text);
          cursor: pointer;
        }
        .co-loyalty-check input {
          width: 16px; height: 16px;
          accent-color: var(--primary);
        }

        .co-split-row {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 10px;
          align-items: center;
        }
        .co-split-label {
          font-size: 13px; font-weight: 600; color: var(--text);
        }
        .co-split-input-wrap {
          display: flex; align-items: center; gap: 6px;
          padding: 0 12px;
          border: 1px solid var(--border-strong);
          border-radius: 10px;
          background: #fff;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .co-split-input-wrap:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-50);
        }
        .co-split-cur {
          font-size: 12px; color: var(--text-faint); font-weight: 600;
        }
        .co-split-input {
          flex: 1; min-width: 0;
          border: 0; background: transparent;
          padding: 10px 0;
          font-size: 15px; font-weight: 600;
          text-align: right; outline: none;
          color: var(--text);
        }

        .co-split-summary {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600;
        }
        .co-split-summary.ok { background: var(--success-bg); color: #15803d; }
        .co-split-summary.warn { background: var(--warning-bg); color: #92400e; }
        .co-split-summary > span:nth-child(2) { margin-left: auto; }
        .co-split-rem-label { font-weight: 500; }
        .co-split-mpesa-ok {
          padding: 10px 14px;
          background: var(--success-bg);
          color: #15803d;
          border-radius: 10px;
          font-size: 12.5px; font-weight: 600;
          text-align: center;
        }

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
        .receipt-payments {
          margin-top: 10px; padding-top: 10px;
          border-top: 1px dashed var(--border-strong);
          display: flex; flex-direction: column; gap: 5px; font-size: 12px;
        }
        .receipt-payment-row {
          display: flex; justify-content: space-between; color: var(--text-muted);
        }
        .receipt-loyalty {
          margin-top: 10px; padding-top: 10px;
          border-top: 1px dashed var(--border-strong);
          display: flex; flex-direction: column; gap: 5px;
          font-size: 12px; color: var(--primary-700);
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
          border-radius: 12px; background: #fff;
          border: 1px dashed var(--border-strong);
          color: var(--text-muted); font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all var(--dur);
        }
        .pos-customer:hover { border-color: var(--primary); color: var(--primary); }
        .pos-customer.on {
          border-style: solid; border-color: var(--primary);
          background: var(--primary-50); color: var(--primary-700);
        }
        .pos-customer-name {
          flex: 1; min-width: 0; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; text-align: left;
        }
      `}</style>
    </div>
  );
}