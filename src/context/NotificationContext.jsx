import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationService } from '@/services/notificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await notificationService.list();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadCount = useMemo(() => items.filter(n => !n.read).length, [items]);

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

  const value = useMemo(
    () => ({ items, loading, unreadCount, markRead, markAllRead, clear, reload: load }),
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