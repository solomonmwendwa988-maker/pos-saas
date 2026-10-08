import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote, Clock, CreditCard, Download, Play, Receipt, SquareStack, StopCircle,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Table from '@/components/common/Table';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import StatCard from '../dashboard/StatCard';
import { shiftService } from '@/services/shiftService';
import { salesService } from '@/services/salesService';
import { eventBus, EVENTS } from '@/services/eventBus';
import { useShift } from '@/context/ShiftContext';
import { useLiveDuration } from '@/hooks/useLiveDuration';
import { useToast } from '@/context/ToastContext';
import {
  computeShiftSummary,
  formatDateTime,
  formatDuration,
  formatTime,
} from '@/utils/shiftSummary';
import { formatKSh } from '@/utils/format';
import './Shifts.css';

export default function Shifts() {
  const toast = useToast();
  const {
    activeShift,
    summary: liveSummary,
    lastOrder,
    startShift,
    closeShift,
  } = useShift();

  const [shifts, setShifts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  const [startOpen, setStartOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const liveDuration = useLiveDuration(activeShift?.openedAt, activeShift?.closedAt);

  const load = useCallback(async () => {
    const [s, o] = await Promise.all([
      shiftService.list(),
      salesService.list(),
    ]);
    setShifts(s);
    setOrders(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // React to sale + shift events in real time
  useEffect(() => {
    const offSale = eventBus.on(EVENTS.SALE_COMPLETED, () => load());
    const offRefund = eventBus.on(EVENTS.SALE_REFUNDED, () => load());
    const offStart = eventBus.on(EVENTS.SHIFT_STARTED, () => load());
    const offClose = eventBus.on(EVENTS.SHIFT_CLOSED, () => load());
    return () => {
      offSale();
      offRefund();
      offStart();
      offClose();
    };
  }, [load]);

  const enriched = useMemo(
    () => shifts.map(s => ({ ...s, summary: computeShiftSummary(s, orders) })),
    [shifts, orders]
  );

  const closedShifts = enriched.filter(s => s.status === 'closed');

  const totalRevenue = closedShifts.reduce((sum, s) => sum + s.summary.totalSales, 0);

  const totalVariance = closedShifts.reduce(
    (sum, s) => sum + (s.summary.discrepancy || 0),
    0
  );

  const doStart = async () => {
    setBusy(true);
    try {
      await startShift(Number(openingCash) || 0);
      setStartOpen(false);
      setOpeningCash('');
      toast.success('Shift started.');
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not start shift.');
    } finally {
      setBusy(false);
    }
  };

  const openClose = () => {
    if (!activeShift) return;
    setClosingCash(String(liveSummary.expectedCash));
    setNotes('');
    setCloseOpen(true);
  };

  const doClose = async () => {
    if (!activeShift) return;
    setBusy(true);
    try {
      await closeShift(activeShift.id, {
        closingCash: Number(closingCash) || 0,
        notes,
      });
      setCloseOpen(false);
      toast.success('Shift closed.');
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not close shift.');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    if (!enriched.length) {
      toast.warning('No shifts to export.');
      return;
    }
    const rows = enriched.map(s => ({
      Shift: s.id,
      Cashier: s.cashier,
      Opened: formatDateTime(s.openedAt),
      Closed: s.closedAt ? formatDateTime(s.closedAt) : 'Still open',
      Orders: s.summary.orders,
      'Total sales': s.summary.totalSales,
      'Cash sales': s.summary.cashSales,
      'M-Pesa sales': s.summary.mpesaSales,
      'Opening cash': s.openingCash,
      'Expected cash': s.summary.expectedCash,
      'Closing cash': s.closingCash ?? '',
      Discrepancy: s.summary.discrepancy ?? '',
      Notes: s.notes || '',
    }));
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map(r =>
        header.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sokoni-shifts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Shifts exported.');
  };

  const columns = [
    { key: 'cashier', label: 'Cashier', render: s => <span className="bold">{s.cashier}</span> },
    { key: 'openedAt', label: 'Opened', render: s => (
      <span className="mono faint" style={{ fontSize: 12 }}>{formatDateTime(s.openedAt)}</span>
    )},
    { key: 'duration', label: 'Duration', render: s => (
      <span className="mono faint" style={{ fontSize: 12 }}>
        {formatDuration((s.closedAt || Date.now()) - s.openedAt)}
      </span>
    )},
    { key: 'orders', label: 'Orders', align: 'center', render: s => (
      <span className="mono bold">{s.summary.orders}</span>
    )},
    { key: 'totalSales', label: 'Total sales', align: 'right', render: s => (
      <span className="mono bold">{formatKSh(s.summary.totalSales)}</span>
    )},
    { key: 'cash', label: 'Cash', align: 'right', render: s => (
      <span className="mono">{formatKSh(s.summary.cashSales)}</span>
    )},
    { key: 'mpesa', label: 'M-Pesa', align: 'right', render: s => (
      <span className="mono">{formatKSh(s.summary.mpesaSales)}</span>
    )},
    { key: 'disc', label: 'Discrepancy', align: 'right', render: s => {
      if (s.status !== 'closed' || s.summary.discrepancy === null) {
        return <span className="faint">—</span>;
      }
      const d = s.summary.discrepancy;
      if (d === 0) return <Badge tone="success">Balanced</Badge>;
      return (
        <Badge tone={d > 0 ? 'info' : 'danger'}>
          {d > 0 ? '+' : '−'}{formatKSh(Math.abs(d)).replace('KSh ', '')}
        </Badge>
      );
    }},
    { key: 'status', label: 'Status', render: s => (
      <Badge tone={s.status === 'open' ? 'success' : 'neutral'}>
        {s.status === 'open' ? 'Open' : 'Closed'}
      </Badge>
    )},
    { key: 'actions', label: '', align: 'right', render: s => (
      <button
        className="icon-btn"
        onClick={e => { e.stopPropagation(); setViewing(s); }}
        aria-label="View shift"
      >
        <Receipt size={14} />
      </button>
    )},
  ];

  const viewSummary = viewing
    ? computeShiftSummary(viewing, orders)
    : null;

  const closeDelta = Number(closingCash) - liveSummary.expectedCash;

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Cashier shifts</h1>
          <p className="page-sub muted">
            Track who is on shift, cash in the till, and daily reconciliation
          </p>
        </div>
        <div className="row gap-8">
          {!activeShift && (
            <Button leftIcon={<Play size={14} />} onClick={() => setStartOpen(true)}>
              Start shift
            </Button>
          )}
          <Button variant="outline" leftIcon={<Download size={14} />} onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </header>

      {/* ---------- Live active shift card ---------- */}
      {activeShift ? (
        <section className="shift-live-card">
          <div className="shift-live-head">
            <div className="row gap-12">
              <span className="shift-live-dot" />
              <div>
                <div className="shift-live-title">
                  Shift active
                  <span className="shift-live-chip">LIVE</span>
                </div>
                <div className="shift-live-sub">
                  {activeShift.cashier} · opened {formatTime(activeShift.openedAt)} · {formatDuration(liveDuration)}
                </div>
              </div>
            </div>
            <Button variant="danger" leftIcon={<StopCircle size={14} />} onClick={openClose}>
              Close shift
            </Button>
          </div>

          <div className="shift-live-grid">
            <div className="shift-live-cell">
              <Receipt size={14} />
              <div>
                <div className="shift-live-label">Orders</div>
                <div className="shift-live-value mono">{liveSummary.orders}</div>
              </div>
            </div>
            <div className="shift-live-cell">
              <Banknote size={14} />
              <div>
                <div className="shift-live-label">Cash</div>
                <div className="shift-live-value mono">{formatKSh(liveSummary.cashSales)}</div>
              </div>
            </div>
            <div className="shift-live-cell">
              <CreditCard size={14} />
              <div>
                <div className="shift-live-label">M-Pesa</div>
                <div className="shift-live-value mono">{formatKSh(liveSummary.mpesaSales)}</div>
              </div>
            </div>
            <div className="shift-live-cell wide">
              <SquareStack size={14} />
              <div>
                <div className="shift-live-label">Total sales</div>
                <div className="shift-live-value mono big">
                  {formatKSh(liveSummary.totalSales)}
                </div>
              </div>
            </div>
          </div>

          {lastOrder && (
            <div className="shift-live-last">
              <span className="shift-live-last-badge">Latest sale</span>
              <span className="mono bold">{formatKSh(lastOrder.total)}</span>
              <span className="muted">{lastOrder.method}</span>
              <span className="shift-live-last-time">
                {new Date(lastOrder.createdAt).toLocaleTimeString('en-KE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </section>
      ) : (
        <Card padding="lg">
          <div className="shift-idle">
            <span className="shift-idle-icon"><Clock size={26} /></span>
            <h3>No shift is currently open</h3>
            <p className="muted">
              Start a shift from the POS or from here to begin tracking cash,
              sales and reconciliation per cashier.
            </p>
            <Button leftIcon={<Play size={14} />} onClick={() => setStartOpen(true)}>
              Start a shift
            </Button>
          </div>
        </Card>
      )}

      {/* ---------- KPI row ---------- */}
      <section className="shift-kpis">
        <StatCard label="Open shifts" value={activeShift ? 1 : 0} icon={Clock} tone="primary" />
        <StatCard label="Total shifts" value={enriched.length} icon={Receipt} tone="info" />
        <StatCard
          label="Revenue (closed)"
          value={formatKSh(totalRevenue)}
          icon={SquareStack}
          tone="success"
        />
        <StatCard
          label="Net variance"
          value={formatKSh(totalVariance)}
          icon={Banknote}
          tone={totalVariance < 0 ? 'danger' : 'info'}
          sub="shortage + overage"
        />
      </section>

      {/* ---------- History table ---------- */}
      {enriched.length === 0 ? null : (
        <Card
          title="Shift history"
          subtitle="Every shift recorded in this workspace"
          padding="md"
        >
          <Table
            columns={columns}
            rows={enriched}
            empty="No shifts recorded."
            onRowClick={s => setViewing(s)}
          />
        </Card>
      )}

      {/* ---------- Start shift modal ---------- */}
      <Modal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="Start a shift"
        subtitle="Track cash and sales for this session."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStartOpen(false)}>Cancel</Button>
            <Button onClick={doStart} loading={busy} leftIcon={<Play size={14} />}>
              Start shift
            </Button>
          </>
        }
      >
        <div className="sp-modal">
          <p className="sp-modal-intro">
            Count the cash in your till before you start selling. This becomes
            the opening float for the shift and is used to reconcile at the end.
          </p>
          <Input
            label="Opening cash (KSh)"
            type="number"
            min="0"
            value={openingCash}
            onChange={e => setOpeningCash(e.target.value)}
            placeholder="e.g. 2000"
            autoFocus
          />
        </div>
      </Modal>

      {/* ---------- Close shift modal ---------- */}
      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Close shift"
        subtitle={activeShift ? `Opened ${formatTime(activeShift.openedAt)} · ${formatDuration(liveDuration)}` : ''}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button onClick={doClose} loading={busy} leftIcon={<StopCircle size={14} />}>
              Close shift
            </Button>
          </>
        }
      >
        {activeShift && (
          <div className="sp-modal">
            <div className="sp-summary-grid">
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><Receipt size={14} /></span>
                <div>
                  <div className="sp-cell-label">Orders</div>
                  <div className="sp-cell-value mono">{liveSummary.orders}</div>
                </div>
              </div>
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><Banknote size={14} /></span>
                <div>
                  <div className="sp-cell-label">Cash sales</div>
                  <div className="sp-cell-value mono">{formatKSh(liveSummary.cashSales)}</div>
                </div>
              </div>
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><CreditCard size={14} /></span>
                <div>
                  <div className="sp-cell-label">M-Pesa sales</div>
                  <div className="sp-cell-value mono">{formatKSh(liveSummary.mpesaSales)}</div>
                </div>
              </div>
              <div className="sp-summary-cell wide">
                <span className="sp-cell-icon"><SquareStack size={14} /></span>
                <div>
                  <div className="sp-cell-label">Total sales</div>
                  <div className="sp-cell-value mono big">{formatKSh(liveSummary.totalSales)}</div>
                </div>
              </div>
            </div>

            <div className="sp-reconcile">
              <div className="sp-line">
                <span>Opening cash</span>
                <span className="mono">{formatKSh(activeShift.openingCash)}</span>
              </div>
              <div className="sp-line">
                <span>Cash sales</span>
                <span className="mono">+ {formatKSh(liveSummary.cashSales)}</span>
              </div>
              <div className="sp-line total">
                <span>Expected cash in till</span>
                <span className="mono">{formatKSh(liveSummary.expectedCash)}</span>
              </div>
            </div>

            <Input
              label="Actual cash counted (KSh)"
              type="number"
              min="0"
              value={closingCash}
              onChange={e => setClosingCash(e.target.value)}
              autoFocus
            />

            {closingCash !== '' && Number(closingCash) >= 0 && (
              <div
                className={`sp-delta ${
                  closeDelta === 0 ? 'ok' : closeDelta > 0 ? 'over' : 'short'
                }`}
              >
                <span className="sp-delta-label">
                  {closeDelta === 0
                    ? 'Till balances exactly.'
                    : closeDelta > 0
                    ? 'Over by'
                    : 'Short by'}
                </span>
                <span className="sp-delta-value mono">
                  {formatKSh(Math.abs(closeDelta))}
                </span>
              </div>
            )}

            <div className="field">
              <label className="field-label">Notes (optional)</label>
              <div className="field-control" style={{ padding: 0 }}>
                <textarea
                  rows={2}
                  className="field-input"
                  style={{ padding: '10px 12px', resize: 'vertical' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Explain any overage or shortfall"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- View shift modal ---------- */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Shift · ${viewing.cashier}` : ''}
        subtitle={viewing ? formatDateTime(viewing.openedAt) : ''}
        size="md"
        footer={<Button onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && viewSummary && (
          <div className="stack gap-20">
            <div className="sp-summary-grid">
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><Receipt size={14} /></span>
                <div>
                  <div className="sp-cell-label">Orders</div>
                  <div className="sp-cell-value mono">{viewSummary.orders}</div>
                </div>
              </div>
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><Clock size={14} /></span>
                <div>
                  <div className="sp-cell-label">Duration</div>
                  <div className="sp-cell-value mono">
                    {formatDuration((viewing.closedAt || Date.now()) - viewing.openedAt)}
                  </div>
                </div>
              </div>
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><Banknote size={14} /></span>
                <div>
                  <div className="sp-cell-label">Cash sales</div>
                  <div className="sp-cell-value mono">{formatKSh(viewSummary.cashSales)}</div>
                </div>
              </div>
              <div className="sp-summary-cell">
                <span className="sp-cell-icon"><CreditCard size={14} /></span>
                <div>
                  <div className="sp-cell-label">M-Pesa sales</div>
                  <div className="sp-cell-value mono">{formatKSh(viewSummary.mpesaSales)}</div>
                </div>
              </div>
            </div>

            <div className="sp-reconcile">
              <div className="sp-line">
                <span>Opening cash</span>
                <span className="mono">{formatKSh(viewing.openingCash)}</span>
              </div>
              <div className="sp-line">
                <span>Cash sales</span>
                <span className="mono">+ {formatKSh(viewSummary.cashSales)}</span>
              </div>
              <div className="sp-line total">
                <span>Expected cash</span>
                <span className="mono">{formatKSh(viewSummary.expectedCash)}</span>
              </div>
              {viewing.status === 'closed' && (
                <>
                  <div className="sp-line">
                    <span>Actual cash counted</span>
                    <span className="mono">{formatKSh(viewing.closingCash)}</span>
                  </div>
                  <div className="sp-line">
                    <span>Discrepancy</span>
                    <span
                      className="mono"
                      style={{
                        color:
                          viewSummary.discrepancy === 0
                            ? 'var(--success)'
                            : viewSummary.discrepancy > 0
                            ? 'var(--info)'
                            : 'var(--danger)',
                      }}
                    >
                      {viewSummary.discrepancy === 0
                        ? 'Balanced'
                        : `${viewSummary.discrepancy > 0 ? '+' : '−'}${formatKSh(
                            Math.abs(viewSummary.discrepancy)
                          )}`}
                    </span>
                  </div>
                </>
              )}
            </div>

            {viewing.notes && (
              <div className="shift-notes">
                <div className="shift-notes-label">Notes</div>
                <div className="shift-notes-body">{viewing.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}