import { storage, makeId } from './storage';

const KEY = 'activityLog';
const MAX = 2000;

class ActivityLogService {
  all() {
    return storage.read(KEY, []);
  }

  byUser(userId) {
    return this.all().filter(e => e.userId === userId);
  }

  forEntity(entity, entityId) {
    return this.all().filter(
      e => e.entity === entity && e.entityId === entityId
    );
  }

  /**
   * Records an activity entry.
   * @param {object} entry
   * @param {string} entry.action    e.g. 'products.delete'
   * @param {string} [entry.entity]  e.g. 'product'
   * @param {string} [entry.entityId]
   * @param {string} [entry.summary] Human-readable description
   * @param {object} [entry.meta]    Arbitrary extra data
   * @param {object} entry.user      { id, fullName, role, email }
   */
  log({ action, entity, entityId, summary, meta, user }) {
    const entry = {
      id: makeId('act'),
      action,
      entity: entity || null,
      entityId: entityId || null,
      summary: summary || '',
      meta: meta || {},
      userId: user?.id || 'unknown',
      userName: user?.fullName || 'Unknown',
      userRole: user?.role || 'UNKNOWN',
      createdAt: Date.now(),
    };
    const list = storage.read(KEY, []);
    list.unshift(entry);
    if (list.length > MAX) list.length = MAX;
    storage.write(KEY, list);
    return entry;
  }

  clear() {
    storage.remove(KEY);
  }
}

export const activityLogService = new ActivityLogService();