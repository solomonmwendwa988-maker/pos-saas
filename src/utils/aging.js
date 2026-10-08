const DAY_MS = 86400000;

/**
 * Computes an aged receivables breakdown for a single customer.
 * Uses FIFO: each payment reduces the oldest outstanding credit sale first.
 *
 * Returns { current, d30, d60, d90, total } where
 *   current = 0-30 days
 *   d30     = 31-60 days
 *   d60     = 61-90 days
 *   d90     = 90+ days
 *   total   = sum of all buckets
 */
export function computeCustomerAging(entries) {
  const now = Date.now();

  const sales = entries
    .filter(e => e.type === 'credit_sale')
    .map(e => ({ ...e, remaining: e.amount }))
    .sort((a, b) => a.createdAt - b.createdAt);

  const payments = entries.filter(e => e.type === 'payment');
  const adjustments = entries.filter(
    e => e.type === 'adjustment' || e.type === 'opening'
  );

  // Opening balances count as "sale on day 0" for aging purposes
  const opening = adjustments
    .filter(e => e.amount > 0)
    .map(e => ({ ...e, remaining: e.amount, createdAt: e.createdAt, type: 'opening' }));

  const allDebits = [...opening, ...sales].sort(
    (a, b) => a.createdAt - b.createdAt
  );

  const totalCredits =
    payments.reduce((s, p) => s + Math.abs(p.amount), 0) +
    adjustments.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

  let creditPool = totalCredits;
  for (const debit of allDebits) {
    if (creditPool <= 0) break;
    const applied = Math.min(creditPool, debit.remaining);
    debit.remaining -= applied;
    creditPool -= applied;
  }

  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const debit of allDebits) {
    if (debit.remaining <= 0.01) continue;
    const days = Math.floor((now - debit.createdAt) / DAY_MS);
    if (days <= 30) buckets.current += debit.remaining;
    else if (days <= 60) buckets.d30 += debit.remaining;
    else if (days <= 90) buckets.d60 += debit.remaining;
    else buckets.d90 += debit.remaining;
  }

  const total = buckets.current + buckets.d30 + buckets.d60 + buckets.d90;
  return { ...buckets, total };
}

/**
 * Aggregates the aging across every customer in a single pass.
 * Returns { rows: [{ customerId, ...buckets, total }], totals: {...} }
 */
export function computeAgingReport(entriesByCustomer) {
  const rows = [];
  const totals = { current: 0, d30: 0, d60: 0, d90: 0, total: 0 };

  for (const [customerId, entries] of Object.entries(entriesByCustomer)) {
    const aging = computeCustomerAging(entries);
    if (aging.total <= 0.01) continue;
    rows.push({ customerId, ...aging });
    totals.current += aging.current;
    totals.d30 += aging.d30;
    totals.d60 += aging.d60;
    totals.d90 += aging.d90;
    totals.total += aging.total;
  }

  rows.sort((a, b) => b.total - a.total);
  return { rows, totals };
}