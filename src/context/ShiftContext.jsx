import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { shiftService } from '@/services/shiftService';
import { salesService } from '@/services/salesService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { computeShiftSummary } from '@/utils/shiftSummary';
import { useAuth } from './AuthContext';

const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const cashier = user?.fullName?.trim() || 'Owner';

  const [activeShift, setActiveShift] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const list = await salesService.list();
      setOrders(list);
      return list;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[shift] failed to load orders', err);
      setOrders([]);
      return [];
    }
  }, []);

  const refreshActive = useCallback(async () => {
    if (!isAuthenticated) {
      setActiveShift(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const [shift] = await Promise.all([
        shiftService.findActive(cashier),
        loadOrders(),
      ]);
      setActiveShift(shift);
      return shift;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[shift] refresh failed', err);
      setActiveShift(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cashier, isAuthenticated, loadOrders]);

  // Initial load + re-run whenever the logged-in user changes
  useEffect(() => {
    refreshActive();
  }, [refreshActive]);

  // React to app-level events
  useEffect(() => {
    const offSale = eventBus.on(EVENTS.SALE_COMPLETED, () => {
      loadOrders();
    });
    const offRefund = eventBus.on(EVENTS.SALE_REFUNDED, () => {
      loadOrders();
    });
    const offStarted = eventBus.on(EVENTS.SHIFT_STARTED, shift => {
      if (shift.cashier === cashier) setActiveShift(shift);
    });
    const offClosed = eventBus.on(EVENTS.SHIFT_CLOSED, shift => {
      setActiveShift(current => (current && shift.id === current.id ? null : current));
    });

    return () => {
      offSale();
      offRefund();
      offStarted();
      offClosed();
    };
  }, [cashier, loadOrders]);

  const startShift = useCallback(
    async openingCash => {
      const shift = await shiftService.start({ cashier, openingCash });
      setActiveShift(shift);
      return shift;
    },
    [cashier]
  );

  const closeShift = useCallback(async (id, payload) => {
    const shift = await shiftService.close(id, payload);
    setActiveShift(null);
    return shift;
  }, []);

  const summary = useMemo(
    () => computeShiftSummary(activeShift, orders),
    [activeShift, orders]
  );

  const lastOrder = useMemo(() => {
    if (!activeShift) return null;
    return (
      orders.find(
        o => o.shiftId === activeShift.id && o.status === 'COMPLETED'
      ) || null
    );
  }, [orders, activeShift]);

  const value = useMemo(
    () => ({
      activeShift,
      orders,
      summary,
      lastOrder,
      loading,
      startShift,
      closeShift,
      refreshActive,
      refreshOrders: loadOrders,
      cashier,
    }),
    [
      activeShift,
      orders,
      summary,
      lastOrder,
      loading,
      startShift,
      closeShift,
      refreshActive,
      loadOrders,
      cashier,
    ]
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used inside ShiftProvider');
  return ctx;
}