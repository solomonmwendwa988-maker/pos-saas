import { storage, wait, makeId } from './storage';
import { eventBus, EVENTS } from './eventBus';

const KEY = 'purchases';
const PAY_KEY = 'supplierPayments';

class PurchaseService {
  async list(filters = {}) {
    await wait(120);
    let rows = storage.read(KEY, []);
    if (filters.status && filters.status !== 'all') {
      rows = rows.filter(p => p.status === filters.status);
    }
    if (filters.supplierId) {
      rows = rows.filter(p => p.supplierId === filters.supplierId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        p =>
          p.number.toLowerCase().includes(q) ||
          (p.supplierName || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }

  async get(id) {
    await wait(80);
    return storage.read(KEY, []).find(p => p.id === id) || null;
  }

  async create({ supplierId, supplierName, items, notes, expectedAt }) {
    await wait(200);
    const rows = storage.read(KEY, []);

    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const last = rows[0]?.number;
    let seq = 1;
    if (last && last.startsWith(prefix)) {
      seq = parseInt(last.replace(prefix, ''), 10) + 1;
    }
    const number = `${prefix}${String(seq).padStart(4, '0')}`;

    const normalizedItems = items.map(i => ({
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      qty: Number(i.qty) || 0,
      buyingPrice: Number(i.buyingPrice) || 0,
      received: 0,
    }));

    const subtotal = normalizedItems.reduce(
      (s, i) => s + i.qty * i.buyingPrice,
      0
    );

    const po = {
      id: makeId('po'),
      number,
      supplierId,
      supplierName,
      items: normalizedItems,
      subtotal,
      total: subtotal,
      status: 'draft',
      notes: (notes || '').trim(),
      expectedAt: expectedAt || null,
      createdAt: Date.now(),
      orderedAt: null,
      receivedAt: null,
      cancelledAt: null,
    };

    rows.unshift(po);
    storage.write(KEY, rows);
    eventBus.emit(EVENTS.PO_CREATED, po);
    return po;
  }

  async markOrdered(id) {
    await wait(150);
    const rows = storage.read(KEY, []);
    const next = rows.map(p =>
      p.id === id && p.status === 'draft'
        ? { ...p, status: 'ordered', orderedAt: Date.now() }
        : p
    );
    storage.write(KEY, next);
    const updated = next.find(p => p.id === id);
    eventBus.emit(EVENTS.PO_UPDATED, updated);
    return updated;
  }

  async receive(id, { lines, note }) {
    await wait(300);
    const { productService } = await import('./productService');

    const rows = storage.read(KEY, []);
    const po = rows.find(p => p.id === id);
    if (!po) throw new Error('Purchase order not found.');
    if (po.status === 'cancelled') {
      throw new Error('Cannot receive a cancelled order.');
    }
    if (po.status === 'received') {
      throw new Error('This order has already been fully received.');
    }

    const updatedItems = po.items.map(item => {
      const match = lines.find(l => l.productId === item.productId);
      if (!match) return item;
      const remaining = item.qty - item.received;
      const addQty = Math.max(0, Math.min(Number(match.qty) || 0, remaining));
      return { ...item, received: item.received + addQty };
    });

    for (const line of lines) {
      const item = po.items.find(i => i.productId === line.productId);
      if (!item) continue;
      const remaining = item.qty - item.received;
      const addQty = Math.max(0, Math.min(Number(line.qty) || 0, remaining));
      if (addQty <= 0) continue;

      await productService.adjustStock(
        [{ id: item.productId, qty: addQty }],
        1,
        {
          type: 'purchase',
          reference: po.number,
          note: (note || '').trim(),
        }
      );

      await productService.update(item.productId, {
        buyingPrice: item.buyingPrice,
      });
    }

    const fullyReceived = updatedItems.every(i => i.received >= i.qty);
    const anyReceived = updatedItems.some(i => i.received > 0);
    const status = fullyReceived
      ? 'received'
      : anyReceived
      ? 'partial'
      : po.status;

    const next = rows.map(p =>
      p.id === id
        ? {
            ...p,
            items: updatedItems,
            status,
            orderedAt: p.orderedAt || Date.now(),
            receivedAt: fullyReceived ? Date.now() : p.receivedAt,
          }
        : p
    );

    storage.write(KEY, next);
    const updated = next.find(p => p.id === id);
    eventBus.emit(EVENTS.PO_UPDATED, updated);
    eventBus.emit(EVENTS.STOCK_CHANGED, { reference: po.number });
    return updated;
  }

  async cancel(id) {
    await wait(150);
    const rows = storage.read(KEY, []);
    const next = rows.map(p =>
      p.id === id && (p.status === 'draft' || p.status === 'ordered')
        ? { ...p, status: 'cancelled', cancelledAt: Date.now() }
        : p
    );
    storage.write(KEY, next);
    const updated = next.find(p => p.id === id);
    eventBus.emit(EVENTS.PO_UPDATED, updated);
    return updated;
  }

  // ---------- Supplier payments ----------

  async listSupplierPayments(supplierId) {
    await wait(80);
    return storage
      .read(PAY_KEY, [])
      .filter(p => !supplierId || p.supplierId === supplierId);
  }

  async recordSupplierPayment({
    supplierId,
    supplierName,
    amount,
    method,
    reference,
    note,
  }) {
    await wait(200);
    const rows = storage.read(PAY_KEY, []);
    const payment = {
      id: makeId('spay'),
      supplierId,
      supplierName,
      amount: Number(amount) || 0,
      method: method || 'cash',
      reference: (reference || '').trim(),
      note: (note || '').trim(),
      createdAt: Date.now(),
    };
    rows.unshift(payment);
    storage.write(PAY_KEY, rows);
    eventBus.emit(EVENTS.SUPPLIER_PAYMENT, payment);
    return payment;
  }

  // ---------- Balances ----------

  supplierBalance(supplierId) {
    const purchases = storage
      .read(KEY, [])
      .filter(
        p =>
          p.supplierId === supplierId &&
          p.status !== 'cancelled' &&
          p.status !== 'draft'
      );
    const owed = purchases.reduce(
      (sum, p) =>
        sum +
        p.items.reduce((s, i) => s + (i.received || 0) * i.buyingPrice, 0),
      0
    );
    const paid = storage
      .read(PAY_KEY, [])
      .filter(p => p.supplierId === supplierId)
      .reduce((s, p) => s + p.amount, 0);
    return Math.max(0, owed - paid);
  }

  allSupplierBalances() {
    const purchases = storage
      .read(KEY, [])
      .filter(p => p.status !== 'cancelled' && p.status !== 'draft');
    const payments = storage.read(PAY_KEY, []);
    const map = new Map();
    purchases.forEach(p => {
      const owed = p.items.reduce(
        (s, i) => s + (i.received || 0) * i.buyingPrice,
        0
      );
      map.set(p.supplierId, (map.get(p.supplierId) || 0) + owed);
    });
    payments.forEach(p => {
      map.set(p.supplierId, (map.get(p.supplierId) || 0) - p.amount);
    });
    const result = {};
    map.forEach((v, k) => {
      result[k] = Math.max(0, v);
    });
    return result;
  }

  async summary() {
    await wait(80);
    const rows = storage.read(KEY, []);
    const open = rows.filter(
      p => p.status === 'draft' || p.status === 'ordered' || p.status === 'partial'
    );
    const payable = rows.reduce((sum, p) => {
      if (p.status === 'cancelled' || p.status === 'draft') return sum;
      return (
        sum +
        p.items.reduce((s, i) => s + (i.received || 0) * i.buyingPrice, 0)
      );
    }, 0);
    const paid = storage
      .read(PAY_KEY, [])
      .reduce((s, p) => s + p.amount, 0);
    return {
      total: rows.length,
      open: open.length,
      received: rows.filter(p => p.status === 'received').length,
      payable,
      paid,
      outstanding: Math.max(0, payable - paid),
    };
  }

  async reset() {
    storage.remove(KEY);
    storage.remove(PAY_KEY);
  }
}

export const purchaseService = new PurchaseService();