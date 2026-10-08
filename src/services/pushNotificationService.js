/**
 * Local push notification service.
 *
 * Uses the service worker's notification channel — the same one the
 * browser uses for real Web Push. Today we show notifications from
 * the main thread (via `registration.showNotification`), which works
 * without a backend.
 *
 * When you add a backend, extend this class:
 *   1. Add VAPID public key exchange
 *   2. Subscribe via `reg.pushManager.subscribe(...)`
 *   3. POST the subscription to your server
 *   4. Handle the `push` event in the SW (custom workbox config)
 *
 * The API surface stays the same, so the UI doesn't change.
 */
import { storage } from './storage';

const PREF_KEY = 'notifications.pushEnabled';

class PushNotificationService {
  isSupported() {
    if (typeof window === 'undefined') return false;
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      window.isSecureContext
    );
  }

  getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  isEnabled() {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    return storage.read(PREF_KEY, false) === true;
  }

  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported on this device.');
    }
    if (Notification.permission === 'granted') {
      storage.write(PREF_KEY, true);
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      throw new Error(
        'Notifications are blocked. Enable them in your browser settings.'
      );
    }
    const result = await Notification.requestPermission();
    storage.write(PREF_KEY, result === 'granted');
    return result;
  }

  setEnabled(enabled) {
    storage.write(PREF_KEY, !!enabled);
  }

  async show(title, body, options = {}) {
    if (!this.isEnabled()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: options.tag || 'sokoni',
        renotify: false,
        requireInteraction: false,
        silent: false,
        data: options.data || {},
        ...options,
      });
      return true;
    } catch (err) {
      // Fallback to non-SW notification (works when the tab is open)
      try {
        // eslint-disable-next-line no-new
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          tag: options.tag || 'sokoni',
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /** Test notification — used from Settings. */
  async sendTest() {
    return this.show(
      'Sokoni notifications are on',
      'You will get alerts for sales, low stock, shifts and payments.',
      { tag: 'sokoni-test' }
    );
  }
}

export const pushNotificationService = new PushNotificationService();