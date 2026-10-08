import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { formatKSh } from '@/utils/format';
import './ProductGrid.css';

export default function ProductGrid({
  products,
  onAdd,
  focusedIndex = 0,
  onFocusChange,
  gridRef,
  onKeyDown,
}) {
  // Scroll the focused card into view when it changes
  useEffect(() => {
    if (!gridRef?.current) return;
    const cards = gridRef.current.querySelectorAll('.pos-card');
    const card = cards[focusedIndex];
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedIndex, gridRef]);

  if (!products.length) {
    return (
      <div className="pos-empty">
        <div>No products match your search.</div>
      </div>
    );
  }

  return (
    <div
      className="pos-grid"
      ref={gridRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="grid"
      aria-label="Product grid"
    >
      {products.map((p, idx) => {
        const out = p.stock === 0;
        const low = !out && p.stock <= p.threshold;
        const focused = idx === focusedIndex;
        return (
          <button
            key={p.id}
            type="button"
            className={`pos-card ${out ? 'out' : ''} ${focused ? 'focused' : ''}`}
            onClick={() => !out && onAdd(p)}
            onMouseEnter={() => onFocusChange?.(idx)}
            disabled={out}
            data-index={idx}
            role="gridcell"
            aria-label={`${p.name}, ${formatKSh(p.price)}, ${p.stock} in stock`}
          >
            <div className="pos-thumb">{p.name[0]}</div>
            <div className="pos-name">{p.name}</div>
            <div className="pos-meta">
              <span className="pos-sku mono">{p.sku}</span>
              {low && <span className="pos-low">Low</span>}
              {out && <span className="pos-out">Out</span>}
            </div>
            <div className="pos-row">
              <span className="pos-price mono">{formatKSh(p.price)}</span>
              <span className="pos-stock mono">{p.stock} left</span>
            </div>
            {!out && (
              <span className="pos-add"><Plus size={14} /></span>
            )}
          </button>
        );
      })}
    </div>
  );
}