import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, Boxes, Calendar, FileSpreadsheet,
  FileText, Package, Receipt, ShoppingBag, Tag, Users, Users2, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import ExportMenu from '@/components/common/ExportMenu';
import { reportService } from '@/services/reportService';
import { pdfService } from '@/services/pdfService';
import { excelService } from '@/services/excelService';
import { salesService } from '@/services/salesService';
import { productService } from '@/services/productService';
import { customerService } from '@/services/customerService';
import { customerLedgerService } from '@/services/customerLedgerService';
import { computeAgingReport } from '@/utils/aging';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import { formatKSh } from '@/utils/format';
import './Reports.css';

const ICONS = {
  sales: Receipt,
  revenue: BarChart3,
  profit: Wallet,
  inventory: Boxes,
  products: Package,
  categories: Tag,
  customers: Users,
  payments: ShoppingBag,
  tax: FileText,
  lowstock: Boxes,
  aging: AlertTriangle,
  credit: Users2,
  received: ShoppingBag,
};

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'custom', label: 'Custom range' },
];

function stripJsx(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function extractPlainRows(columns, rows) {
  return rows.map(row => {
    const out = {};
    columns.forEach(col => {
      // Bypass JSX renderers — pull the raw value off the row.
      const raw = row[col.key];
      out[col.label] = stripJsx(raw);
    });
    return out;
  });
}

export default function Reports() {
  const toast = useToast();
  const { business } = useBusiness();

  const [reports, setReports] = useState([]);
  const [activeId, setActiveId] = useState('sales');
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [busy, setBusy] = useState(null);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => setReports(await reportService.list()))();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [o, p, c] = await Promise.all([
        salesService.list(),
        productService.list(),
        customerService.list(),
      ]);
      setOrders(o);
      setProducts(p);
      setCustomers(c);
      setLedger(customerLedgerService.all());
      setLoading(false);
    })();
  }, []);

  const active = useMemo(
    () => reports.find(r => r.id === activeId),
    [reports, activeId]
  );

  const categorySales = useMemo(() => {
    const map = new Map();
    orders
      .filter(o => o.status === 'COMPLETED')
      .forEach(o => {
        (o.itemsList || []).forEach(i => {
          const product = products.find(p => p.name === i.name);
          const cat = product?.category || 'Uncategorised';
          const entry = map.get(cat) || { category: cat, revenue: 0, units: 0 };
          entry.revenue += i.qty * i.price;
          entry.units += i.qty;
          map.set(cat, entry);
        });
      });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders, products]);

  const taxReport = useMemo(() => {
    const map = new Map();
    orders
      .filter(o => o.status === 'COMPLETED')
      .forEach(o => {
        const month = (o.date || '').slice(0, 7);
        if (!month) return;
        const entry = map.get(month) || { month, taxable: 0, vat: 0 };
        entry.taxable += o.subtotal || 0;
        entry.vat += o.tax || 0;
        map.set(month, entry);
      });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [orders]);

  const agingRows = useMemo(() => {
    const byCustomer = {};
    ledger.forEach(e => {
      if (!byCustomer[e.customerId]) byCustomer[e.customerId] = [];
      byCustomer[e.customerId].push(e);
    });
    const { rows } = computeAgingReport(byCustomer);
    return rows.map(r => {
      const cust = customers.find(c => c.id === r.customerId);
      return {
        ...r,
        customerName: cust?.name || 'Unknown',
        phone: cust?.phone || '—',
      };
    });
  }, [ledger, customers]);

  const creditOrders = useMemo(
    () => orders.filter(o => o.paymentStatus === 'credit'),
    [orders]
  );

  const paymentsReceived = useMemo(
    () => ledger.filter(e => e.type === 'payment'),
    [ledger]
  );

  const previewData = useMemo(() => {
    switch (activeId) {
      case 'sales':
        return {
          columns: [
            { key: 'id', label: 'Order' },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'items', label: 'Items', align: 'right' },
            { key: 'total', label: 'Total', align: 'right' },
            { key: 'method', label: 'Method' },
            { key: 'status', label: 'Status' },
          ],
          rows: orders,
        };
      case 'inventory':
      case 'lowstock':
        return {
          columns: [
            { key: 'name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'stock', label: 'Stock', align: 'right' },
            { key: 'threshold', label: 'Threshold', align: 'right' },
            { key: 'buyingPrice', label: 'Buying', align: 'right' },
            { key: 'price', label: 'Retail', align: 'right' },
          ],
          rows:
            activeId === 'lowstock'
              ? products.filter(p => p.stock <= p.threshold)
              : products,
        };
      case 'categories':
        return {
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'units', label: 'Units sold', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right' },
          ],
          rows: categorySales,
        };
      case 'customers':
        return {
          columns: [
            { key: 'name', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'orders', label: 'Orders', align: 'right' },
            { key: 'spent', label: 'Total spent', align: 'right' },
            { key: 'last', label: 'Last purchase' },
          ],
          rows: customers,
        };
      case 'tax':
        return {
          columns: [
            { key: 'month', label: 'Month' },
            { key: 'taxable', label: 'Taxable sales', align: 'right' },
            { key: 'vat', label: 'VAT collected', align: 'right' },
          ],
          rows: taxReport,
        };
      case 'aging':
        return {
          columns: [
            { key: 'customerName', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'current', label: '0–30 days', align: 'right' },
            { key: 'd30', label: '31–60 days', align: 'right' },
            { key: 'd60', label: '61–90 days', align: 'right' },
            { key: 'd90', label: '90+ days', align: 'right' },
            { key: 'total', label: 'Total', align: 'right' },
          ],
          rows: agingRows,
        };
      case 'credit':
        return {
          columns: [
            { key: 'id', label: 'Order' },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'total', label: 'Amount', align: 'right' },
            { key: 'status', label: 'Status' },
          ],
          rows: creditOrders,
        };
      case 'received':
        return {
          columns: [
            { key: 'createdAt', label: 'Date' },
            { key: 'customerName', label: 'Customer' },
            { key: 'method', label: 'Method' },
            { key: 'reference', label: 'Reference' },
            { key: 'amount', label: 'Amount', align: 'right' },
          ],
          rows: paymentsReceived.map(p => ({
            ...p,
            customerName:
              customers.find(c => c.id === p.customerId)?.name || 'Unknown',
          })),
        };
      case 'products':
        return {
          columns: [
            { key: 'name', label: 'Product' },
            { key: 'category', label: 'Category' },
            { key: 'stock', label: 'Stock', align: 'right' },
            { key: 'price', label: 'Retail', align: 'right' },
          ],
          rows: products,
        };
      default:
        return {
          columns: [
            { key: 'id', label: 'Order' },
            { key: 'date', label: 'Date' },
            { key: 'total', label: 'Total', align: 'right' },
          ],
          rows: orders,
        };
    }
  }, [
    activeId,
    orders,
    products,
    customers,
    categorySales,
    taxReport,
    agingRows,
    creditOrders,
    paymentsReceived,
  ]);

  const rangeLabel =
    RANGES.find(r => r.id === range)?.label || range;

  const buildPdfColumns = () =>
    previewData.columns.map(c => ({
      key: c.label,
      label: c.label,
      width: c.align === 'right' ? 100 : 140,
      align: c.align || 'left',
      format: (v, row) => {
        if (
          typeof v === 'number' &&
          (c.label.toLowerCase().includes('total') ||
            c.label.toLowerCase().includes('revenue') ||
            c.label.toLowerCase().includes('spent') ||
            c.label.toLowerCase().includes('amount') ||
            c.label.toLowerCase().includes('price') ||
            c.label.toLowerCase().includes('taxable') ||
            c.label.toLowerCase().includes('vat') ||
            c.label.toLowerCase().includes('days'))
        ) {
          return formatKSh(v);
        }
        return v === null || v === undefined ? '' : String(v);
      },
      color: (row) => undefined,
    }));

  const buildPdfRows = () =>
    previewData.rows.map(row => {
      const out = {};
      previewData.columns.forEach(col => {
        out[col.label] = row[col.key];
      });
      return out;
    });

  const exportPdf = async () => {
    if (!previewData.rows.length) {
      toast.warning('Nothing to export yet.');
      return;
    }
    setBusy('pdf');
    try {
      const blob = await pdfService.generateTablePdf({
        title: active?.name || 'Report',
        subtitle: `${rangeLabel} · ${previewData.rows.length} rows`,
        business,
        columns: buildPdfColumns(),
        rows: buildPdfRows(),
        filename: `sokoni-${activeId}-${Date.now()}.pdf`,
        footerNote: business.name,
      });
      pdfService.downloadBlob(
        blob,
        `sokoni-${activeId}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success('PDF exported.');
    } catch (err) {
      toast.error(err.message || 'Could not generate PDF.');
    } finally {
      setBusy(null);
    }
  };

  const exportExcel = () => {
    if (!previewData.rows.length) {
      toast.warning('Nothing to export yet.');
      return;
    }
    try {
      const columns = previewData.columns.map(c => {
        const isMoney =
          c.label.toLowerCase().includes('total') ||
          c.label.toLowerCase().includes('revenue') ||
          c.label.toLowerCase().includes('spent') ||
          c.label.toLowerCase().includes('amount') ||
          c.label.toLowerCase().includes('price') ||
          c.label.toLowerCase().includes('taxable') ||
          c.label.toLowerCase().includes('vat') ||
          c.label.toLowerCase().includes('buying') ||
          c.label.toLowerCase().includes('retail');
        const isInt =
          c.label.toLowerCase().includes('stock') ||
          c.label.toLowerCase().includes('orders') ||
          c.label.toLowerCase().includes('units') ||
          c.label.toLowerCase().includes('threshold');
        return {
          key: c.key,
          label: c.label,
          align: c.align || 'left',
          width: Math.max(14, c.label.length + 4),
          type: isMoney ? 'money' : isInt ? 'int' : undefined,
        };
      });
      excelService.exportRows({
        filename: `sokoni-${activeId}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: (active?.name || 'Report').slice(0, 28),
        columns,
        rows: previewData.rows,
        meta: {
          'Business': business.name || '',
          'Report': active?.name || '',
          'Range': rangeLabel,
          'Generated': new Date().toLocaleString('en-KE'),
        },
      });
      toast.success('Excel exported.');
    } catch (err) {
      toast.error(err.message || 'Could not generate Excel file.');
    }
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub muted">
            Generate, preview and export business reports
          </p>
        </div>
      </header>

      <div className="reports-layout">
        <aside className="reports-list">
          {reports.map(r => {
            const Icon = ICONS[r.id] || FileText;
            return (
              <button
                key={r.id}
                className={`report-item ${activeId === r.id ? 'on' : ''}`}
                onClick={() => setActiveId(r.id)}
              >
                <span className="report-icon">
                  <Icon size={16} />
                </span>
                <span className="report-body">
                  <span className="report-name">{r.name}</span>
                  <span className="report-desc">{r.description}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <div className="stack gap-16" style={{ minWidth: 0 }}>
          <Card padding="md">
            <div className="report-toolbar">
              <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
                <div className="row gap-8">
                  <Calendar size={15} className="muted" />
                  <select
                    className="select"
                    value={range}
                    onChange={e => setRange(e.target.value)}
                  >
                    {RANGES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                {range === 'custom' && (
                  <div className="row gap-8">
                    <input
                      type="date"
                      className="select"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                    />
                    <span className="muted">to</span>
                    <input
                      type="date"
                      className="select"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <ExportMenu
                label="Export"
                busy={!!busy}
                onExportPdf={exportPdf}
                onExportExcel={exportExcel}
              />
            </div>
          </Card>

          <Card
            title={active?.name || 'Report preview'}
            subtitle={`Range: ${rangeLabel}`}
            action={<Badge tone="primary">{previewData.rows.length} rows</Badge>}
          >
            <Table
              columns={previewData.columns.map(c => ({
                ...c,
                render: r => {
                  const v = r[c.key];
                  const label = String(c.label || '').toLowerCase();
                  if (
                    typeof v === 'number' &&
                    (label.includes('total') ||
                      label.includes('revenue') ||
                      label.includes('spent') ||
                      label.includes('amount') ||
                      label.includes('price') ||
                      label.includes('taxable') ||
                      label.includes('vat') ||
                      label.includes('days') ||
                      label.includes('buying') ||
                      label.includes('retail'))
                  ) {
                    return <span className="mono">{formatKSh(v)}</span>;
                  }
                  if (label.includes('status')) {
                    return <Badge tone="neutral">{String(v)}</Badge>;
                  }
                  return v === null || v === undefined ? '—' : String(v);
                },
              }))}
              rows={previewData.rows}
              empty={loading ? 'Loading…' : 'No data for the selected period.'}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}