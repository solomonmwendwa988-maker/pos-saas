import { storage, wait, makeId } from './storage';
import { eventBus, EVENTS } from './eventBus';

const KEY = 'products';

class ProductService {
  async list() {
    await wait(120);
    return storage.read(KEY, []);
  }

  async get(id) {
    await wait(80);
    return storage.read(KEY, []).find(p => p.id === id) || null;
  }

  async create(payload) {
    await wait(200);
    const items = storage.read(KEY, []);
    const product = {
      id: makeId('p'),
      name: payload.name.trim(),
      sku: payload.sku.trim().toUpperCase(),
      barcode: payload.barcode?.trim() || '',
      category: payload.category || 'Uncategorised',
      buyingPrice: Number(payload.buyingPrice) || 0,
      price: Number(payload.price) || 0,
      stock: Number(payload.stock) || 0,
      threshold: Number(payload.threshold) || 0,
      supplier: payload.supplier?.trim() || '',
      status: payload.status || 'active',
      createdAt: Date.now(),
    };
    items.unshift(product);
    storage.write(KEY, items);
    eventBus.emit(EVENTS.PRODUCTS_CHANGED);
    return product;
  }

  async update(id, patch) {
    await wait(180);
    const items = storage.read(KEY, []);
    const next = items.map(p =>
      p.id === id
        ? {
            ...p,
            ...patch,
            buyingPrice:
              patch.buyingPrice !== undefined
                ? Number(patch.buyingPrice)
                : p.buyingPrice,
            price: patch.price !== undefined ? Number(patch.price) : p.price,
            stock: patch.stock !== undefined ? Number(patch.stock) : p.stock,
            threshold:
              patch.threshold !== undefined
                ? Number(patch.threshold)
                : p.threshold,
          }
        : p
    );
    storage.write(KEY, next);
    eventBus.emit(EVENTS.PRODUCTS_CHANGED);
    return next.find(p => p.id === id);
  }

  async remove(id) {
    await wait(180);
    const items = storage.read(KEY, []).filter(p => p.id !== id);
    storage.write(KEY, items);
    eventBus.emit(EVENTS.PRODUCTS_CHANGED);
    return { id };
  }

  /**
   * Adjust stock for one or more products.
   * @param items [{ id, qty }]
   * @param direction -1 (out) or +1 (in)
   * @param meta { type, reference, note } — if provided, movements are logged
   */
  async adjustStock(items, direction = -1, meta = {}) {
    await wait(80);
    const products = storage.read(KEY, []);
    const map = new Map(products.map(p => [p.id, p]));
    const movements = [];

    items.forEach(({ id, qty }) => {
      const p = map.get(id);
      if (!p) return;
      const delta = direction * Math.abs(Number(qty) || 0);
      p.stock = Math.max(0, p.stock + delta);
      movements.push({ productId: id, qty: delta, balance: p.stock });
    });

    storage.write(KEY, Array.from(map.values()));

    if (meta.type) {
      const { stockMovementService } = await import('./stockMovementService');
      for (const m of movements) {
        await stockMovementService.log({
          productId: m.productId,
          type: meta.type,
          qty: m.qty,
          balance: m.balance,
          reference: meta.reference || '',
          note: meta.note || '',
        });
      }
    }

    eventBus.emit(EVENTS.PRODUCTS_CHANGED);
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const productService = new ProductService();