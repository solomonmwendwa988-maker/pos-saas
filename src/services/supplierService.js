import { storage, wait, makeId } from './storage';

const KEY = 'suppliers';

class SupplierService {
  async list(search = '') {
    await wait(150);
    const items = storage.read(KEY, []);
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contact.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  }

  async create(payload) {
    await wait(250);
    const items = storage.read(KEY, []);
    const supplier = {
      id: makeId('sp'),
      name: payload.name.trim(),
      contact: payload.contact.trim(),
      phone: payload.phone.trim(),
      email: payload.email?.trim() || '',
      products: 0,
      balance: 0,
      status: payload.status || 'active',
      createdAt: Date.now(),
    };
    items.unshift(supplier);
    storage.write(KEY, items);
    return supplier;
  }

  async update(id, patch) {
    await wait(250);
    const items = storage.read(KEY, []).map(s => (s.id === id ? { ...s, ...patch } : s));
    storage.write(KEY, items);
    return items.find(s => s.id === id);
  }

  async remove(id) {
    await wait(200);
    const items = storage.read(KEY, []).filter(s => s.id !== id);
    storage.write(KEY, items);
    return { id };
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const supplierService = new SupplierService();