import { storage, wait } from './storage';

const KEY = 'loyalty';

/** 1 point per KSh 100 spent. */
const EARN_RATE = 100;
/** 100 points = KSh 50 discount. */
const REDEEM_RATE = 100;
const REDEEM_VALUE = 50;

function makeId() {
  return 'lo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

class LoyaltyService {
  all() {
    return storage.read(KEY, []);
  }

  balance(customerId) {
    if (!customerId) return 0;
    return this.all()
      .filter(e => e.customerId === customerId)
      .reduce((s, e) => s + (Number(e.points) || 0), 0);
  }

  history(customerId) {
    return this.all()
      .filter(e => e.customerId === customerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  pointsForAmount(amount) {
    return Math.floor((Number(amount) || 0) / EARN_RATE);
  }

  pointsToValue(points) {
    const p = Math.max(0, Math.floor(Number(points) || 0));
    return Math.floor((p / REDEEM_RATE) * REDEEM_VALUE);
  }

  valueToPoints(amount) {
    const a = Math.max(0, Number(amount) || 0);
    return Math.ceil((a / REDEEM_VALUE) * REDEEM_RATE);
  }

  /** Max points the customer can redeem given their balance and the bill. */
  maxRedeemable(customerId, billTotal) {
    const bal = this.balance(customerId);
    if (bal < REDEEM_RATE) return { points: 0, value: 0 };
    // Whole multiples of REDEEM_RATE only
    const whole = Math.floor(bal / REDEEM_RATE) * REDEEM_RATE;
    const valueCap = Math.floor(billTotal / REDEEM_VALUE) * REDEEM_VALUE;
    const pointsCap = this.valueToPoints(valueCap);
    const points = Math.min(whole, pointsCap);
    return { points, value: this.pointsToValue(points) };
  }

  async earn({ customerId, amount, orderId, note }) {
    await wait(50);
    if (!customerId) return null;
    const points = this.pointsForAmount(amount);
    if (points <= 0) return null;
    const entry = {
      id: makeId(),
      customerId,
      type: 'earn',
      points,
      amount: Number(amount) || 0,
      reference: orderId ? `#${orderId}` : '',
      note: note || '',
      createdAt: Date.now(),
    };
    const rows = this.all();
    rows.unshift(entry);
    storage.write(KEY, rows);
    return entry;
  }

  async redeem({ customerId, points, orderId, note }) {
    await wait(50);
    if (!customerId) throw new Error('Select a customer to redeem points.');
    const p = Math.floor(Number(points) || 0);
    if (p <= 0) throw new Error('Points must be greater than zero.');
    const bal = this.balance(customerId);
    if (p > bal) throw new Error('Not enough points to redeem.');
    const value = this.pointsToValue(p);
    const entry = {
      id: makeId(),
      customerId,
      type: 'redeem',
      points: -p,
      amount: -value,
      reference: orderId ? `#${orderId}` : '',
      note: note || '',
      createdAt: Date.now(),
    };
    const rows = this.all();
    rows.unshift(entry);
    storage.write(KEY, rows);
    return entry;
  }

  async reverseForOrder({ orderId, customerId }) {
    const rows = this.all();
    const earn = rows.find(
      e => e.type === 'earn' && e.reference === `#${orderId}` && e.customerId === customerId
    );
    if (!earn) return null;
    const reversal = {
      ...earn,
      id: makeId(),
      type: 'adjust',
      points: -earn.points,
      note: 'Reversal of refunded order',
      createdAt: Date.now(),
    };
    rows.unshift(reversal);
    storage.write(KEY, rows);
    return reversal;
  }

  reset() {
    storage.remove(KEY);
  }
}

export const loyaltyService = new LoyaltyService();
export const LOYALTY = { EARN_RATE, REDEEM_RATE, REDEEM_VALUE };