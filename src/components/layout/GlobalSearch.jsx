import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Boxes, FileText, Package, Receipt, Search, Truck, Users,
} from 'lucide-react';
import { searchService } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import { useClickOutside } from '@/hooks/useClickOutside';
import './GlobalSearch.css';

const KIND_META = {
  product:  { icon: Package, label: 'Products' },
  order:    { icon: Receipt, label: 'Orders' },
  customer: { icon: Users,   label: 'Customers' },
  supplier: { icon: Truck,   label: 'Suppliers' },
};

const GROUP_ORDER = ['product', 'order', 'customer', 'supplier'];

export default function GlobalSearch() {
  const nav = useNavigate();
  const wrapRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const debounced = useDebounce(query, 200);

  useClickOutside(wrapRef, () => setOpen(false), open);

  useEffect(() => {
    let cancelled = false;
    if (!debounced.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchService.search(debounced).then(list => {
      if (cancelled) return;
      setResults(list);
      setActiveIndex(0);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debounced]);

  const grouped = useMemo(() => {
    const map = {};
    results.forEach(r => {
      if (!map[r.kind]) map[r.kind] = [];
      map[r.kind].push(r);
    });
    return GROUP_ORDER
      .filter(k => map[k]?.length)
      .map(k => ({ kind: k, items: map[k] }));
  }, [results]);

  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  const onKeyDown = e => {
    if (e.key === 'Escape') {
      setOpen(false);
      e.currentTarget.blur();
      return;
    }
    if (!flat.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = flat[activeIndex];
      if (picked) {
        setOpen(false);
        setQuery('');
        nav(picked.to);
      }
    }
  };

  const openResult = r => {
    setOpen(false);
    setQuery('');
    nav(r.to);
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="gs" ref={wrapRef}>
      <div className={`gs-input ${open ? 'on' : ''}`}>
        <Search size={15} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products, orders, customers…"
          aria-label="Search"
        />
        <kbd className="gs-kbd">⌘K</kbd>
      </div>

      {showDropdown && (
        <div className="gs-panel fade-in">
          {loading && (
            <div className="gs-status">Searching…</div>
          )}

          {!loading && flat.length === 0 && (
            <div className="gs-status">
              No results for <strong>"{query}"</strong>
            </div>
          )}

          {!loading && flat.length > 0 && (
            <div className="gs-results">
              {grouped.map(group => {
                const meta = KIND_META[group.kind];
                const Icon = meta.icon;
                return (
                  <div key={group.kind} className="gs-group">
                    <div className="gs-group-head">
                      <Icon size={12} />
                      <span>{meta.label}</span>
                    </div>
                    {group.items.map(r => {
                      const idx = flat.indexOf(r);
                      return (
                        <button
                          key={`${r.kind}-${r.id}`}
                          className={`gs-result ${idx === activeIndex ? 'on' : ''}`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => openResult(r)}
                        >
                          <div className="gs-result-body">
                            <div className="gs-result-label">{r.label}</div>
                            <div className="gs-result-sub">{r.sublabel}</div>
                          </div>
                          <ArrowRight size={13} className="gs-result-arrow" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <div className="gs-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>esc</kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
}