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

  async create({
    items,
    subtotal,
    tax,
    discount,
    total,
    method,
    reference,
    customerId,
    customerName,
    cashier,
    shiftId,
  }) {
    await wait(300);

    const { productService } = await import('./productService');
    const { customerService } = await import('./customerService');

    const orders = storage.read(KEY, []);
    const nextNumber =
      orders.length === 0
        ? 1001
        : Math.max(...orders.map(o => Number(o.id) || 1000)) + 1;

    await productService.adjustStock(
      items.map(i => ({ id: i.id, qty: i.qty })),
      -1,
      { type: 'sale', reference: `#${nextNumber}` }
    );

    if (customerId) {
      await customerService.recordPurchase(customerId, total);
    }

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
      method,
      reference: reference || null,
      status: 'COMPLETED',
      cashier: cashier || 'Owner',
      shiftId: shiftId || null,
    };

    orders.unshift(order);
    storage.write(KEY, orders);
    eventBus.emit(EVENTS.SALE_COMPLETED, order);
    return order;
  }

  async refund(id) {
    await wait(300);
    const { productService } = await import('./productService');
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

  async summary() {
    await wait(80);
    const orders = storage.read(KEY, []);
    const completed = orders.filter(o => o.status === 'COMPLETED');
    const revenue = completed.reduce((s, o) => s + o.total, 0);
    const refunded = orders
      .filter(o => o.status === 'REFUNDED')
      .reduce((s, o) => s + o.total, 0);
    return {
      revenue,
      count: orders.length,
      avgOrder: completed.length ? Math.round(revenue / completed.length) : 0,
      refunded,
    };
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const salesService = new SalesService();