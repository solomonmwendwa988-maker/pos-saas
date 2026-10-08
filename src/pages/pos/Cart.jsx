import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Button from '@/components/common/Button';
import { formatKSh } from '@/utils/format';

export default function Cart({
  items,
  onInc,
  onDec,
  onRemove,
  onClear,
  discount,
  setDiscount,
  tax,
  subtotal,
  total,
  onCheckout,
}) {
  return (
    <div className="cart">
      <header className="cart-head">
        <div className="row gap-8">
          <ShoppingBag size={16} />
          <span>Current sale</span>
        </div>
        {items.length > 0 && (
          <button className="cart-clear" onClick={onClear}>Clear</button>
        )}
      </header>

      <div className="cart-body">
        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={32} />
            <p>Cart is empty</p>
            <span className="muted">Tap products to add them</span>
          </div>
        ) : (
          <ul className="cart-list">
            {items.map(it => (
              <li key={it.id} className="cart-item">
                <div className="cart-item-main">
                  <div className="cart-item-name">{it.name}</div>
                  <div className="cart-item-price mono">{formatKSh(it.price)}</div>
                </div>
                <div className="cart-qty">
                  <button onClick={() => onDec(it.id)} aria-label="Decrease"><Minus size={12} /></button>
                  <span className="mono">{it.qty}</span>
                  <button onClick={() => onInc(it.id)} aria-label="Increase"><Plus size={12} /></button>
                </div>
                <div className="cart-item-total mono">{formatKSh(it.qty * it.price)}</div>
                <button className="cart-remove" onClick={() => onRemove(it.id)} aria-label="Remove">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cart-foot">
        <div className="cart-line">
          <span>Subtotal</span>
          <span className="mono">{formatKSh(subtotal)}</span>
        </div>
        <div className="cart-line">
          <span>Discount</span>
          <input
            className="cart-input mono"
            type="number"
            min="0"
            value={discount || ''}
            onChange={e => setDiscount(Number(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
        <div className="cart-line">
          <span>VAT (16%)</span>
          <span className="mono">{formatKSh(tax)}</span>
        </div>
        <div className="cart-line total">
          <span>Total</span>
          <span className="mono">{formatKSh(total)}</span>
        </div>

        <Button full size="lg" onClick={onCheckout} disabled={!items.length}>
          Charge {formatKSh(total)}
        </Button>
      </div>
    </div>
  );
}