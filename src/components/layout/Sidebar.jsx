import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, Boxes, ChevronLeft, ChevronRight, Clock, CreditCard,
  FileText, HelpCircle, LayoutDashboard, LogOut, Package, Receipt, Settings,
  ShoppingBag, ShoppingCart, Tag, Truck, User, Users,
} from 'lucide-react';
import Logo from '../common/Logo';
import Badge from '../common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { getInitials } from '@/utils/image';
import { ROLE_LABELS } from '@/config/permissions';
import './Sidebar.css';

const MAIN = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' },
  { to: '/pos', label: 'POS', icon: ShoppingCart, perm: 'pos.use' },
  { to: '/sales', label: 'Sales', icon: Receipt, perm: 'sales.view' },
  { to: '/shifts', label: 'Shifts', icon: Clock, perm: 'shifts.view' },
  { to: '/products', label: 'Products', icon: Package, perm: 'products.view' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, perm: 'inventory.view' },
  { to: '/categories', label: 'Categories', icon: Tag, perm: 'categories.view' },
  { to: '/customers', label: 'Customers', icon: Users, perm: 'customers.view' },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, perm: 'suppliers.view' },
  { to: '/purchases', label: 'Purchases', icon: ShoppingBag, perm: 'purchases.view' },
  { to: '/reports', label: 'Reports', icon: FileText, perm: 'reports.view' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, perm: 'analytics.view' },
];

const SECONDARY = [
  { to: '/settings/business', label: 'Settings', icon: Settings, perm: 'settings.update' },
  { to: '/subscription', label: 'Subscription', icon: CreditCard, perm: 'subscription.view' },
  { to: '/profile', label: 'Profile', icon: User, perm: 'profile.edit' },
  { to: '/notifications', label: 'Notifications', icon: Bell, perm: 'notifications.view' },
  { to: '/help', label: 'Help & Support', icon: HelpCircle, perm: 'help.view' },
];

const DAY_MS = 86400000;

function daysFromIso(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  const diff = t - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

function plural(n, word) {
  return n === 1 ? word : `${word}s`;
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, logout, isOwner, can } = useAuth();
  const {
    subscription,
    trialDaysLeft: ctxTrialDays,
    daysUntilCycleEnd: ctxCycleDays,
  } = useSubscription();
  const nav = useNavigate();

  const doLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Owner';
  const displayName = user?.fullName?.trim() || 'Your account';

  const visibleMain = MAIN.filter(item => !item.perm || can(item.perm));
  const visibleSecondary = SECONDARY.filter(item => {
    if (item.to === '/subscription') return isOwner();
    if (!item.perm) return true;
    return can(item.perm);
  });

  // ---------- Plan card content ----------
  let planTag = 'Free trial';
  let planText = 'Upgrade anytime to keep your shop running.';
  let planCtaLabel = 'Upgrade plan';
  let planBadge = null;
  let planCardTone = 'trial';

  if (subscription) {
    // Compute days inline from subscription dates as the single source of truth.
    // Context values are used only if they are valid numbers.
    const cycleDays = Number.isFinite(ctxCycleDays) && ctxCycleDays > 0
      ? ctxCycleDays
      : daysFromIso(subscription.cycleEnd);

    const trialDays = Number.isFinite(ctxTrialDays) && ctxTrialDays >= 0
      ? ctxTrialDays
      : daysFromIso(subscription.trialEnd);

    if (subscription.status === 'active') {
      planTag = `${subscription.plan?.name || 'Plan'} plan`;
      planCardTone = 'active';
      planBadge = (
        <Badge tone="success">
          {cycleDays} {plural(cycleDays, 'day')} left
        </Badge>
      );
      planText = `Renews on ${new Date(subscription.cycleEnd).toLocaleDateString(
        'en-KE',
        { day: 'numeric', month: 'short' }
      )}.`;
      planCtaLabel = 'Manage plan';
    } else if (subscription.status === 'cancelled') {
      planTag = 'Cancelled';
      planCardTone = 'cancelled';
      planBadge = (
        <Badge tone="danger">
          {cycleDays} {plural(cycleDays, 'day')} left
        </Badge>
      );
      planText = `Access ends in ${cycleDays} ${plural(cycleDays, 'day')}.`;
      planCtaLabel = 'Reactivate';
    } else if (subscription.status === 'pending') {
      planTag = 'Payment pending';
      planCardTone = 'pending';
      planBadge = <Badge tone="info">Pending</Badge>;
      planText = 'Waiting for M-Pesa confirmation.';
      planCtaLabel = 'View subscription';
    } else {
      // trial
      planBadge = (
        <Badge tone="warning">
          {trialDays} {plural(trialDays, 'day')}
        </Badge>
      );
      planText =
        trialDays > 0
          ? `Free trial · ${trialDays} ${plural(trialDays, 'day')} remaining.`
          : 'Your free trial has ended.';
      planCtaLabel = trialDays > 0 ? 'Upgrade plan' : 'Choose a plan';
    }
  }

  const showPlanCard = !collapsed && subscription && isOwner();

  return (
    <>
      <aside className={`side ${mobileOpen ? 'side-mobile-open' : ''}`}>
        <div className="side-brand">
          <Link
            to={isOwner() || can('dashboard.view') ? '/dashboard' : '/pos'}
            aria-label="Sokoni home"
          >
            {collapsed ? <div className="side-logo-mini">S</div> : <Logo light />}
          </Link>
        </div>

        <nav className="side-nav" aria-label="Main">
          {visibleMain.map(({ to, label, icon: Icon }) => (
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
          {visibleSecondary.map(({ to, label, icon: Icon }) => (
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
          {showPlanCard && (
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