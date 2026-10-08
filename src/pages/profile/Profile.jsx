import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtSign, Clock, Edit2, KeyRound, LogOut, MapPin, Phone, Shield, User,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { authService } from '@/services/authService';
import { getInitials } from '@/utils/image';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const { business } = useBusiness();
  const nav = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(authService.listSessions());
  }, []);

  const roleLabel =
    user?.role === 'OWNER' ? 'Owner'
    : user?.role === 'MANAGER' ? 'Manager'
    : user?.role === 'CASHIER' ? 'Cashier'
    : user?.role || 'Owner';

  const displayName = user?.fullName?.trim() || 'Your account';

  const doLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-sub muted">Your personal details and login activity</p>
        </div>
        <Link to="/settings/account">
          <Button variant="outline" leftIcon={<Edit2 size={14} />}>Edit profile</Button>
        </Link>
      </header>

      <section className="profile-hero">
        <div className="profile-avatar">
          {user?.avatarDataUrl ? (
            <img src={user.avatarDataUrl} alt="" />
          ) : (
            <span>{getInitials(user?.fullName)}</span>
          )}
        </div>
        <div className="profile-hero-info">
          <h2 className="profile-name">{displayName}</h2>
          <div className="profile-meta">
            <span><Badge tone="primary">{roleLabel}</Badge></span>
            {business?.name && <span className="muted">{business.name}</span>}
            {business?.location && (
              <span className="muted"><MapPin size={12} /> {business.location}</span>
            )}
          </div>
          {!user?.fullName?.trim() && (
            <div className="profile-nudge">
              Your profile is missing your name. Add it so receipts and reports
              display correctly.
            </div>
          )}
        </div>
        <Button
          variant="outline"
          leftIcon={<LogOut size={14} />}
          onClick={doLogout}
        >
          Sign out
        </Button>
      </section>

      <section className="profile-grid">
        <Card title="Personal information" subtitle="Managed in Account settings">
          <div className="info-list">
            <InfoRow
              icon={User}
              label="Full name"
              value={user?.fullName?.trim() || <span className="muted">Not set</span>}
            />
            <InfoRow
              icon={AtSign}
              label="Email address"
              value={user?.email || <span className="muted">Not set</span>}
            />
            <InfoRow
              icon={Phone}
              label="Phone number"
              value={user?.phone?.trim() || <span className="muted">Not set</span>}
            />
          </div>
          <div className="settings-actions" style={{ marginTop: 4 }}>
            <Link to="/settings/account">
              <Button variant="outline" leftIcon={<Edit2 size={14} />}>Edit details</Button>
            </Link>
          </div>
        </Card>

        <div className="stack gap-16">
          <Card title="Quick actions" subtitle="Manage your account">
            <div className="profile-quick">
              <Link to="/settings/security" className="quick-item">
                <span className="quick-icon"><Shield size={16} /></span>
                <div>
                  <div className="quick-title">Security and 2FA</div>
                  <div className="quick-sub">Sessions, password and OTP</div>
                </div>
              </Link>
              <Link to="/settings/account" className="quick-item">
                <span className="quick-icon"><KeyRound size={16} /></span>
                <div>
                  <div className="quick-title">Account settings</div>
                  <div className="quick-sub">Name, email, phone and photo</div>
                </div>
              </Link>
              <Link to="/settings/business" className="quick-item">
                <span className="quick-icon"><MapPin size={16} /></span>
                <div>
                  <div className="quick-title">Business settings</div>
                  <div className="quick-sub">{business?.name || 'Not set'}</div>
                </div>
              </Link>
            </div>
          </Card>

          <Card title="Login activity" subtitle="Recent sign-ins to your account">
            <ul className="activity-list">
              {sessions.map(s => (
                <li key={s.id} className="activity-row">
                  <span className="activity-icon"><Clock size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bold" style={{ fontSize: 13 }}>
                      {s.device} {s.current && <Badge tone="primary">This device</Badge>}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {s.location} · {s.last}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <style>{`
        .info-list { display: flex; flex-direction: column; gap: 6px; }
      `}</style>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="info-row">
      <span className="info-icon"><Icon size={14} /></span>
      <div className="info-body">
        <div className="info-label">{label}</div>
        <div className="info-value">{value}</div>
      </div>
      <style>{`
        .info-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0; border-bottom: 1px dashed var(--border);
        }
        .info-row:last-child { border-bottom: 0; }
        .info-icon {
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          background: var(--bg-soft); color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
        }
        .info-body { flex: 1; min-width: 0; }
        .info-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--text-faint);
        }
        .info-value { font-size: 13.5px; margin-top: 2px; }
      `}</style>
    </div>
  );
}