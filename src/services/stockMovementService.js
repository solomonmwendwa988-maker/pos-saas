import { storage, wait, makeId } from './storage';

const KEY = 'stockMovements';
const MAX = 3000;

class StockMovementService {
  async listByProduct(productId) {
    await wait(80);
    return storage
      .read(KEY, [])
      .filter(m => m.productId === productId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async listAll() {
    await wait(100);
    return storage.read(KEY, []).sort((a, b) => b.createdAt - a.createdAt);
  }

  async log({ productId, type, qty, balance, reference, note }) {
    const rows = storage.read(KEY, []);
    const movement = {
      id: makeId('sm'),
      productId,
      type, // 'sale' | 'purchase' | 'adjustment' | 'return' | 'writeoff'
      qty, // signed: negative for out, positive for in
      balance,
      reference: reference || '',
      note: note || '',
      createdAt: Date.now(),
    };
    rows.unshift(movement);
    if (rows.length > MAX) rows.length = MAX;
    storage.write(KEY, rows);
    return movement;
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const stockMovementService = new StockMovementService();