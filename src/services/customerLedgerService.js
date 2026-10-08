import { storage, wait, makeId } from './storage';
import { eventBus, EVENTS } from './eventBus';

const KEY = 'customerLedger';

class CustomerLedgerService {
  // ---------- Reads ----------

  all() {
    return storage.read(KEY, []);
  }

  forCustomer(customerId) {
    return this.all()
      .filter(e => e.customerId === customerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Returns the running balance for a customer — positive means the
   * customer owes money, negative means the business owes the customer.
   */
  balanceFor(customerId) {
    return this.all()
      .filter(e => e.customerId === customerId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Returns a map of { customerId: balance } for every customer that has
   * any ledger activity at all. Zero balances are excluded.
   */
  allBalances() {
    const map = new Map();
    for (const entry of this.all()) {
      map.set(entry.customerId, (map.get(entry.customerId) || 0) + entry.amount);
    }
    const out = {};
    map.forEach((v, k) => {
      if (Math.abs(v) > 0.01) out[k] = v;
    });
    return out;
  }

  /**
   * Recomputes the `balance` field on every entry of a customer, in
   * chronological order. Call after any mutation to keep the running
   * balance accurate on all rows.
   */
  _reindexCustomer(customerId) {
    const all = this.all();
    const mine = all
      .filter(e => e.customerId === customerId)
      .sort((a, b) => a.createdAt - b.createdAt);

    let running = 0;
    const indexed = mine.map(e => {
      running += e.amount;
      return { ...e, balance: running };
    });

    const byId = new Map(indexed.map(e => [e.id, e]));
    const next = all.map(e => byId.get(e.id) || e);
    storage.write(KEY, next);
  }

  // ---------- Writes ----------

  async recordCreditSale({ customerId, amount, reference, orderId, note, createdBy }) {
    await wait(80);
    const entry = {
      id: makeId('led'),
      customerId,
      type: 'credit_sale',
      amount: Number(amount) || 0,
      balance: 0,
      reference: reference || '',
      orderId: orderId || null,
      note: (note || '').trim(),
      method: null,
      createdAt: Date.now(),
      createdBy: createdBy || 'Owner',
    };
    const all = this.all();
    all.push(entry);
    storage.write(KEY, all);
    this._reindexCustomer(customerId);
    eventBus.emit(EVENTS.CUSTOMER_LEDGER_CHANGED, { customerId });
    return entry;
  }

  async recordPayment({
    customerId,
    amount,
    method,
    reference,
    note,
    createdBy,
  }) {
    await wait(100);
    const n = Number(amount) || 0;
    if (n <= 0) throw new Error('Payment amount must be greater than zero.');
    const entry = {
      id: makeId('led'),
      customerId,
      type: 'payment',
      amount: -n,
      balance: 0,
      reference: reference || '',
      orderId: null,
      note: (note || '').trim(),
      method: method || 'cash',
      createdAt: Date.now(),
      createdBy: createdBy || 'Owner',
    };
    const all = this.all();
    all.push(entry);
    storage.write(KEY, all);
    this._reindexCustomer(customerId);
    eventBus.emit(EVENTS.CUSTOMER_PAYMENT, entry);
    eventBus.emit(EVENTS.CUSTOMER_LEDGER_CHANGED, { customerId });
    return entry;
  }

  async recordOpeningBalance({ customerId, amount, note, createdBy }) {
    await wait(80);
    const entry = {
      id: makeId('led'),
      customerId,
      type: 'opening',
      amount: Number(amount) || 0,
      balance: 0,
      reference: 'Opening balance',
      orderId: null,
      note: (note || '').trim(),
      method: null,
      createdAt: Date.now(),
      createdBy: createdBy || 'Owner',
    };
    const all = this.all();
    all.push(entry);
    storage.write(KEY, all);
    this._reindexCustomer(customerId);
    eventBus.emit(EVENTS.CUSTOMER_LEDGER_CHANGED, { customerId });
    return entry;
  }

  async recordAdjustment({ customerId, amount, note, createdBy }) {
    await wait(80);
    const entry = {
      id: makeId('led'),
      customerId,
      type: 'adjustment',
      amount: Number(amount) || 0,
      balance: 0,
      reference: 'Adjustment',
      orderId: null,
      note: (note || '').trim(),
      method: null,
      createdAt: Date.now(),
      createdBy: createdBy || 'Owner',
    };
    const all = this.all();
    all.push(entry);
    storage.write(KEY, all);
    this._reindexCustomer(customerId);
    eventBus.emit(EVENTS.CUSTOMER_LEDGER_CHANGED, { customerId });
    return entry;
  }

  /** Reverses a credit sale — used when a credit-sale order is refunded. */
  async reverseCreditSale({ orderId, customerId, createdBy }) {
    await wait(80);
    const all = this.all();
    const sale = all.find(
      e => e.type === 'credit_sale' && e.orderId === orderId && e.customerId === customerId
    );
    if (!sale) return null;

    const entry = {
      id: makeId('led'),
      customerId,
      type: 'adjustment',
      amount: -sale.amount,
      balance: 0,
      reference: `Reversal of order #${orderId}`,
      orderId,
      note: 'Credit sale reversed',
      method: null,
      createdAt: Date.now(),
      createdBy: createdBy || 'Owner',
    };
    all.push(entry);
    storage.write(KEY, all);
    this._reindexCustomer(customerId);
    eventBus.emit(EVENTS.CUSTOMER_LEDGER_CHANGED, { customerId });
    return entry;
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const customerLedgerService = new CustomerLedgerService();