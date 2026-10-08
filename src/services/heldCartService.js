import { storage, wait, makeId } from './storage';

const KEY = 'heldCarts';

class HeldCartService {
  async list() {
    await wait(60);
    return storage.read(KEY, []);
  }

  async hold({ items, customerId, customerName, label, cashier }) {
    await wait(120);
    const carts = storage.read(KEY, []);
    const cart = {
      id: makeId('hold'),
      label: (label || '').trim() || `Cart ${carts.length + 1}`,
      items: items.map(i => ({ ...i })),
      customerId: customerId || null,
      customerName: customerName || null,
      cashier: cashier || null,
      heldAt: new Date().toISOString(),
      itemCount: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    };
    carts.unshift(cart);
    storage.write(KEY, carts);
    return cart;
  }

  async recall(id) {
    await wait(120);
    const carts = storage.read(KEY, []);
    const found = carts.find(c => c.id === id);
    if (!found) return null;
    storage.write(KEY, carts.filter(c => c.id !== id));
    return found;
  }

  async remove(id) {
    await wait(80);
    const carts = storage.read(KEY, []).filter(c => c.id !== id);
    storage.write(KEY, carts);
    return { id };
  }

  async clear() {
    storage.remove(KEY);
  }
}

export const heldCartService = new HeldCartService();