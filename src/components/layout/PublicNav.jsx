// PublicNav.jsx
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../common/Logo';
import Button from '../common/Button';
import './PublicNav.css';

const links = [
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className={`pnav ${scrolled ? 'pnav-scrolled' : ''}`}>
      <div className="container pnav-inner">
        <Link to="/" aria-label="Sokoni home"><Logo /></Link>

        <nav className="pnav-links" aria-label="Primary">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `pnav-link ${isActive ? 'active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="pnav-actions">
          <Link to="/login" className="pnav-link">Sign in</Link>
          <Link to="/signup"><Button size="sm">Get started</Button></Link>
        </div>

        <button className="pnav-burger" onClick={() => setOpen(o => !o)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="pnav-mobile fade-in">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className="pnav-mobile-link">{l.label}</NavLink>
          ))}
          <Link to="/login" className="pnav-mobile-link">Sign in</Link>
          <Link to="/signup" style={{ marginTop: 12 }}>
            <Button full>Create account</Button>
          </Link>
        </div>
      )}
    </header>
  );
}