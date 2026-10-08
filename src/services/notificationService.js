import { storage, wait, makeId } from './storage';

const KEY = 'notifications';

class NotificationService {
  async list() {
    await wait(150);
    return storage.read(KEY, []);
  }

  async unreadCount() {
    await wait(80);
    return storage.read(KEY, []).filter(n => !n.read).length;
  }

  async push({ type, title, body, priority = 'normal' }) {
    await wait(100);
    const items = storage.read(KEY, []);
    const notification = {
      id: makeId('n'),
      type,
      title,
      body,
      priority,
      time: 'Just now',
      createdAt: Date.now(),
      read: false,
    };
    items.unshift(notification);
    storage.write(KEY, items);
    return notification;
  }

  async markRead(id) {
    await wait(120);
    const items = storage.read(KEY, []).map(n => (n.id === id ? { ...n, read: true } : n));
    storage.write(KEY, items);
    return { id };
  }

  async markAllRead() {
    await wait(180);
    const items = storage.read(KEY, []).map(n => ({ ...n, read: true }));
    storage.write(KEY, items);
    return { count: 0 };
  }

  async remove(id) {
    await wait(120);
    const items = storage.read(KEY, []).filter(n => n.id !== id);
    storage.write(KEY, items);
    return { id };
  }

  async clear() {
    await wait(150);
    storage.write(KEY, []);
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const notificationService = new NotificationService();