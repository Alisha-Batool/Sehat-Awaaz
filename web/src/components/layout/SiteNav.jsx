import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileMenu from './MobileMenu';

const NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/symptoms', label: 'Symptoms' },
  { to: '/voice', label: 'Voice' },
  { to: '/clinic-finder', label: 'Find care' },
  { to: '/history', label: 'History' },
];

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const location = useLocation();

  return (
    <>
      <header className="site-nav">
        <Link className="site-logo" to="/" aria-label="Sehat Awaaz home">
          <svg viewBox="0 0 256 256" aria-hidden="true">
            <path d="M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 96 95 L 63.5 128 L 64 128 L 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 64 L 64 0 L 192 0 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z" />
          </svg>
          <span>Sehat Awaaz</span>
        </Link>

        <nav className="site-nav-links liquid-glass" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} className={location.pathname === item.to ? 'is-active' : ''} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className="site-nav-cta liquid-glass" to="/symptoms">
          <span className="status-dot" />
          Start triage
        </Link>

        <button
          ref={triggerRef}
          className="site-nav-toggle liquid-glass"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <span />
          <span />
        </button>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} triggerRef={triggerRef} />
    </>
  );
}
