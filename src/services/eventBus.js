const listeners = new Map();

export const eventBus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => {
      listeners.get(event)?.delete(handler);
    };
  },

  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    set.forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[eventBus] handler for "${event}" threw`, err);
      }
    });
  },
};

export const EVENTS = {
  SALE_COMPLETED: 'sale:completed',
  SALE_REFUNDED: 'sale:refunded',
  SHIFT_STARTED: 'shift:started',
  SHIFT_CLOSED: 'shift:closed',
  PRODUCTS_CHANGED: 'products:changed',
  STOCK_CHANGED: 'stock:changed',
  PO_CREATED: 'po:created',
  PO_UPDATED: 'po:updated',
  SUPPLIER_PAYMENT: 'supplier:payment',
};