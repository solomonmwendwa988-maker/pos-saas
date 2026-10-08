import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, Boxes, ChevronLeft, ChevronRight, Clock, CreditCard,
  FileText, HelpCircle, LayoutDashboard, LogOut, Package, Receipt, Settings,
  ShoppingCart, Tag, Truck, User, Users,
} from 'lucide-react';
import Logo from '../common/Logo';
import Badge from '../common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { getInitials } from '@/utils/image';
import './Sidebar.css';

const main = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/shifts', label: 'Shifts', icon: Clock },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const secondary = [
  { to: '/settings/business', label: 'Settings', icon: Settings },
  { to: '/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/help', label: 'Help & Support', icon: HelpCircle },
];

function daysWord(n) {
  return n === 1 ? 'day' : 'days';
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const { subscription, trialDaysLeft, daysUntilCycleEnd } = useSubscription();
  const nav = useNavigate();

  const doLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const roleLabel =
    user?.role === 'OWNER' ? 'Owner'
    : user?.role === 'MANAGER' ? 'Manager'
    : user?.role === 'CASHIER' ? 'Cashier'
    : user?.role || 'Owner';

  const displayName = user?.fullName?.trim() || 'Your account';

  // ---------- Plan card content (state-aware) ----------
  let planTag = 'Free trial';
  let planTagTone = 'warning';
  let planText = 'Upgrade anytime to keep your shop running.';
  let planCtaLabel = 'Upgrade plan';
  let planBadge = null;
  let planCardTone = 'trial';

  if (subscription) {
    if (subscription.status === 'active') {
      planTag = subscription.plan.name + ' plan';
      planTagTone = 'success';
      planCardTone = 'active';
      planBadge = (
        <Badge tone="success">
          {daysUntilCycleEnd} {daysWord(daysUntilCycleEnd)} left
        </Badge>
      );
      planText = `Renews on ${new Date(subscription.cycleEnd).toLocaleDateString(
        'en-KE',
        { day: 'numeric', month: 'short' }
      )}.`;
      planCtaLabel = 'Manage plan';
    } else if (subscription.status === 'cancelled') {
      planTag = 'Cancelled';
      planTagTone = 'danger';
      planCardTone = 'cancelled';
      planBadge = (
        <Badge tone="danger">
          {daysUntilCycleEnd} {daysWord(daysUntilCycleEnd)} left
        </Badge>
      );
      planText = `Access ends in ${daysUntilCycleEnd} ${daysWord(daysUntilCycleEnd)}.`;
      planCtaLabel = 'Reactivate';
    } else if (subscription.status === 'pending') {
      planTag = 'Payment pending';
      planTagTone = 'info';
      planCardTone = 'pending';
      planBadge = <Badge tone="info">Pending</Badge>;
      planText = 'Waiting for M-Pesa confirmation.';
      planCtaLabel = 'View subscription';
    } else {
      // trial
      planBadge = (
        <Badge tone="warning">
          {trialDaysLeft} {daysWord(trialDaysLeft)}
        </Badge>
      );
      planText =
        trialDaysLeft > 0
          ? `Free trial · ${trialDaysLeft} ${daysWord(trialDaysLeft)} remaining.`
          : 'Your free trial has ended.';
      planCtaLabel = trialDaysLeft > 0 ? 'Upgrade plan' : 'Choose a plan';
    }
  }

  return (
    <>
      <aside className={`side ${mobileOpen ? 'side-mobile-open' : ''}`}>
        <div className="side-brand">
          <Link to="/dashboard" aria-label="Sokoni home">
            {collapsed ? <div className="side-logo-mini">S</div> : <Logo light />}
          </Link>
        </div>

        <nav className="side-nav" aria-label="Main">
          {main.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}
              title={collapsed ? label : undefined}
              onClick={onCloseMobile}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="side-divider" />

        <nav className="side-nav" aria-label="Account">
          {secondary.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}
              title={collapsed ? label : undefined}
              onClick={onCloseMobile}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          {!collapsed && subscription && (
            <div className={`side-plan side-plan-${planCardTone}`}>
              <div className="side-plan-head">
                <span className="side-plan-tag">{planTag}</span>
                {planBadge}
              </div>
              <p className="side-plan-text">{planText}</p>
              <Link to="/subscription" className="side-plan-cta">
                {planCtaLabel}
              </Link>
            </div>
          )}

          <div className={`side-user ${collapsed ? 'compact' : ''}`}>
            <div className="side-avatar">
              {user?.avatarDataUrl ? (
                <img src={user.avatarDataUrl} alt="" />
              ) : (
                <span>{getInitials(user?.fullName)}</span>
              )}
            </div>
            {!collapsed && (
              <div className="side-user-info">
                <span className="side-user-name">{displayName}</span>
                <span className="side-user-role">{roleLabel}</span>
              </div>
            )}
            <button
              className="side-logout"
              onClick={doLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <button
          className="side-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {mobileOpen && <div className="side-scrim" onClick={onCloseMobile} />}
    </>
  );
}