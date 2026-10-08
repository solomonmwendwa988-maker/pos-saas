import { storage, wait, makeId } from './storage';
import { eventBus, EVENTS } from './eventBus';

const KEY = 'shifts';

class ShiftService {
  async list() {
    await wait(100);
    return storage.read(KEY, []);
  }

  async findActive(cashier) {
    await wait(40);
    const shifts = storage.read(KEY, []);
    return shifts.find(s => s.status === 'open' && s.cashier === cashier) || null;
  }

  async start({ cashier, openingCash }) {
    await wait(180);
    const shifts = storage.read(KEY, []);
    if (shifts.some(s => s.status === 'open' && s.cashier === cashier)) {
      throw new Error('You already have an open shift.');
    }
    const shift = {
      id: makeId('sh'),
      cashier: cashier || 'Owner',
      openingCash: Number(openingCash) || 0,
      closingCash: null,
      notes: '',
      status: 'open',
      openedAt: Date.now(),
      closedAt: null,
    };
    shifts.unshift(shift);
    storage.write(KEY, shifts);
    eventBus.emit(EVENTS.SHIFT_STARTED, shift);
    return shift;
  }

  async close(id, { closingCash, notes }) {
    await wait(220);
    const shifts = storage.read(KEY, []);
    const next = shifts.map(s =>
      s.id === id
        ? {
            ...s,
            status: 'closed',
            closingCash: Number(closingCash) || 0,
            notes: (notes || '').trim(),
            closedAt: Date.now(),
          }
        : s
    );
    storage.write(KEY, next);
    const closed = next.find(s => s.id === id);
    eventBus.emit(EVENTS.SHIFT_CLOSED, closed);
    return closed;
  }

  async update(id, patch) {
    await wait(120);
    const shifts = storage.read(KEY, []);
    const next = shifts.map(s => (s.id === id ? { ...s, ...patch } : s));
    storage.write(KEY, next);
    return next.find(s => s.id === id);
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const shiftService = new ShiftService();