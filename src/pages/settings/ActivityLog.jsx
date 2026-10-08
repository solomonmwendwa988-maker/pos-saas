import { useEffect, useMemo, useState } from 'react';
import {
  Filter, Search, Shield, Trash2, User as UserIcon,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { activityLogService } from '@/services/activityLogService';
import { teamService } from '@/services/teamService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ACTION_LABELS,
  DESTRUCTIVE_ACTIONS,
  ROLE_LABELS,
} from '@/config/permissions';
import { formatLongDateTime } from '@/utils/billing';
import './Settings.css';

export default function ActivityLog() {
  const toast = useToast();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const load = () => {
    setEntries(activityLogService.all());
    setMembers(teamService.listMembers());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter(e => {
      if (filter === 'destructive' && !DESTRUCTIVE_ACTIONS.includes(e.action)) {
        return false;
      }
      if (filter === 'team' && !e.action.startsWith('team.')) return false;
      if (filter === 'sales' && !e.action.startsWith('sales.')) return false;
      if (filter === 'products' && !e.action.startsWith('products.')) return false;
      if (!q) return true;
      return (
        (e.summary || '').toLowerCase().includes(q) ||
        (e.userName || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q)
      );
    });
  }, [entries, search, filter]);

  const clearLog = () => {
    activityLogService.clear();
    activityLogService.log({
      action: 'system.log-cleared',
      summary: `${user?.fullName || 'Owner'} cleared the activity log`,
      user,
    });
    load();
    setConfirmClear(false);
    toast.success('Activity log cleared.');
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 320 }} />;
  }

  return (
    <div className="stack gap-24">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Activity log</div>
            <div className="settings-card-sub">
              A record of sensitive actions performed in this workspace.
              Entries include who did it, from which role, and when.
            </div>
          </div>
          {entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={13} />}
              onClick={() => setConfirmClear(true)}
            >
              Clear log
            </Button>
          )}
        </div>

        <div className="al-toolbar">
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input
              placeholder="Search by user, action or summary"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
          <div className="al-filters">
            <Filter size={14} className="muted" />
            {[
              { id: 'all', label: 'All' },
              { id: 'destructive', label: 'Destructive' },
              { id: 'sales', label: 'Sales' },
              { id: 'products', label: 'Products' },
              { id: 'team', label: 'Team' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`al-filter ${filter === f.id ? 'on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="al-empty">
            <Shield size={28} />
            <p>No activity recorded yet</p>
            <span className="muted">
              Sensitive actions will appear here as they happen.
            </span>
          </div>
        ) : (
          <ul className="al-list">
            {filtered.map(e => {
              const member = members.find(m => m.email === e.userName);
              const isDestructive = DESTRUCTIVE_ACTIONS.includes(e.action);
              return (
                <li
                  key={e.id}
                  className={`al-row ${isDestructive ? 'destructive' : ''}`}
                >
                  <span className="al-icon">
                    {isDestructive ? (
                      <Trash2 size={14} />
                    ) : (
                      <UserIcon size={14} />
                    )}
                  </span>
                  <div className="al-body">
                    <div className="al-line">
                      <span className="al-summary">{e.summary || e.action}</span>
                      <Badge tone={isDestructive ? 'danger' : 'neutral'}>
                        {ACTION_LABELS[e.action] || e.action}
                      </Badge>
                    </div>
                    <div className="al-meta">
                      <span className="al-user">
                        <strong>{e.userName || 'Unknown'}</strong>
                        {e.userRole && (
                          <span className="al-role">
                            {ROLE_LABELS[e.userRole] || e.userRole}
                          </span>
                        )}
                      </span>
                      <span className="al-time mono">
                        {formatLongDateTime(new Date(e.createdAt).toISOString())}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearLog}
        title="Clear activity log"
        message="This permanently deletes every activity entry. It cannot be undone."
        confirmLabel="Clear log"
      />

      <style>{`
        .al-toolbar {
          display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
          margin-bottom: 14px;
        }
        .al-filters { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
        .al-filter {
          padding: 7px 12px; border-radius: 999px;
          background: #fff; border: 1px solid var(--border);
          font-size: 12.5px; font-weight: 600; color: var(--text-muted);
          cursor: pointer; transition: all var(--dur);
        }
        .al-filter:hover { border-color: var(--border-strong); color: var(--text); }
        .al-filter.on {
          background: var(--primary); color: #fff; border-color: var(--primary);
        }

        .al-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 6px;
        }
        .al-row {
          display: flex; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-soft);
          border-radius: 10px;
          align-items: flex-start;
        }
        .al-row.destructive {
          background: #fef2f2;
        }
        .al-icon {
          width: 30px; height: 30px; border-radius: 10px;
          background: #fff; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .al-row.destructive .al-icon {
          background: var(--danger-bg); color: var(--danger);
        }
        .al-body { flex: 1; min-width: 0; }
        .al-line {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        }
        .al-summary {
          font-size: 13.5px; font-weight: 600; color: var(--text);
        }
        .al-meta {
          display: flex; gap: 14px; flex-wrap: wrap;
          margin-top: 4px; font-size: 12px;
          color: var(--text-muted);
        }
        .al-user { display: inline-flex; align-items: center; gap: 8px; }
        .al-role {
          font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 999px;
          background: var(--primary-50); color: var(--primary);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .al-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 40px 20px; text-align: center;
          color: var(--text-faint);
        }
        .al-empty p {
          margin: 6px 0 0; font-weight: 700;
          color: var(--text-muted); font-size: 14px;
        }
        .al-empty .muted { font-size: 12.5px; }
      `}</style>
    </div>
  );
}