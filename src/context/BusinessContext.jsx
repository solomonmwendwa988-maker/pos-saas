import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/services/storage';

const KEY = 'business';

const DEFAULT = {
  name: '',
  type: 'Mini-market',
  phone: '',
  email: '',
  location: '',
  currency: 'KSh',
  taxRate: 16,
  receiptFooter: 'Thank you for shopping with us. Karibu tena.',
  logoDataUrl: null,
  lowStockThreshold: 10,
  paymentMethods: { cash: true, mpesa: true },
  onboarded: false,
};

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [business, setBusiness] = useState(() => ({
    ...DEFAULT,
    ...(storage.read(KEY, {}) || {}),
  }));

  useEffect(() => {
    storage.write(KEY, business);
  }, [business]);

  const update = useCallback(patch => {
    setBusiness(prev => ({ ...prev, ...patch }));
  }, []);

  const completeOnboarding = useCallback(patch => {
    setBusiness(prev => ({ ...prev, ...patch, onboarded: true }));
  }, []);

  const reset = useCallback(() => {
    storage.remove(KEY);
    setBusiness(DEFAULT);
  }, []);

  const value = useMemo(
    () => ({ business, update, completeOnboarding, reset }),
    [business, update, completeOnboarding, reset]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used inside BusinessProvider');
  return ctx;
}