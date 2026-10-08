const DAY = 86400000;

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a, b) {
  const from = new Date(a).getTime();
  const to = new Date(b).getTime();
  return Math.ceil((to - from) / DAY);
}

export function daysLeft(targetIso) {
  if (!targetIso) return 0;
  const diff = new Date(targetIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY));
}

export function countdownParts(targetIso) {
  if (!targetIso) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  const total = Math.max(0, new Date(targetIso).getTime() - Date.now());
  return {
    total,
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  };
}

/**
 * Computes the prorated cost of switching plans mid-cycle.
 * Returns positive number = customer owes, negative = credit owed to customer.
 */
export function computeProration({
  fromPlan,
  toPlan,
  cycleStartIso,
  cycleEndIso,
  annual = false,
}) {
  const start = new Date(cycleStartIso).getTime();
  const end = new Date(cycleEndIso).getTime();
  const now = Date.now();

  const cycleMs = end - start;
  if (cycleMs <= 0) return { amount: 0, daysRemaining: 0, daysInCycle: 0 };

  const daysInCycle = Math.round(cycleMs / DAY);
  const daysRemaining = Math.max(0, Math.round((end - now) / DAY));

  const fromRate = cycleRatePerDay(fromPlan, annual);
  const toRate = cycleRatePerDay(toPlan, annual);

  const amount = Math.round((toRate - fromRate) * daysRemaining);

  return { amount, daysRemaining, daysInCycle };
}

function cycleRatePerDay(plan, annual) {
  const annualTotal = Math.round(plan.price * (1 - 0.17)) * 12;
  const monthlyTotal = plan.price;
  const cycleTotal = annual ? annualTotal : monthlyTotal;
  const cycleDays = annual ? 365 : 30;
  return cycleTotal / cycleDays;
}

/**
 * Sequential invoice number: INV-2025-0001
 */
export function nextInvoiceNumber(lastNumber) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  if (!lastNumber || !lastNumber.startsWith(prefix)) {
    return `${prefix}0001`;
  }
  const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Formats a date like 17 Feb 2025
 */
export function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLongDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}