import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownRight, ArrowUpRight, Banknote, CheckCircle2, Clock, CreditCard,
  Play, Receipt, SquareStack, StopCircle, TrendingUp, X, Zap,
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { useShift } from '@/context/ShiftContext';
import { useToast } from '@/context/ToastContext';
import { useLiveDuration } from '@/hooks/useLiveDuration';
import { formatDuration, formatTime } from '@/utils/shiftSummary';
import { formatKSh } from '@/utils/format';
import './ShiftPanel.css';

export default function ShiftPanel() {
  const toast = useToast();
  const {
    activeShift,
    summary,
    lastOrder,
    startShift,
    closeShift,
  } = useShift();

  const [panelOpen, setPanelOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const liveDuration = useLiveDuration(activeShift?.openedAt, activeShift?.closedAt);

  // Pulse the pill briefly when a new sale arrives
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!lastOrder) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 900);
    return () => clearTimeout(t);
  }, [lastOrder?.id]);

  // Compute panel position from the trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = 380;
    // Align right edge of panel with right edge of trigger, keep within viewport
    const right = Math.min(
      window.innerWidth - 16,
      Math.max(panelWidth + 16, rect.right)
    );
    setCoords({
      top: rect.bottom + 10,
      right: window.innerWidth - right,
    });
  }, []);

  useLayoutEffect(() => {
    if (!panelOpen) return;
    updatePosition();
    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [panelOpen, updatePosition]);

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = e => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

  // Click outside the panel and outside the trigger closes it
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = e => {
      if (panelRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setPanelOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [panelOpen]);

  const doStart = async () => {
    setBusy(true);
    try {
      await startShift(Number(openingCash) || 0);
      setStartOpen(false);
      setOpeningCash('');
      setPanelOpen(true);
      toast.success('Shift started.');
    } catch (e) {
      toast.error(e.message || 'Could not start shift.');
    } finally {
      setBusy(false);
    }
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
      setPanelOpen(false);
      setClosingCash('');
      setNotes('');
      toast.success('Shift closed.');
    } catch (e) {
      toast.error(e.message || 'Could not close shift.');
    } finally {
      setBusy(false);
    }
  };

  const openStart = () => {
    setOpeningCash('');
    setStartOpen(true);
  };

  const openClose = () => {
    setPanelOpen(false);
    setClosingCash(String(summary.expectedCash));
    setNotes('');
    setCloseOpen(true);
  };

  const closeDelta = Number(closingCash) - summary.expectedCash;

  // ---------- No active shift ----------
  if (!activeShift) {
    return (
      <>
        <button
          ref={triggerRef}
          className="sp-pill idle"
          onClick={openStart}
          title="Start a shift to track cash and sales"
        >
          <Play size={13} />
          <span>Start shift</span>
        </button>

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
      </>
    );
  }

  // ---------- Active shift ----------
  const panel = panelOpen && coords ? createPortal(
    <>
      {/* Backdrop dims the POS behind the panel so it stands out */}
      <div className="sp-backdrop fade-in" onClick={() => setPanelOpen(false)} aria-hidden="true" />

      <div
        ref={panelRef}
        className="sp-panel fade-up"
        style={{ top: coords.top, right: coords.right }}
        role="dialog"
        aria-label="Live shift details"
      >
        <header className="sp-head">
          <div>
            <div className="sp-head-row">
              <span className="sp-dot" />
              <span className="sp-head-title">Shift active</span>
              <span className="sp-live-chip">LIVE</span>
            </div>
            <div className="sp-head-sub">
              {activeShift.cashier} · opened {formatTime(activeShift.openedAt)} · {formatDuration(liveDuration)}
            </div>
          </div>
          <button className="sp-close" onClick={() => setPanelOpen(false)} aria-label="Close">
            <X size={15} />
          </button>
        </header>

        <div className="sp-body">
          {/* Hero metric */}
          <div className="sp-hero">
            <div className="sp-hero-label">Total sales this shift</div>
            <div className="sp-hero-value mono">{formatKSh(summary.totalSales)}</div>
            <div className="sp-hero-sub">
              {summary.orders} order{summary.orders === 1 ? '' : 's'} · {formatDuration(liveDuration)}
            </div>
          </div>

          {/* Metric grid */}
          <div className="sp-metrics">
            <div className="sp-metric">
              <span className="sp-metric-icon sp-icon-cash"><Banknote size={16} /></span>
              <div className="sp-metric-body">
                <div className="sp-metric-label">Cash</div>
                <div className="sp-metric-value mono">{formatKSh(summary.cashSales)}</div>
                <div className="sp-metric-sub">{summary.cashOrders || 0} orders</div>
              </div>
            </div>
            <div className="sp-metric">
              <span className="sp-metric-icon sp-icon-mpesa"><CreditCard size={16} /></span>
              <div className="sp-metric-body">
                <div className="sp-metric-label">M-Pesa</div>
                <div className="sp-metric-value mono">{formatKSh(summary.mpesaSales)}</div>
                <div className="sp-metric-sub">{summary.mpesaOrders || 0} orders</div>
              </div>
            </div>
            <div className="sp-metric">
              <span className="sp-metric-icon sp-icon-orders"><Receipt size={16} /></span>
              <div className="sp-metric-body">
                <div className="sp-metric-label">Orders</div>
                <div className="sp-metric-value mono">{summary.orders}</div>
                <div className="sp-metric-sub">this shift</div>
              </div>
            </div>
            <div className="sp-metric">
              <span className="sp-metric-icon sp-icon-till"><SquareStack size={16} /></span>
              <div className="sp-metric-body">
                <div className="sp-metric-label">Expected in till</div>
                <div className="sp-metric-value mono">{formatKSh(summary.expectedCash)}</div>
                <div className="sp-metric-sub">float + cash</div>
              </div>
            </div>
          </div>

          {/* Reconciliation breakdown */}
          <div className="sp-reconcile">
            <div className="sp-line">
              <span>Opening float</span>
              <span className="mono">{formatKSh(activeShift.openingCash)}</span>
            </div>
            <div className="sp-line">
              <span>+ Cash sales</span>
              <span className="mono">{formatKSh(summary.cashSales)}</span>
            </div>
            <div className="sp-line total">
              <span>Expected cash in till</span>
              <span className="mono">{formatKSh(summary.expectedCash)}</span>
            </div>
          </div>

          {/* Last sale */}
          {lastOrder && (
            <div className="sp-last">
              <span className="sp-last-badge">
                <TrendingUp size={11} /> Latest sale
              </span>
              <span className="sp-last-amount mono">{formatKSh(lastOrder.total)}</span>
              <span className="sp-last-method">{lastOrder.method}</span>
              <span className="sp-last-time">
                {new Date(lastOrder.createdAt).toLocaleTimeString('en-KE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {summary.orders === 0 && (
            <div className="sp-hint">
              <Zap size={13} />
              <span>Make your first sale to see it appear here instantly.</span>
            </div>
          )}
        </div>

        <footer className="sp-foot">
          <button className="sp-close-btn" onClick={openClose}>
            <StopCircle size={14} />
            Close shift
          </button>
          <button className="sp-dismiss" onClick={() => setPanelOpen(false)}>
            Keep selling
          </button>
        </footer>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        className={`sp-pill live ${pulse ? 'pulse' : ''} ${panelOpen ? 'on' : ''}`}
        onClick={() => setPanelOpen(o => !o)}
        title="View live shift"
      >
        <span className="sp-dot" />
        <span className="sp-pill-label">Shift</span>
        <span className="sp-pill-sep">·</span>
        <span className="sp-pill-time mono">{formatDuration(liveDuration)}</span>
        <span className="sp-pill-sep">·</span>
        <span className="sp-pill-sales mono">{formatKSh(summary.totalSales)}</span>
      </button>

      {panel}

      {/* ---------- Close modal ---------- */}
      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Close shift"
        subtitle={`Opened ${formatTime(activeShift.openedAt)} · ${formatDuration(liveDuration)}`}
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
        <div className="sp-modal">
          <div className="sp-summary-grid">
            <div className="sp-summary-cell">
              <span className="sp-cell-icon"><Receipt size={14} /></span>
              <div>
                <div className="sp-cell-label">Orders</div>
                <div className="sp-cell-value mono">{summary.orders}</div>
              </div>
            </div>
            <div className="sp-summary-cell">
              <span className="sp-cell-icon"><Banknote size={14} /></span>
              <div>
                <div className="sp-cell-label">Cash sales</div>
                <div className="sp-cell-value mono">{formatKSh(summary.cashSales)}</div>
              </div>
            </div>
            <div className="sp-summary-cell">
              <span className="sp-cell-icon"><CreditCard size={14} /></span>
              <div>
                <div className="sp-cell-label">M-Pesa sales</div>
                <div className="sp-cell-value mono">{formatKSh(summary.mpesaSales)}</div>
              </div>
            </div>
            <div className="sp-summary-cell wide">
              <span className="sp-cell-icon"><SquareStack size={14} /></span>
              <div>
                <div className="sp-cell-label">Total sales</div>
                <div className="sp-cell-value mono big">{formatKSh(summary.totalSales)}</div>
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
              <span className="mono">+ {formatKSh(summary.cashSales)}</span>
            </div>
            <div className="sp-line total">
              <span>Expected cash in till</span>
              <span className="mono">{formatKSh(summary.expectedCash)}</span>
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
              <span className="sp-delta-icon">
                {closeDelta === 0 ? (
                  <CheckCircle2 size={16} />
                ) : closeDelta > 0 ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}
              </span>
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
      </Modal>
    </>
  );
}