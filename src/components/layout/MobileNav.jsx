import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3, LayoutDashboard, Menu, Package, Receipt, ShoppingCart,
} from 'lucide-react';
import './MobileNav.css';

const TABS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function MobileNav({ onOpenMenu }) {
  const { pathname } = useLocation();

  return (
    <nav className="mnav" aria-label="Primary mobile navigation">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <NavLink
            key={to}
            to={to}
            className={`mnav-tab ${active ? 'on' : ''}`}
          >
            <span className="mnav-icon">
              <Icon size={20} />
            </span>
            <span className="mnav-label">{label}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        className="mnav-tab mnav-more"
        onClick={onOpenMenu}
        aria-label="More navigation"
      >
        <span className="mnav-icon">
          <Menu size={20} />
        </span>
        <span className="mnav-label">More</span>
      </button>
    </nav>
  );
}