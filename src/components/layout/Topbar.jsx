import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import GlobalSearch from './GlobalSearch';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/utils/image';
import './Topbar.css';

export default function Topbar({ onOpenMobile }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);

  const doLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const roleLabel =
    user?.role === 'OWNER' ? 'Owner'
    : user?.role === 'MANAGER' ? 'Manager'
    : user?.role === 'CASHIER' ? 'Cashier'
    : user?.role || 'Owner';

  const displayName = user?.fullName?.trim() || 'Set your name';
  const showSetupHint = !user?.fullName?.trim();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-burger" onClick={onOpenMobile} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <GlobalSearch />
      </div>

      <div className="topbar-right">
        <NotificationDropdown />

        <div className="topbar-user" onClick={() => setMenu(m => !m)}>
          <div className="topbar-avatar">
            {user?.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="" />
            ) : (
              <span>{getInitials(user?.fullName)}</span>
            )}
          </div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{displayName}</span>
            <span className="topbar-user-role">{roleLabel}</span>
          </div>
          <ChevronDown size={14} />

          {menu && (
            <div className="topbar-menu fade-in" onClick={e => e.stopPropagation()}>
              {showSetupHint && (
                <Link to="/settings/account" className="topbar-menu-item hint">
                  Complete your profile
                </Link>
              )}
              <Link to="/profile" className="topbar-menu-item">Profile</Link>
              <Link to="/settings/account" className="topbar-menu-item">Account settings</Link>
              <Link to="/settings/business" className="topbar-menu-item">Business settings</Link>
              <Link to="/subscription" className="topbar-menu-item">Subscription</Link>
              <button className="topbar-menu-item danger" onClick={doLogout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}