import { storage, wait, makeId } from './storage';

const KEY = 'customers';

class CustomerService {
  async list(search = '') {
    await wait(150);
    const items = storage.read(KEY, []);
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }

  async get(id) {
    await wait(150);
    const customer = storage.read(KEY, []).find(c => c.id === id);
    if (!customer) return null;
    // Pull order history from salesService lazily to avoid a cycle.
    const { salesService } = await import('./salesService');
    const history = await salesService.list({ customerId: id });
    return { ...customer, history };
  }

  async create(payload) {
    await wait(250);
    const items = storage.read(KEY, []);
    const customer = {
      id: makeId('cu'),
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: payload.email?.trim() || '',
      spent: 0,
      orders: 0,
      last: null,
      createdAt: Date.now(),
    };
    items.unshift(customer);
    storage.write(KEY, items);
    return customer;
  }

  async update(id, patch) {
    await wait(250);
    const items = storage.read(KEY, []).map(c => (c.id === id ? { ...c, ...patch } : c));
    storage.write(KEY, items);
    return items.find(c => c.id === id);
  }

  async remove(id) {
    await wait(200);
    const items = storage.read(KEY, []).filter(c => c.id !== id);
    storage.write(KEY, items);
    return { id };
  }

  /**
   * Called internally by salesService when an order completes.
   */
  async recordPurchase(customerId, amount, when = new Date().toISOString()) {
    const items = storage.read(KEY, []);
    const next = items.map(c =>
      c.id === customerId
        ? {
            ...c,
            spent: (c.spent || 0) + Number(amount),
            orders: (c.orders || 0) + 1,
            last: when.slice(0, 10),
          }
        : c
    );
    storage.write(KEY, next);
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const customerService = new CustomerService();