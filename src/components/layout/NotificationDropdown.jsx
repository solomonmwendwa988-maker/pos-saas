import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Bell, CheckCheck, Info, Package, ShieldCheck,
  ShoppingCart, XCircle,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import './NotificationDropdown.css';

const ICONS = {
  low_stock: Package,
  sale: ShoppingCart,
  payment_failed: XCircle,
  security: ShieldCheck,
  trial: AlertTriangle,
  system: Info,
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { items, loading, unreadCount, markAllRead } = useNotifications();

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="nd" ref={ref}>
      <button
        className="topbar-icon"
        onClick={() => setOpen(o => !o)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="topbar-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="nd-panel fade-in">
          <header className="nd-head">
            <div>
              <div className="nd-title">Notifications</div>
              <div className="nd-sub">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </div>
            </div>
            {unreadCount > 0 && (
              <button className="nd-mark-all" onClick={markAllRead}>
                <CheckCheck size={13} /> Mark all
              </button>
            )}
          </header>

          <div className="nd-body">
            {loading ? (
              <div className="nd-loading">
                <div className="skeleton" style={{ height: 44, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 44, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 44 }} />
              </div>
            ) : items.length === 0 ? (
              <div className="nd-empty">You're all caught up.</div>
            ) : (
              items.slice(0, 6).map(n => {
                const Icon = ICONS[n.type] || Info;
                return (
                  <div key={n.id} className={`nd-item ${!n.read ? 'unread' : ''}`}>
                    <span className={`nd-icon nd-icon-${n.type}`}><Icon size={14} /></span>
                    <div className="nd-item-body">
                      <div className="nd-item-title">{n.title}</div>
                      <div className="nd-item-text">{n.body}</div>
                      <div className="nd-item-time">{n.time}</div>
                    </div>
                    {!n.read && <span className="nd-dot" />}
                  </div>
                );
              })
            )}
          </div>

          <footer className="nd-foot">
            <Link to="/notifications" className="nd-view-all" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}