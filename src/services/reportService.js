/**
 * Report service.
 *
 * Provides the list of available report types and handles generation
 * + CSV export. Report *data* is assembled by the Reports page from
 * live services (orders, products, customers, ledger). This service
 * only manages the catalog of report types and file generation.
 *
 * When a backend is wired up, `generate()` becomes a POST to
 * /api/reports/generate and the backend produces the real PDF/XLSX.
 */

const wait = (ms = 500) => new Promise(r => setTimeout(r, ms));

class ReportService {
  async list() {
    await wait(180);
    return [
      {
        id: 'sales',
        name: 'Sales report',
        description: 'Every sale, item, cashier and payment method',
      },
      {
        id: 'revenue',
        name: 'Revenue report',
        description: 'Revenue grouped by day, week or month',
      },
      {
        id: 'profit',
        name: 'Profit report',
        description: 'Gross profit after buying cost',
      },
      {
        id: 'inventory',
        name: 'Inventory report',
        description: 'Stock levels, values and low-stock items',
      },
      {
        id: 'products',
        name: 'Product performance',
        description: 'Top and slow-moving products',
      },
      {
        id: 'categories',
        name: 'Category performance',
        description: 'Revenue and units by category',
      },
      {
        id: 'customers',
        name: 'Customer report',
        description: 'Spending, orders and outstanding balances',
      },
      {
        id: 'payments',
        name: 'Payment report',
        description: 'Cash vs M-Pesa vs Card reconciliation',
      },
      {
        id: 'tax',
        name: 'Tax report',
        description: 'VAT collected per period',
      },
      {
        id: 'lowstock',
        name: 'Low-stock report',
        description: 'Products below reorder threshold',
      },
      {
        id: 'aging',
        name: 'Aging report',
        description:
          'Outstanding balances grouped by age (0–30, 31–60, 61–90, 90+ days)',
      },
      {
        id: 'credit',
        name: 'Credit sales report',
        description: 'Every sale made on customer credit',
      },
      {
        id: 'received',
        name: 'Payments received',
        description: 'Every payment recorded against a customer',
      },
    ];
  }

  /**
   * Prepares a report for download.
   *
   * Currently returns a stub URL — a real backend will generate the
   * file and return a signed download URL. The frontend correctly
   * handles both shapes without changes.
   */
  async generate({ type, range, format }) {
    await wait(900);
    return {
      id: `${type}_${Date.now()}`,
      type,
      range,
      format,
      generatedAt: new Date().toISOString(),
      url: `#mock-download/${type}-${format}.${format}`,
    };
  }

  /**
   * Turns an array of plain objects into a downloadable CSV file.
   * Values are quoted and internal quotes are escaped, so any value
   * that contains a comma, quote, or newline survives the round-trip.
   */
  async exportCsv(rows, filename) {
    if (!rows || rows.length === 0) {
      throw new Error('No rows to export.');
    }

    const headers = Object.keys(rows[0]);
    const escape = value => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [
      headers.map(escape).join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `sokoni-report-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { ok: true, filename };
  }
}

export const reportService = new ReportService();