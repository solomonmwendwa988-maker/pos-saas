import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { subscriptionService } from '@/services/subscriptionService';
import { productService } from '@/services/productService';
import { customerService } from '@/services/customerService';
import { salesService } from '@/services/salesService';
import { eventBus } from '@/services/eventBus';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

const DAY_MS = 86400000;

/**
 * Returns the number of days between now and an ISO date string.
 * Never returns NaN — clamps to a safe integer.
 */
function daysUntil(iso) {
  if (!iso) return 0;
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return 0;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

export function SubscriptionProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({
    tills: 1,
    products: 0,
    customers: 0,
    teamMembers: 1,
    branches: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUsage = useCallback(async () => {
    try {
      const [products, customers, orders] = await Promise.all([
        productService.list(),
        customerService.list(),
        salesService.list(),
      ]);
      const cashiers = new Set(
        (orders || []).map(o => o.cashier).filter(Boolean)
      );
      setUsage({
        tills: Math.max(1, cashiers.size),
        products: products?.length || 0,
        customers: customers?.length || 0,
        teamMembers: 1,
        branches: 1,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[subscription] usage refresh failed', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const sub = await subscriptionService.current();
      setSubscription(sub);
      refreshUsage();
      return sub;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[subscription] refresh failed', err);
      setError(err);
      setSubscription({
        planId: 'starter',
        status: 'trial',
        billingCycle: 'monthly',
        trialStart: new Date().toISOString(),
        trialEnd: new Date(Date.now() + 3 * DAY_MS).toISOString(),
        cycleStart: new Date().toISOString(),
        cycleEnd: new Date(Date.now() + 3 * DAY_MS).toISOString(),
        plan: {
          id: 'starter',
          name: 'Starter',
          price: 999,
          tagline: 'For small shops just getting started',
          icon: 'Store',
          limits: {
            tills: 1,
            products: 300,
            customers: 100,
            teamMembers: 1,
            branches: 1,
          },
          features: [],
          highlight: [],
        },
        pendingPlan: null,
        currentPeriodPaid: 0,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshUsage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const off = eventBus.on('subscription:changed', s => {
      try {
        setSubscription(subscriptionService._enrich(s));
      } catch {
        setSubscription(s);
      }
      refreshUsage();
    });
    return off;
  }, [refreshUsage]);

  // ---------- Mutations ----------

  const changePlan = useCallback(async payload => {
    const result = await subscriptionService.changePlan(payload);
    setSubscription(result.subscription);
    return result;
  }, []);

  const scheduleDowngrade = useCallback(async planId => {
    const sub = await subscriptionService.scheduleDowngrade(planId);
    setSubscription(sub);
    return sub;
  }, []);

  const cancelPendingChange = useCallback(async () => {
    const sub = await subscriptionService.cancelPendingChange();
    setSubscription(sub);
    return sub;
  }, []);

  const cancelSubscription = useCallback(async reason => {
    const sub = await subscriptionService.cancelSubscription(reason);
    setSubscription(sub);
    return sub;
  }, []);

  const reactivate = useCallback(async () => {
    const sub = await subscriptionService.reactivate();
    setSubscription(sub);
    return sub;
  }, []);

  // ---------- Derived ----------

  const isInTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';
  const isCancelled = subscription?.status === 'cancelled';
  const isPending = subscription?.status === 'pending';

  const trialDaysLeft = useMemo(
    () => daysUntil(subscription?.trialEnd),
    [subscription?.trialEnd]
  );

  const daysUntilCycleEnd = useMemo(
    () => daysUntil(subscription?.cycleEnd),
    [subscription?.cycleEnd]
  );

  const trialExpired = isInTrial && trialDaysLeft === 0;

  const limits = subscription?.plan?.limits || {};

  const exceedsLimit = useCallback(
    key => {
      const limit = limits[key];
      if (limit === -1 || limit === undefined) return false;
      return (usage[key] || 0) >= limit;
    },
    [limits, usage]
  );

  const limitRemaining = useCallback(
    key => {
      const limit = limits[key];
      if (limit === -1 || limit === undefined) return Infinity;
      return Math.max(0, limit - (usage[key] || 0));
    },
    [limits, usage]
  );

  const value = useMemo(
    () => ({
      subscription,
      usage,
      loading,
      error,
      isInTrial,
      isActive,
      isCancelled,
      isPending,
      trialDaysLeft,
      daysUntilCycleEnd,
      trialExpired,
      limits,
      exceedsLimit,
      limitRemaining,
      refresh,
      refreshUsage,
      changePlan,
      scheduleDowngrade,
      cancelPendingChange,
      cancelSubscription,
      reactivate,
    }),
    [
      subscription,
      usage,
      loading,
      error,
      isInTrial,
      isActive,
      isCancelled,
      isPending,
      trialDaysLeft,
      daysUntilCycleEnd,
      trialExpired,
      limits,
      exceedsLimit,
      limitRemaining,
      refresh,
      refreshUsage,
      changePlan,
      scheduleDowngrade,
      cancelPendingChange,
      cancelSubscription,
      reactivate,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used inside SubscriptionProvider');
  }
  return ctx;
}