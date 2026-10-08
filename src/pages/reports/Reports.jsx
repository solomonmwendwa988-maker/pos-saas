import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Boxes, Calendar, Download, FileSpreadsheet, FileText,
  Package, Receipt, ShoppingBag, Tag, Users, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import { reportService } from '@/services/reportService';
import { salesService } from '@/services/salesService';
import { productService } from '@/services/productService';
import { customerService } from '@/services/customerService';
import { formatKSh } from '@/utils/format';
import { useToast } from '@/context/ToastContext';
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

export default function Reports() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [activeId, setActiveId] = useState('sales');
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
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
      setLoading(false);
    })();
  }, []);

  const active = useMemo(
    () => reports.find(r => r.id === activeId),
    [reports, activeId]
  );

  const categorySales = useMemo(() => {
    const map = new Map();
    orders.filter(o => o.status === 'COMPLETED').forEach(o => {
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
    orders.filter(o => o.status === 'COMPLETED').forEach(o => {
      const month = (o.date || '').slice(0, 7);
      if (!month) return;
      const entry = map.get(month) || { month, taxable: 0, vat: 0 };
      entry.taxable += o.subtotal || 0;
      entry.vat += o.tax || 0;
      map.set(month, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [orders]);

  const previewData = useMemo(() => {
    switch (activeId) {
      case 'sales':
        return {
          columns: [
            { key: 'id', label: 'Order' },
            { key: 'date', label: 'Date' },
            { key: 'customer', label: 'Customer' },
            { key: 'total', label: 'Total', align: 'right', render: r => <span className="mono bold">{formatKSh(r.total)}</span> },
            { key: 'method', label: 'Method' },
            { key: 'status', label: 'Status', render: r => (
              <Badge tone={r.status === 'COMPLETED' ? 'success' : r.status === 'PENDING' ? 'warning' : 'neutral'}>
                {r.status}
              </Badge>
            )},
          ],
          rows: orders,
        };
      case 'inventory':
      case 'lowstock':
        return {
          columns: [
            { key: 'name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'stock', label: 'Stock', align: 'center' },
            { key: 'threshold', label: 'Threshold', align: 'center' },
            { key: 'buyingPrice', label: 'Buying', align: 'right', render: r => <span className="mono">{formatKSh(r.buyingPrice)}</span> },
            { key: 'price', label: 'Retail', align: 'right', render: r => <span className="mono bold">{formatKSh(r.price)}</span> },
          ],
          rows: activeId === 'lowstock'
            ? products.filter(p => p.stock <= p.threshold)
            : products,
        };
      case 'categories':
        return {
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'units', label: 'Units sold', align: 'center', render: r => <span className="mono">{r.units.toLocaleString()}</span> },
            { key: 'revenue', label: 'Revenue', align: 'right', render: r => <span className="mono bold">{formatKSh(r.revenue)}</span> },
          ],
          rows: categorySales,
        };
      case 'customers':
        return {
          columns: [
            { key: 'name', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'orders', label: 'Orders', align: 'center' },
            { key: 'spent', label: 'Total spent', align: 'right', render: r => <span className="mono bold">{formatKSh(r.spent)}</span> },
            { key: 'last', label: 'Last purchase', render: r => r.last || '—' },
          ],
          rows: customers,
        };
      case 'tax':
        return {
          columns: [
            { key: 'month', label: 'Month' },
            { key: 'taxable', label: 'Taxable sales', align: 'right', render: r => <span className="mono">{formatKSh(r.taxable)}</span> },
            { key: 'vat', label: 'VAT collected', align: 'right', render: r => <span className="mono bold">{formatKSh(r.vat)}</span> },
          ],
          rows: taxReport,
        };
      case 'products':
        return {
          columns: [
            { key: 'name', label: 'Product' },
            { key: 'category', label: 'Category' },
            { key: 'stock', label: 'Stock', align: 'center' },
            { key: 'price', label: 'Retail', align: 'right', render: r => <span className="mono bold">{formatKSh(r.price)}</span> },
          ],
          rows: products,
        };
      default:
        return {
          columns: [
            { key: 'id', label: 'Order' },
            { key: 'date', label: 'Date' },
            { key: 'total', label: 'Total', align: 'right', render: r => <span className="mono bold">{formatKSh(r.total)}</span> },
          ],
          rows: orders,
        };
    }
  }, [activeId, orders, products, customers, categorySales, taxReport]);

  const generate = async format => {
    setGenerating(true);
    const res = await reportService.generate({
      type: activeId,
      range: range === 'custom' ? { from: customFrom, to: customTo } : range,
      format,
    });
    setLastGenerated(res);
    setGenerating(false);
    toast.success(`${active?.name || 'Report'} ready.`);
  };

  const exportCsv = () => {
    if (!previewData.rows.length) {
      toast.warning('Nothing to export yet.');
      return;
    }
    const rows = previewData.rows.map(r => {
      const out = {};
      previewData.columns.forEach(c => { out[c.label] = r[c.key]; });
      return out;
    });
    reportService.exportCsv(rows, `sokoni-${activeId}-${Date.now()}.csv`);
    toast.success('CSV exported.');
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub muted">Generate, preview and export business reports</p>
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
                onClick={() => { setActiveId(r.id); setLastGenerated(null); }}
              >
                <span className="report-icon"><Icon size={16} /></span>
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
                  <select className="select" value={range} onChange={e => setRange(e.target.value)}>
                    {RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
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

              <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FileSpreadsheet size={14} />}
                  onClick={exportCsv}
                >
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  loading={generating}
                  onClick={() => generate('pdf')}
                >
                  Export PDF
                </Button>
                <Button size="sm" loading={generating} onClick={() => generate('pdf')}>
                  Generate
                </Button>
              </div>
            </div>
          </Card>

          {lastGenerated && (
            <Card padding="md">
              <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div className="row gap-12">
                  <span className="report-ready-icon"><FileText size={18} /></span>
                  <div>
                    <div className="bold" style={{ fontSize: 13.5 }}>
                      {active?.name} ready
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Generated {new Date(lastGenerated.generatedAt).toLocaleTimeString('en-KE')} · {lastGenerated.format.toUpperCase()}
                    </div>
                  </div>
                </div>
                <a href={lastGenerated.url} download className="link-primary">Download</a>
              </div>
            </Card>
          )}

          <Card
            title={active?.name || 'Report preview'}
            subtitle={`Range: ${RANGES.find(r => r.id === range)?.label || range}`}
            action={<Badge tone="primary">{previewData.rows.length} rows</Badge>}
          >
            <Table
              columns={previewData.columns}
              rows={previewData.rows}
              empty={loading ? 'Loading…' : 'No data for the selected period.'}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}