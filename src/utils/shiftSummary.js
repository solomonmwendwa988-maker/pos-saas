/**
 * Computes a shift's sales summary by filtering orders that belong to it.
 *
 * Match rule: same cashier, status COMPLETED, createdAt within the shift window.
 * Falls back to the legacy `date` string if `createdAt` is missing.
 */
export function computeShiftSummary(shift, orders) {
  if (!shift) return emptySummary();

  const start = shift.openedAt;
  const end = shift.closedAt || Date.now();

  const inWindow = orders.filter(o => {
    if (o.status !== 'COMPLETED') return false;
    if (o.cashier !== shift.cashier) return false;
    const t = o.createdAt ?? parseLegacyDate(o.date);
    return t >= start && t <= end;
  });

  const cash = inWindow.filter(o => o.method === 'Cash');
  const mpesa = inWindow.filter(o => o.method === 'M-Pesa');

  const totalSales = inWindow.reduce((s, o) => s + (o.total || 0), 0);
  const cashSales = cash.reduce((s, o) => s + (o.total || 0), 0);
  const mpesaSales = mpesa.reduce((s, o) => s + (o.total || 0), 0);

  const expectedCash = (shift.openingCash || 0) + cashSales;
  const actualCash = shift.closingCash ?? null;
  const discrepancy =
    shift.status === 'closed' && actualCash !== null
      ? actualCash - expectedCash
      : null;

  return {
    orders: inWindow.length,
    totalSales,
    cashSales,
    mpesaSales,
    cashOrders: cash.length,
    mpesaOrders: mpesa.length,
    expectedCash,
    actualCash,
    discrepancy,
  };
}

function parseLegacyDate(dateStr) {
  if (!dateStr) return 0;
  // "2025-02-14 14:12" → timestamp
  const iso = dateStr.replace(' ', 'T') + ':00';
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function emptySummary() {
  return {
    orders: 0,
    totalSales: 0,
    cashSales: 0,
    mpesaSales: 0,
    cashOrders: 0,
    mpesaOrders: 0,
    expectedCash: 0,
    actualCash: null,
    discrepancy: null,
  };
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${hr}h ${rem}m` : `${hr}h`;
}

export function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}