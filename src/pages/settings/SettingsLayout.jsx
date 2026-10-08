import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Building2, Lock, Receipt, Shield, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import './Settings.css';

const TABS = [
  { to: '/settings/business', label: 'Business', icon: Building2, perm: null, roleOnly: true },
  { to: '/settings/team', label: 'Team', icon: Users, perm: null, roleOnly: true },
  { to: '/settings/activity', label: 'Activity', icon: Activity, perm: null, roleOnly: true },
  { to: '/settings/account', label: 'Account', icon: Lock },
  { to: '/settings/security', label: 'Security', icon: Shield },
  { to: '/settings/receipt', label: 'Receipt', icon: Receipt, roleOnly: true },
];

export default function SettingsLayout() {
  const { isOwner, isManager, can } = useAuth();

  const visibleTabs = TABS.filter(tab => {
    if (!tab.roleOnly) return true;
    if (tab.to === '/settings/team' || tab.to === '/settings/activity') {
      return isOwner();
    }
    if (tab.to === '/settings/business' || tab.to === '/settings/receipt') {
      return isOwner() || isManager() || can('settings.update');
    }
    return true;
  });

  return (
    <div className="stack gap-24">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub muted">
            Manage your business, account and security
          </p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {visibleTabs.map(({ to, label, icon: Icon }) => (
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