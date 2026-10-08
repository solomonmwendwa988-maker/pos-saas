import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { formatKSh } from '@/utils/format';

const NotificationContext = createContext(null);

function shouldNotify() {
  // Only fire a system notification when the app isn't focused, so we
  // don't double up on toasts the user is already reading.
  return typeof document !== 'undefined' && document.visibilityState !== 'visible';
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await notificationService.list();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(
    () => items.filter(n => !n.read).length,
    [items]
  );

  const markRead = useCallback(async id => {
    await notificationService.markRead(id);
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  // ---------- Push-driven notifications ----------
  useEffect(() => {
    const offSale = eventBus.on(EVENTS.SALE_COMPLETED, async order => {
      if (!order) return;
      await notificationService.push({
        type: 'sale',
        title: `Sale #${order.id} completed`,
        body: `${formatKSh(order.total)} via ${order.method}.`,
      });
      await load();
      if (shouldNotify()) {
        pushNotificationService.show(
          `Sale · ${formatKSh(order.total)}`,
          `${order.method} payment received (Order #${order.id}).`,
          { tag: `sale-${order.id}`, data: { url: `/sales?order=${order.id}` } }
        );
      }
    });

    const offRefund = eventBus.on(EVENTS.SALE_REFUNDED, async order => {
      if (!order) return;
      await notificationService.push({
        type: 'payment_failed',
        title: `Refund · Order #${order.id}`,
        body: `${formatKSh(order.total)} refunded.`,
      });
      await load();
      if (shouldNotify()) {
        pushNotificationService.show(
          `Refund issued · ${formatKSh(order.total)}`,
          `Order #${order.id} was refunded.`,
          { tag: `refund-${order.id}` }
        );
      }
    });

    const offShiftClosed = eventBus.on(EVENTS.SHIFT_CLOSED, async shift => {
      if (!shift) return;
      await notificationService.push({
        type: 'shift',
        title: 'Shift closed',
        body: `${shift.cashier || 'Cashier'} finished a shift.`,
      });
      await load();
      if (shouldNotify()) {
        pushNotificationService.show(
          'Shift closed',
          `${shift.cashier || 'Cashier'} closed their shift.`,
          { tag: `shift-${shift.id}` }
        );
      }
    });

    return () => {
      offSale();
      offRefund();
      offShiftClosed();
    };
  }, [load]);

  const value = useMemo(
    () => ({
      items,
      loading,
      unreadCount,
      markRead,
      markAllRead,
      clear,
      reload: load,
    }),
    [items, loading, unreadCount, markRead, markAllRead, clear, load]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}