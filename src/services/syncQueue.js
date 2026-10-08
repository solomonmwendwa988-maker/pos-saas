import { storage, makeId } from './storage';

const KEY = 'sync.queue';
const MAX = 500;

/**
 * A durable queue of mutations that need to reach the backend.
 *
 * Usage when a backend exists:
 *   await syncQueue.enqueue({ entity: 'products', op: 'update', payload });
 *
 * Then register a handler once at app start:
 *   syncQueue.setHandler(async ({ entity, op, payload }) => {
 *     return await http.post(`/sync/${entity}/${op}`, payload);
 *   });
 *
 * The queue flushes automatically on reconnect.
 */
class SyncQueue {
  constructor() {
    this.handler = null;
    this.flushing = false;
  }

  setHandler(fn) {
    this.handler = fn;
  }

  items() {
    return storage.read(KEY, []);
  }

  size() {
    return this.items().length;
  }

  async enqueue({ entity, op, payload }) {
    const items = storage.read(KEY, []);
    const entry = {
      id: makeId('sq'),
      entity,
      op,
      payload,
      createdAt: Date.now(),
      attempts: 0,
    };
    items.push(entry);
    if (items.length > MAX) items.splice(0, items.length - MAX);
    storage.write(KEY, items);
    return entry;
  }

  async remove(id) {
    const items = storage.read(KEY, []).filter(i => i.id !== id);
    storage.write(KEY, items);
  }

  clear() {
    storage.write(KEY, []);
  }

  /**
   * Flush all queued mutations through the registered handler.
   * Stops at the first failure so order is preserved.
   */
  async flush() {
    if (this.flushing) return { ok: false, reason: 'already-flushing' };
    if (!this.handler) return { ok: false, reason: 'no-handler' };
    if (!navigator.onLine) return { ok: false, reason: 'offline' };

    this.flushing = true;
    const items = this.items();
    let succeeded = 0;

    try {
      for (const item of items) {
        try {
          await this.handler(item);
          await this.remove(item.id);
          succeeded++;
        } catch (err) {
          // bump attempts and stop — order matters
          const next = storage.read(KEY, []).map(i =>
            i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i
          );
          storage.write(KEY, next);
          break;
        }
      }
      return { ok: true, succeeded, remaining: this.size() };
    } finally {
      this.flushing = false;
    }
  }
}

export const syncQueue = new SyncQueue();