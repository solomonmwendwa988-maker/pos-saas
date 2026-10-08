/**
 * Report service — mock implementation with real API surface.
 * Backend will eventually generate PDF/XLSX files; the frontend
 * just prepares the query and hands it off.
 */

const wait = (ms = 500) => new Promise(r => setTimeout(r, ms));

class ReportService {
  async list() {
    await wait(200);
    return [
      { id: 'sales', name: 'Sales report', description: 'Every sale, item, cashier and payment method' },
      { id: 'revenue', name: 'Revenue report', description: 'Revenue grouped by day, week or month' },
      { id: 'profit', name: 'Profit report', description: 'Gross profit after buying cost' },
      { id: 'inventory', name: 'Inventory report', description: 'Stock levels, values and low-stock items' },
      { id: 'products', name: 'Product performance', description: 'Top and slow-moving products' },
      { id: 'categories', name: 'Category performance', description: 'Revenue and units by category' },
      { id: 'customers', name: 'Customer report', description: 'Spending, orders and outstanding balances' },
      { id: 'payments', name: 'Payment report', description: 'Cash vs M-Pesa vs Card reconciliation' },
      { id: 'tax', name: 'Tax report', description: 'VAT collected per period' },
      { id: 'lowstock', name: 'Low-stock report', description: 'Products below reorder threshold' },
    ];
  }

  async generate({ type, range, format }) {
    await wait(900);
    // Backend will: build the report, store it, return a signed download URL.
    return {
      id: `${type}_${Date.now()}`,
      type,
      range,
      format,
      generatedAt: new Date().toISOString(),
      url: `#mock-download/${type}-${format}.${format}`,
    };
  }

  async exportCsv(rows, filename) {
    const header = Object.keys(rows[0] || {});
    const csv = [
      header.join(','),
      ...rows.map(r => header.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const reportService = new ReportService();