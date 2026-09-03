import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/symptoms', label: 'Type symptoms' },
  { to: '/voice', label: 'Use voice' },
  { to: '/clinic-finder', label: 'Find care' },
  { to: '/history', label: 'History' },
];

export default function MobileMenu({ isOpen, onClose, triggerRef }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const focusableSelector = 'a[href], button:not([disabled])';
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...document.querySelectorAll('#mobile-navigation ' + focusableSelector)];
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div id="mobile-navigation" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Main navigation">
      <button ref={closeRef} className="mobile-menu-close liquid-glass" onClick={onClose} aria-label="Close navigation">
        <span />
        <span />
      </button>

      <nav className="mobile-menu-links" aria-label="Main navigation">
        {NAV_ITEMS.map((item, index) => (
          <Link key={item.to} to={item.to} onClick={onClose} style={{ '--menu-index': index }}>
            {item.label}
          </Link>
        ))}
      </nav>

      <Link className="mobile-menu-cta liquid-glass" to="/symptoms" onClick={onClose}>
        <span className="status-dot" />
        Start triage
      </Link>
    </div>
  );
}
