import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Boxes, CreditCard, FileText, LayoutDashboard,
  Package, Plus, Receipt, Search, Settings, ShoppingCart, Truck, User,
  UserPlus, Users, X,
} from 'lucide-react';
import { searchService } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import './CommandPalette.css';

const COMMANDS = [
  { id: 'go-dashboard',   label: 'Go to Dashboard',   to: '/dashboard',            icon: LayoutDashboard, keywords: 'home overview' },
  { id: 'go-pos',         label: 'Open POS',          to: '/pos',                  icon: ShoppingCart,    keywords: 'sell checkout till counter' },
  { id: 'go-products',    label: 'View Products',     to: '/products',             icon: Package,         keywords: 'catalogue items stock' },
  { id: 'go-inventory',   label: 'View Inventory',    to: '/inventory',            icon: Boxes,           keywords: 'stock restock' },
  { id: 'go-sales',       label: 'View Sales',        to: '/sales',                icon: Receipt,         keywords: 'orders transactions' },
  { id: 'go-customers',   label: 'View Customers',    to: '/customers',            icon: Users,           keywords: 'buyers clients' },
  { id: 'go-suppliers',   label: 'View Suppliers',    to: '/suppliers',            icon: Truck,           keywords: 'vendors' },
  { id: 'go-reports',     label: 'View Reports',      to: '/reports',              icon: FileText,        keywords: 'export csv pdf' },
  { id: 'go-analytics',   label: 'View Analytics',    to: '/analytics',            icon: BarChart3,       keywords: 'charts trends' },
  { id: 'go-subscription',label: 'Subscription',      to: '/subscription',         icon: CreditCard,      keywords: 'plan billing upgrade' },
  { id: 'go-settings',    label: 'Business Settings', to: '/settings/business',    icon: Settings,        keywords: 'preferences' },
  { id: 'go-profile',     label: 'Your Profile',      to: '/profile',              icon: User,            keywords: 'account me' },
  { id: 'new-product',    label: 'Add new product',   to: '/products?new=1',       icon: Plus,            keywords: 'create item' },
  { id: 'new-customer',   label: 'Add new customer',  to: '/customers?new=1',      icon: UserPlus,        keywords: 'create buyer' },
];

const KIND_META = {
  command:  { icon: ArrowRight, label: 'Actions' },
  product:  { icon: Package,    label: 'Products' },
  order:    { icon: Receipt,    label: 'Orders' },
  customer: { icon: Users,      label: 'Customers' },
  supplier: { icon: Truck,      label: 'Suppliers' },
};

const KIND_ORDER = ['command', 'product', 'order', 'customer', 'supplier'];

function filterCommands(query) {
  const q = query.trim().toLowerCase();
  if (!q) return COMMANDS.slice();
  return COMMANDS.filter(c =>
    c.label.toLowerCase().includes(q) ||
    (c.keywords || '').toLowerCase().includes(q)
  );
}

export default function CommandPalette() {
  const nav = useNavigate();
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [entityResults, setEntityResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const debounced = useDebounce(query, 150);

  // Global Cmd/Ctrl+K to open
  useKeyboardShortcut(
    () => { setOpen(true); setQuery(''); setActiveIndex(0); },
    { key: 'k', mod: true, enabled: !open }
  );

  // Esc to close (also when open)
  useKeyboardShortcut(
    () => setOpen(false),
    { key: 'Escape', enabled: open, preventDefault: false }
  );

  // Lock scroll while open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Load entity results
  useEffect(() => {
    let cancelled = false;
    if (!debounced.trim()) {
      setEntityResults([]);
      setLoadingEntities(false);
      return;
    }
    setLoadingEntities(true);
    searchService.search(debounced).then(list => {
      if (cancelled) return;
      setEntityResults(list);
      setActiveIndex(0);
      setLoadingEntities(false);
    });
    return () => { cancelled = true; };
  }, [debounced]);

  const commands = useMemo(() => filterCommands(debounced), [debounced]);

  const grouped = useMemo(() => {
    const groups = [{ kind: 'command', items: commands }];
    const byKind = {};
    entityResults.forEach(r => {
      if (!byKind[r.kind]) byKind[r.kind] = [];
      byKind[r.kind].push(r);
    });
    KIND_ORDER
      .filter(k => k !== 'command' && byKind[k]?.length)
      .forEach(k => groups.push({ kind: k, items: byKind[k] }));
    return groups.filter(g => g.items.length > 0);
  }, [commands, entityResults]);

  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(Math.max(0, flat.length - 1));
  }, [flat.length, activeIndex]);

  const close = () => { setOpen(false); setQuery(''); };

  const run = item => {
    if (!item) return;
    close();
    nav(item.to);
  };

  const onKeyDown = e => {
    if (!flat.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="cp-scrim fade-in" onClick={close}>
      <div
        className="cp fade-up"
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cp-input">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or type a command…"
            aria-label="Command palette search"
          />
          <button className="cp-close" onClick={close} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="cp-body">
          {flat.length === 0 && !loadingEntities && (
            <div className="cp-empty">
              <div className="cp-empty-title">
                {query.trim() ? `No results for "${query}"` : 'Start typing to search'}
              </div>
              <div className="cp-empty-sub">
                Try a product name, order number, customer, or an action like "pos".
              </div>
            </div>
          )}

          {grouped.map(group => {
            const meta = KIND_META[group.kind];
            const Icon = meta.icon;
            return (
              <div key={group.kind} className="cp-group">
                <div className="cp-group-head">
                  <Icon size={12} />
                  <span>{meta.label}</span>
                </div>
                {group.items.map(item => {
                  const idx = flat.indexOf(item);
                  const RowIcon = item.icon || meta.icon;
                  const isCommand = group.kind === 'command';
                  return (
                    <button
                      key={`${group.kind}-${item.id}`}
                      className={`cp-row ${idx === activeIndex ? 'on' : ''}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => run(item)}
                    >
                      <span className="cp-row-icon">
                        <RowIcon size={15} />
                      </span>
                      <span className="cp-row-body">
                        <span className="cp-row-label">
                          {isCommand ? item.label : item.label}
                        </span>
                        {!isCommand && (
                          <span className="cp-row-sub">{item.sublabel}</span>
                        )}
                      </span>
                      <ArrowRight size={13} className="cp-row-arrow" />
                    </button>
                  );
                })}
              </div>
            );
          })}

          {loadingEntities && query.trim() && (
            <div className="cp-loading">Searching…</div>
          )}
        </div>

        <div className="cp-foot">
          <div className="cp-foot-left">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
          </div>
          <div className="cp-foot-right">Sokoni Command</div>
        </div>
      </div>
    </div>
  );
}