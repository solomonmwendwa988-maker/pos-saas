import { useEffect, useMemo, useState } from 'react';
import {
  Eye, RotateCcw, Search, ShoppingCart, TrendingUp, Wallet,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Table from '@/components/common/Table';
import StatCard from '@/components/dashboard/StatCard';
import ExportMenu from '@/components/common/ExportMenu';
import OrderDetail from './OrderDetail';
import { salesService } from '@/services/salesService';
import { pdfService } from '@/services/pdfService';
import { excelService } from '@/services/excelService';
import { formatKSh, formatNumber } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import './Sales.css';

const statusTone = {
  COMPLETED: 'success',
  PENDING: 'warning',
  CANCELLED: 'neutral',
  REFUNDED: 'danger',
};

export default function Sales() {
  const toast = useToast();
  const { business } = useBusiness();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    revenue: 0,
    count: 0,
    avgOrder: 0,
    refunded: 0,
    creditSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [openOrder, setOpenOrder] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);

  const debouncedSearch = useDebounce(search, 250);

  const load = async () => {
    setLoading(true);
    const [list, sum] = await Promise.all([
      salesService.list({
        search: debouncedSearch,
        status,
        method,
        paymentStatus,
      }),
      salesService.summary(),
    ]);
    setRows(list);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, method, paymentStatus]);

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: 'Order',
        render: o => (
          <div>
            <div className="bold">#{o.id}</div>
            {o.reference && (
              <div className="mono faint" style={{ fontSize: 11 }}>
                {o.reference}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'date',
        label: 'Date',
        render: o => (
          <span className="mono faint" style={{ fontSize: 12 }}>
            {o.date}
          </span>
        ),
      },
      { key: 'customer', label: 'Customer' },
      { key: 'items', label: 'Items', align: 'center' },
      {
        key: 'total',
        label: 'Total',
        align: 'right',
        render: o => <span className="mono bold">{formatKSh(o.total)}</span>,
      },
      {
        key: 'method',
        label: 'Method',
        render: o => {
          if (o.paymentStatus === 'credit') {
            return <Badge tone="warning">On credit</Badge>;
          }
          return (
            <Badge tone={o.method === 'M-Pesa' ? 'primary' : 'neutral'}>
              {o.method}
            </Badge>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: o => <Badge tone={statusTone[o.status]}>{o.status}</Badge>,
      },
      {
        key: 'cashier',
        label: 'Cashier',
        render: o => <span className="muted">{o.cashier}</span>,
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        render: o => (
          <button
            className="icon-btn"
            onClick={e => {
              e.stopPropagation();
              setOpenOrder(o);
            }}
            aria-label="View order"
          >
            <Eye size={15} />
          </button>
        ),
      },
    ],
    []
  );

  const exportPdf = async () => {
    if (!rows.length) {
      toast.warning('Nothing to export yet.');
      return;
    }
    setExportBusy(true);
    try {
      const blob = await pdfService.generateTablePdf({
        title: 'Sales report',
        subtitle: `${rows.length} order${rows.length === 1 ? '' : 's'}`,
        business,
        columns: [
          {
            key: 'id',
            label: 'Order',
            width: 70,
            format: v => `#${v}`,
          },
          { key: 'date', label: 'Date', width: 130 },
          { key: 'customer', label: 'Customer', width: 150 },
          { key: 'items', label: 'Items', width: 55, align: 'right' },
          {
            key: 'total',
            label: 'Total',
            width: 100,
            align: 'right',
            format: v => formatKSh(v),
          },
          { key: 'method', label: 'Method', width: 90 },
          { key: 'status', label: 'Status', width: 100 },
          { key: 'cashier', label: 'Cashier', width: 100 },
        ],
        rows,
        footerNote: business.name,
      });
      pdfService.downloadBlob(
        blob,
        `sokoni-sales-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success('Sales PDF exported.');
    } catch (err) {
      toast.error(err.message || 'Could not export PDF.');
    } finally {
      setExportBusy(false);
    }
  };

  const exportExcel = () => {
    if (!rows.length) {
      toast.warning('Nothing to export yet.');
      return;
    }
    try {
      excelService.exportRows({
        filename: `sokoni-sales-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Sales',
        columns: [
          { key: 'id', label: 'Order', width: 12 },
          { key: 'date', label: 'Date', width: 20 },
          { key: 'customer', label: 'Customer', width: 22 },
          {
            key: 'items',
            label: 'Items',
            width: 10,
            align: 'right',
            type: 'int',
          },
          {
            key: 'total',
            label: 'Total',
            width: 16,
            align: 'right',
            type: 'money',
          },
          { key: 'method', label: 'Method', width: 14 },
          { key: 'status', label: 'Status', width: 14 },
          { key: 'cashier', label: 'Cashier', width: 18 },
          { key: 'reference', label: 'Reference', width: 20 },
        ],
        rows,
        meta: {
          Business: business.name || '',
          Report: 'Sales',
          Generated: new Date().toLocaleString('en-KE'),
        },
      });
      toast.success('Sales Excel exported.');
    } catch (err) {
      toast.error(err.message || 'Could not export Excel.');
    }
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-sub muted">
            Every transaction across your tills
          </p>
        </div>
        <ExportMenu
          label="Export"
          busy={exportBusy}
          onExportPdf={exportPdf}
          onExportExcel={exportExcel}
        />
      </header>

      <section className="sales-kpis">
        <StatCard
          label="Revenue"
          value={formatKSh(summary.revenue)}
          icon={TrendingUp}
          tone="primary"
          sub="this period"
        />
        <StatCard
          label="Total orders"
          value={formatNumber(summary.count)}
          icon={ShoppingCart}
          tone="info"
        />
        <StatCard
          label="Average order"
          value={formatKSh(summary.avgOrder)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Refunded"
          value={formatKSh(summary.refunded)}
          icon={RotateCcw}
          tone="danger"
          sub="needs review"
        />
      </section>

      <Card padding="md">
        <div className="sales-toolbar">
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input
              placeholder="Search by order ID, customer or reference"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <select
            className="select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <select
            className="select"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            <option value="all">All methods</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Cash">Cash</option>
          </select>
          <select
            className="select"
            value={paymentStatus}
            onChange={e => setPaymentStatus(e.target.value)}
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="credit">On credit</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            rows={rows}
            empty={loading ? 'Loading sales…' : 'No sales match your filters.'}
            onRowClick={o => setOpenOrder(o)}
          />
        </div>
      </Card>

      <OrderDetail
        open={!!openOrder}
        order={openOrder}
        onClose={() => setOpenOrder(null)}
        onRefund={async id => {
          await salesService.refund(id);
          await load();
          toast.success('Order refunded.');
        }}
      />
    </div>
  );
}