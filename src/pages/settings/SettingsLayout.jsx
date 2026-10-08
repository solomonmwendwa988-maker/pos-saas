// SettingsLayout.jsx
import { NavLink, Outlet } from 'react-router-dom';
import { Building2, Lock, Receipt, Shield } from 'lucide-react';
import './Settings.css';

const TABS = [
  { to: '/settings/business', label: 'Business', icon: Building2 },
  { to: '/settings/account', label: 'Account', icon: Lock },
  { to: '/settings/security', label: 'Security', icon: Shield },
  { to: '/settings/receipt', label: 'Receipt', icon: Receipt },
];

export default function SettingsLayout() {
  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub muted">Manage your business, account and security</p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `settings-tab ${isActive ? 'on' : ''}`}
          >
            <Icon size={15} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}