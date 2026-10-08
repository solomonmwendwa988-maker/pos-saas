// Footer.jsx
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo light />
          <p className="footer-tag">
            Cloud POS and business management for Kenyan retailers.
            Sell, track stock, and grow with confidence.
          </p>
        </div>

        <div>
          <h4 className="footer-h">Product</h4>
          <Link to="/features" className="footer-link">Features</Link>
          <Link to="/pricing" className="footer-link">Pricing</Link>
          <Link to="/features" className="footer-link">Integrations</Link>
        </div>

        <div>
          <h4 className="footer-h">Company</h4>
          <Link to="/about" className="footer-link">About</Link>
          <Link to="/contact" className="footer-link">Contact</Link>
          <Link to="/contact" className="footer-link">Support</Link>
        </div>

        <div>
          <h4 className="footer-h">Account</h4>
          <Link to="/login" className="footer-link">Sign in</Link>
          <Link to="/signup" className="footer-link">Create account</Link>
          <Link to="/forgot-password" className="footer-link">Reset password</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Sokoni Technologies Ltd. All rights reserved.</span>
        <span className="footer-meta">Nairobi, Kenya · KSh pricing · M-Pesa ready</span>
      </div>
    </footer>
  );
}