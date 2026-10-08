import { useEffect, useMemo, useState } from 'react';
import { Download, Minus, Plus, X } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { barcodeService } from '@/services/barcodeService';
import { pdfService } from '@/services/pdfService';
import { useBusiness } from '@/context/BusinessContext';
import { useToast } from '@/context/ToastContext';
import './LabelSheetModal.css';

const LABELS_PER_PAGE = 24;

export default function LabelSheetModal({ open, products = [], onClose }) {
  const toast = useToast();
  const { business } = useBusiness();
  const [quantities, setQuantities] = useState({});
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const seed = {};
    products.forEach(p => {
      seed[p.id] = 1;
    });
    setQuantities(seed);
  }, [open, products]);

  const totalLabels = useMemo(
    () =>
      Object.values(quantities).reduce(
        (s, q) => s + Math.max(0, Number(q) || 0),
        0
      ),
    [quantities]
  );

  const pageCount = Math.max(1, Math.ceil(totalLabels / LABELS_PER_PAGE));

  const setQty = (id, q) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, Number(q) || 0) }));

  const bump = (id, delta) =>
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (Number(prev[id]) || 0) + delta),
    }));

  const setAll = n => {
    const seed = {};
    products.forEach(p => {
      seed[p.id] = n;
    });
    setQuantities(seed);
  };

  const print = async () => {
    const expanded = [];
    products.forEach(p => {
      const copies = Math.max(0, Number(quantities[p.id]) || 0);
      for (let i = 0; i < copies; i++) expanded.push(p);
    });

    if (expanded.length === 0) {
      toast.warning('Set at least one copy for a product.');
      return;
    }

    setPrinting(true);
    try {
      const blob = await barcodeService.generateLabelSheet({
        business,
        products: expanded,
      });
      pdfService.downloadBlob(blob, `sokoni-labels-${Date.now()}.pdf`);
      toast.success(
        `${totalLabels} label${totalLabels === 1 ? '' : 's'} ready.`
      );
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Could not generate labels.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Print barcode labels"
      subtitle={`${products.length} product${
        products.length === 1 ? '' : 's'
      } · ${totalLabels} label${totalLabels === 1 ? '' : 's'}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={print}
            loading={printing}
            disabled={totalLabels === 0}
            leftIcon={<Download size={14} />}
          >
            Download {totalLabels} label{totalLabels === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="lsm">
        <div className="lsm-toolbar">
          <span className="lsm-toolbar-label">Copies per product</span>
          <div className="lsm-toolbar-actions">
            {[1, 2, 4, 6].map(n => (
              <button
                key={n}
                type="button"
                className="lsm-preset"
                onClick={() => setAll(n)}
              >
                All {n}
              </button>
            ))}
            <button
              type="button"
              className="lsm-preset lsm-preset-clear"
              onClick={() => setAll(0)}
            >
              <X size={13} /> Clear
            </button>
          </div>
        </div>

        <div className="lsm-list">
          {products.map(p => {
            const q = Number(quantities[p.id]) || 0;
            return (
              <div key={p.id} className="lsm-row">
                <div className="lsm-info">
                  <div className="lsm-name">{p.name}</div>
                  <div className="lsm-meta mono">
                    {p.sku} ·{' '}
                    {p.barcode
                      ? `barcode ${p.barcode}`
                      : 'no barcode (SKU will be printed)'}
                  </div>
                </div>
                <div className="lsm-qty">
                  <button
                    type="button"
                    className="lsm-step"
                    onClick={() => bump(p.id, -1)}
                    aria-label="Decrease"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    className="lsm-input mono"
                    value={q}
                    onChange={e => setQty(p.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="lsm-step"
                    onClick={() => bump(p.id, 1)}
                    aria-label="Increase"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lsm-summary">
          <span>24 labels fit per A4 page</span>
          <span className="mono">
            {pageCount} page{pageCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </Modal>
  );
}