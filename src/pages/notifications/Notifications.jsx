import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCheck, CheckCircle2, Filter, Info,
  Package, ShieldCheck, ShoppingCart, Trash2, XCircle,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import './Notifications.css';

const ICONS = {
  low_stock: Package,
  sale: ShoppingCart,
  payment_failed: XCircle,
  security: ShieldCheck,
  trial: AlertTriangle,
  system: Info,
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'low_stock', label: 'Low stock' },
  { id: 'sale', label: 'Sales' },
  { id: 'payment_failed', label: 'Payments' },
  { id: 'security', label: 'Security' },
  { id: 'system', label: 'System' },
];

export default function Notifications() {
  const toast = useToast();
  const { items, loading, unreadCount, markRead, markAllRead, clear } = useNotifications();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter(n => !n.read);
    return items.filter(n => n.type === filter);
  }, [items, filter]);

  const handleMarkAll = async () => {
    await markAllRead();
    toast.success('All notifications marked as read.');
  };

  const handleClear = () => {
    clear();
    toast.success('Notifications cleared from this view.');
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub muted">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'You are all caught up'}
          </p>
        </div>
        <div className="row gap-8">
          {unreadCount > 0 && (
            <Button variant="outline" leftIcon={<CheckCheck size={14} />} onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
          <Button variant="ghost" leftIcon={<Trash2 size={14} />} onClick={handleClear}>
            Clear view
          </Button>
        </div>
      </header>

      <div className="notif-filters">
        <Filter size={14} className="muted" />
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`notif-filter ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack gap-10">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 88 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <div className="notif-empty">
            <CheckCircle2 size={32} />
            <p>Nothing here</p>
            <span className="muted">No notifications match this filter.</span>
          </div>
        </Card>
      ) : (
        <div className="notif-list">
          {filtered.map(n => {
            const Icon = ICONS[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <span className={`notif-icon notif-icon-${n.type}`}><Icon size={18} /></span>
                <div className="notif-body">
                  <div className="row gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="notif-title">{n.title}</span>
                    {n.priority === 'high' && <Badge tone="danger">High</Badge>}
                    {!n.read && <Badge tone="primary">New</Badge>}
                  </div>
                  <div className="notif-text">{n.body}</div>
                  <div className="notif-time">{n.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}