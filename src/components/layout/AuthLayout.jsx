// AuthLayout.jsx
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import './AuthLayout.css';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-aside-inner">
          <Link to="/" aria-label="Home"><Logo light /></Link>
          <div className="auth-aside-copy">
            <h2 className="auth-aside-title">
              Sell faster. Track stock. Grow with confidence.
            </h2>
            <p className="auth-aside-sub">
              Join Kenyan retailers using Sokoni to run their shops on autopilot.
            </p>
          </div>
          <ul className="auth-benefits">
            <li>Live sales and inventory in one place</li>
            <li>M-Pesa payments reconciled per order</li>
            <li>Receipts customers trust</li>
          </ul>
        </div>
        <div className="auth-aside-foot">
          © {new Date().getFullYear()} Sokoni Technologies Ltd.
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card fade-up">
          <header className="auth-header">
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-sub">{subtitle}</p>}
          </header>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}