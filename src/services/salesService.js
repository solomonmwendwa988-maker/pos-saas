import { storage, wait } from './storage';
import { eventBus, EVENTS } from './eventBus';

const KEY = 'orders';

class SalesService {
  async list(filters = {}) {
    await wait(120);
    let rows = storage.read(KEY, []);
    if (filters.status && filters.status !== 'all') {
      rows = rows.filter(o => o.status === filters.status);
    }
    if (filters.method && filters.method !== 'all') {
      rows = rows.filter(o => o.method === filters.method);
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      rows = rows.filter(
        o => (o.paymentStatus || 'paid') === filters.paymentStatus
      );
    }
    if (filters.customerId) {
      rows = rows.filter(o => o.customerId === filters.customerId);
    }
    if (filters.shiftId) {
      rows = rows.filter(o => o.shiftId === filters.shiftId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        o =>
          o.id.toLowerCase().includes(q) ||
          (o.customer || '').toLowerCase().includes(q) ||
          (o.reference || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }

  async get(id) {
    await wait(80);
    return storage.read(KEY, []).find(o => o.id === id) || null;
  }

  /**
   * Complete a sale.
   *
   * Supports:
   *  - Single-method sales (Cash, M-Pesa, On credit)
   *  - Split payments (any combination of Cash + M-Pesa) via the
   *    optional `payments` array
   *
   * When `payments` is provided, it must sum to `total` (within 1 cent).
   * The order records both `method` (a human label — "Split" or the
   * single method) and `payments` (the actual breakdown).
   */
  async create({
    items,
    subtotal,
    tax,
    discount,
    total,
    method,
    reference,
    payments,
    customerId,
    customerName,
    cashier,
    shiftId,
  }) {
    await wait(300);

    const { productService } = await import('./productService');
    const { customerService } = await import('./customerService');
    const { customerLedgerService } = await import('./customerLedgerService');

    const onCredit = method === 'On credit';
    if (onCredit && !customerId) {
      throw new Error('Select a customer to sell on credit.');
    }

    // Normalize payments: either from the explicit array or a single payment.
    const paymentList =
      Array.isArray(payments) && payments.length > 0
        ? payments
        : [
            {
              method: onCredit ? 'On credit' : method,
              amount: total,
              reference: reference || null,
            },
          ];

    // Validate: sum of payments must match the total
    const paymentTotal = paymentList.reduce(
      (s, p) => s + (Number(p.amount) || 0),
      0
    );
    if (Math.abs(paymentTotal - total) > 0.01) {
      throw new Error(
        `Payment amounts (KSh ${paymentTotal.toLocaleString()}) do not match the total (KSh ${total.toLocaleString()}).`
      );
    }

    const orders = storage.read(KEY, []);
    const nextNumber =
      orders.length === 0
        ? 1001
        : Math.max(...orders.map(o => Number(o.id) || 1000)) + 1;

    // Decrement stock and log the movement
    await productService.adjustStock(
      items.map(i => ({ id: i.id, qty: i.qty })),
      -1,
      { type: 'sale', reference: `#${nextNumber}` }
    );

    if (customerId) {
      await customerService.recordPurchase(customerId, total);
    }

    // Human-readable label for the order row and receipts
    const methodLabel =
      paymentList.length > 1 ? 'Split' : paymentList[0]?.method || method || 'Cash';

    const order = {
      id: String(nextNumber),
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdAt: Date.now(),
      customer: customerName || 'Walk-in',
      customerId: customerId || null,
      items: items.reduce((s, i) => s + i.qty, 0),
      itemsList: items.map(i => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
      tax,
      discount: discount || 0,
      total,
      method: methodLabel,
      payments: paymentList.map(p => ({
        method: p.method,
        amount: Number(p.amount) || 0,
        reference: p.reference || null,
      })),
      reference: reference || null,
      paymentStatus: onCredit ? 'credit' : 'paid',
      status: 'COMPLETED',
      cashier: cashier || 'Owner',
      shiftId: shiftId || null,
    };

    orders.unshift(order);
    storage.write(KEY, orders);

    // If the whole sale is on credit, create a matching ledger entry
    if (onCredit && customerId) {
      await customerLedgerService.recordCreditSale({
        customerId,
        amount: total,
        reference: `#${order.id}`,
        orderId: order.id,
        createdBy: order.cashier,
      });
    }

    eventBus.emit(EVENTS.SALE_COMPLETED, order);
    return order;
  }

  async refund(id) {
    await wait(300);
    const { productService } = await import('./productService');
    const { customerLedgerService } = await import('./customerLedgerService');

    const orders = storage.read(KEY, []);
    const order = orders.find(o => o.id === id);
    if (!order) throw new Error('Order not found.');

    await productService.adjustStock(
      (order.itemsList || [])
        .filter(i => i.id)
        .map(i => ({ id: i.id, qty: i.qty })),
      +1,
      { type: 'return', reference: `#${id} refund` }
    );

    // Reverse the credit entry if it was a credit sale
    if (order.paymentStatus === 'credit' && order.customerId) {
      await customerLedgerService.reverseCreditSale({
        orderId: order.id,
        customerId: order.customerId,
      });
    }

    const next = orders.map(o =>
      o.id === id
        ? { ...o, status: 'REFUNDED', refundedAt: Date.now() }
        : o
    );
    storage.write(KEY, next);

    const updated = next.find(o => o.id === id);
    eventBus.emit(EVENTS.SALE_REFUNDED, updated);
    return updated;
  }

  /** Marks a credit sale as paid. Does NOT create a ledger entry —
   *  payments are always recorded through customerLedgerService. */
  async markPaid(id) {
    await wait(80);
    const orders = storage.read(KEY, []);
    const next = orders.map(o =>
      o.id === id ? { ...o, paymentStatus: 'paid' } : o
    );
    storage.write(KEY, next);
    return next.find(o => o.id === id);
  }

  async summary() {
    await wait(80);
    const orders = storage.read(KEY, []);
    const completed = orders.filter(o => o.status === 'COMPLETED');
    const revenue = completed.reduce((s, o) => s + o.total, 0);
    const creditSales = completed
      .filter(o => o.paymentStatus === 'credit')
      .reduce((s, o) => s + o.total, 0);
    const refunded = orders
      .filter(o => o.status === 'REFUNDED')
      .reduce((s, o) => s + o.total, 0);
    return {
      revenue,
      count: orders.length,
      avgOrder: completed.length ? Math.round(revenue / completed.length) : 0,
      refunded,
      creditSales,
    };
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const salesService = new SalesService();