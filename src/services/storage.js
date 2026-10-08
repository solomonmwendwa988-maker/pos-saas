/**
 * Persistent storage layer.
 *
 * This is the FRONTEND placeholder for what will eventually be
 * server-side persistence. Every service reads and writes through here.
 *
 * When a real backend is wired in, replace service bodies with `http.*`
 * calls — the storage layer stops being used and the UI does not change.
 */

const PREFIX = 'sokoni:v1:';

export const storage = {
  read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      // Quota exceeded — surface silently, service callers get the value they passed.
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

/**
 * Generates a short, sortable, collision-resistant ID.
 */
export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Simple latency helper so services feel async even when hitting
 * localStorage synchronously. Replace with real network latency when
 * a backend is wired up.
 */
export const wait = (ms = 200) => new Promise(r => setTimeout(r, ms));