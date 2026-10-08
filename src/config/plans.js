export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 999,
    tagline: 'For small shops just getting started',
    icon: 'Store',
    popular: false,
    limits: {
      tills: 1,
      products: 300,
      customers: 100,
      teamMembers: 1,
      branches: 1,
    },
    features: [
      '1 till / cashier account',
      'Up to 300 products',
      'Up to 100 customers',
      'Cash & M-Pesa payments',
      'Basic reports & receipts',
      'Shift reconciliation',
      'Email support',
    ],
    highlight: [
      'Unlimited sales',
      'Barcode scanning',
      'Low-stock alerts',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    tagline: 'For growing shops with a team',
    icon: 'Zap',
    popular: true,
    limits: {
      tills: 3,
      products: -1,
      customers: -1,
      teamMembers: 5,
      branches: 1,
    },
    features: [
      '3 till / cashier accounts',
      'Unlimited products',
      'Unlimited customers',
      'Customer credit & balances',
      'Advanced analytics & exports',
      'Purchase orders & suppliers',
      'Shift reports per cashier',
      'Priority email support',
    ],
    highlight: [
      'Everything in Starter',
      'Offline-ready POS',
      'Bulk product actions',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 3999,
    tagline: 'For multi-branch operations',
    icon: 'Building2',
    popular: false,
    limits: {
      tills: -1,
      products: -1,
      customers: -1,
      teamMembers: -1,
      branches: -1,
    },
    features: [
      'Unlimited tills and cashiers',
      'Unlimited products and customers',
      'Unlimited branches',
      'Role-based permissions',
      'Custom reports & API access',
      'Data exports (CSV / Excel)',
      'Dedicated onboarding',
      'Priority phone support',
    ],
    highlight: [
      'Everything in Pro',
      'Multi-branch analytics',
      'Dedicated success manager',
    ],
  },
];

/**
 * Full feature comparison matrix used by the comparison table.
 * `true` = included, `false` = not included, string = value.
 */
export const FEATURE_MATRIX = [
  {
    group: 'Core selling',
    rows: [
      { label: 'Till / cashier accounts', values: { starter: '1', pro: '3', business: 'Unlimited' } },
      { label: 'Unlimited sales', values: { starter: true, pro: true, business: true } },
      { label: 'Cash & M-Pesa payments', values: { starter: true, pro: true, business: true } },
      { label: 'Barcode scanning', values: { starter: true, pro: true, business: true } },
      { label: 'Held carts', values: { starter: true, pro: true, business: true } },
      { label: 'Shift reconciliation', values: { starter: true, pro: true, business: true } },
      { label: 'Split payments', values: { starter: false, pro: true, business: true } },
    ],
  },
  {
    group: 'Catalogue & inventory',
    rows: [
      { label: 'Products', values: { starter: '300', pro: 'Unlimited', business: 'Unlimited' } },
      { label: 'Categories', values: { starter: true, pro: true, business: true } },
      { label: 'Low-stock alerts', values: { starter: true, pro: true, business: true } },
      { label: 'Purchase orders', values: { starter: false, pro: true, business: true } },
      { label: 'Bulk actions', values: { starter: false, pro: true, business: true } },
      { label: 'Multi-branch stock', values: { starter: false, pro: false, business: true } },
    ],
  },
  {
    group: 'Customers',
    rows: [
      { label: 'Customer records', values: { starter: '100', pro: 'Unlimited', business: 'Unlimited' } },
      { label: 'Purchase history', values: { starter: true, pro: true, business: true } },
      { label: 'Credit sales & balances', values: { starter: false, pro: true, business: true } },
      { label: 'Customer statements', values: { starter: false, pro: true, business: true } },
    ],
  },
  {
    group: 'Reports & analytics',
    rows: [
      { label: 'Basic reports', values: { starter: true, pro: true, business: true } },
      { label: 'Advanced analytics', values: { starter: false, pro: true, business: true } },
      { label: 'Custom date ranges', values: { starter: false, pro: true, business: true } },
      { label: 'CSV / Excel export', values: { starter: false, pro: true, business: true } },
      { label: 'Custom report builder', values: { starter: false, pro: false, business: true } },
      { label: 'API access', values: { starter: false, pro: false, business: true } },
    ],
  },
  {
    group: 'Team & security',
    rows: [
      { label: 'Team members', values: { starter: '1', pro: '5', business: 'Unlimited' } },
      { label: 'Two-factor authentication', values: { starter: true, pro: true, business: true } },
      { label: 'Role-based permissions', values: { starter: false, pro: false, business: true } },
      { label: 'Audit log', values: { starter: false, pro: true, business: true } },
    ],
  },
  {
    group: 'Support',
    rows: [
      { label: 'Email support', values: { starter: true, pro: true, business: true } },
      { label: 'Priority support', values: { starter: false, pro: true, business: true } },
      { label: 'Dedicated onboarding', values: { starter: false, pro: false, business: true } },
      { label: 'Phone support', values: { starter: false, pro: false, business: true } },
    ],
  },
];

export const TRIAL_DAYS = 3;
export const ANNUAL_DISCOUNT = 0.17;

export function getPlan(planId) {
  return PLANS.find(p => p.id === planId) || PLANS[0];
}

export function planPrice(planId, annual = false) {
  const plan = getPlan(planId);
  if (!annual) return plan.price;
  return Math.round(plan.price * (1 - ANNUAL_DISCOUNT));
}

export function planAnnualTotal(planId) {
  const monthly = planPrice(planId, true);
  return monthly * 12;
}

export function planSavings(planId) {
  const plan = getPlan(planId);
  const monthlyTotal = plan.price * 12;
  const annualTotal = planAnnualTotal(planId);
  return monthlyTotal - annualTotal;
}