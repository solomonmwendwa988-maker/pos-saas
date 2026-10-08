import { useEffect, useMemo, useState } from 'react';
import { Search, User, UserPlus, X } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { customerService } from '@/services/customerService';
import { customerLedgerService } from '@/services/customerLedgerService';
import { formatKSh } from '@/utils/format';
import { useDebounce } from '@/hooks/useDebounce';


export default function CustomerPicker({
  open,
  selected,
  onSelect,
  onClear,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 180);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await customerService.list(debounced);
      const balances = customerLedgerService.allBalances();
      if (cancelled) return;
      setCustomers(list.map(c => ({ ...c, balance: balances[c.id] || 0 })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  const sorted = useMemo(
    () => [...customers].sort((a, b) => b.balance - a.balance),
    [customers]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={selected ? 'Change customer' : 'Add customer'}
      subtitle="Attach a customer to this sale"
      size="md"
      footer={
        <>
          {selected && (
            <Button
              variant="ghost"
              leftIcon={<X size={14} />}
              onClick={onClear}
            >
              Remove customer
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <div className="cp">
        <Input
          placeholder="Search by name, phone or email"
          value={query}
          onChange={e => setQuery(e.target.value)}
          leftIcon={<Search size={15} />}
          autoFocus
        />

        <div className="cp-list">
          {loading ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : sorted.length === 0 ? (
            <div className="cp-empty">
              <UserPlus size={26} />
              <p>No customers found</p>
              <span className="muted">
                Add customers from the Customers page, then pick them here.
              </span>
            </div>
          ) : (
            sorted.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cp-row ${selected?.id === c.id ? 'on' : ''}`}
                onClick={() => onSelect(c)}
              >
                <span className="cp-avatar">{c.name[0]}</span>
                <div className="cp-body">
                  <div className="cp-name">{c.name}</div>
                  <div className="cp-meta">
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ''}
                  </div>
                </div>
                {c.balance > 0 && (
                  <span className="cp-balance mono">
                    Owes {formatKSh(c.balance)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <style>{`
        .cp { display: flex; flex-direction: column; gap: 14px; }
        .cp-list {
          max-height: 380px; overflow-y: auto;
          border: 1px solid var(--border); border-radius: 12px;
        }
        .cp-row {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: transparent; border: 0;
          border-bottom: 1px solid var(--border);
          text-align: left; cursor: pointer;
          transition: background var(--dur-fast);
        }
        .cp-row:last-child { border-bottom: 0; }
        .cp-row:hover { background: var(--bg-soft); }
        .cp-row.on { background: var(--primary-50); }
        .cp-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #7c6cff, #22d3ee);
          color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: var(--font-display);
        }
        .cp-body { flex: 1; min-width: 0; }
        .cp-name { font-size: 13.5px; font-weight: 600; }
        .cp-meta {
          font-size: 12px; color: var(--text-muted); margin-top: 2px;
        }
        .cp-balance {
          font-size: 12px; font-weight: 700; color: var(--danger);
        }
        .cp-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 40px 20px; text-align: center;
          color: var(--text-faint);
        }
        .cp-empty p {
          margin: 6px 0 0; font-weight: 700;
          color: var(--text-muted); font-size: 14px;
        }
        .cp-empty .muted { font-size: 12.5px; }
      `}</style>
    </Modal>
  );
}