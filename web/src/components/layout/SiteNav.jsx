import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  HeartPulse,
  Languages,
  LogOut,
  Menu,
  Mic,
  UserRound,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../auth/AuthModal';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'ur-roman', label: 'Roman Urdu', native: 'Roman Urdu' },
  { code: 'ps', label: 'Pashto', native: 'پښتو' },
];

export default function SiteNav() {
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [startAfterLogin, setStartAfterLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isAuthenticated = Boolean(user && !user.isGuest);
  const activeLanguage = LANGUAGES.find((language) => language.code === i18n.resolvedLanguage)
    || LANGUAGES.find((language) => language.code === i18n.language)
    || LANGUAGES[0];
  const userLabel =
    user?.name ||
    user?.email?.split('@')[0] ||
    (user?.isDemo ? t('auth_modal.default_name') : t('nav.account'));

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  const changeLanguage = (event) => {
    const selected = LANGUAGES.find((language) => language.code === event.target.value);
    if (!selected) return;
    void i18n.changeLanguage(selected.code);
    const direction = ['ur', 'ps'].includes(selected.code) ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = selected.code;
    localStorage.setItem('language', selected.code);
    localStorage.setItem('dir', direction);
    setMenuOpen(false);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setStartAfterLogin(false);
  };
  const startTriage = () => {
    setMenuOpen(false);
    if (isAuthenticated) {
      navigate('/symptoms');
      return;
    }
    setStartAfterLogin(true);
    setAuthOpen(true);
  };
  const handleAuthSuccess = () => {
    if (startAfterLogin) {
      setStartAfterLogin(false);
      navigate('/symptoms');
    }
  };

  const navItems = [
    { to: '/home', label: t('nav.home') },
    { to: '/home#capabilities', label: t('nav.capabilities') },
    { to: '/clinic-finder', label: t('nav.find_care') },
    ...(isAuthenticated
      ? [{ to: '/history', label: t('nav.history') }]
      : []),
  ];

  return (
    <>
      <header className="site-nav">
        <Link className="site-logo" to="/home" aria-label={t('nav.home')}>
          <span className="site-logo-mark"><HeartPulse size={20} strokeWidth={2.2} /></span>
          <span className="site-logo-wordmark">
            <strong>SEHAT</strong>
            <span>AWAAZ</span>
          </span>
        </Link>

        <nav className="site-nav-links" aria-label={t('nav.main_navigation')}>
          {navItems.map((item) => {
            const isActive = item.to.includes('#')
              ? location.hash === '#capabilities'
              : item.to === '/home'
                ? ['/home', '/'].includes(location.pathname) && location.hash !== '#capabilities'
                : location.pathname === item.to;
            return (
              <Link
                key={item.to}
                className={isActive ? 'is-active' : ''}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="site-nav-actions">
          <label className="language-select-wrap">
            <span className="sr-only">{t('nav.language')}</span>
            <Languages size={15} aria-hidden="true" />
            <select
              value={activeLanguage.code}
              onChange={changeLanguage}
              aria-label={t('nav.language')}
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.native}
                </option>
              ))}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>

          {isAuthenticated ? (
            <div className="profile-actions">
              <Link className="profile-chip" to={user.isDemo ? '/home' : '/history'}>
                <span className="profile-avatar"><UserRound size={15} /></span>
                <span>{userLabel}</span>
              </Link>
              <button className="logout-button" type="button" onClick={logout}>
                <LogOut size={15} aria-hidden="true" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          ) : (
            <button className="sign-in-button" type="button" onClick={() => setAuthOpen(true)}>
              {t('nav.sign_in')}
            </button>
          )}

          <button className="site-nav-cta" type="button" onClick={startTriage}>
            <Mic size={15} aria-hidden="true" />
            {t('landing.start_triage')}
          </button>
        </div>

        <div className="mobile-nav-actions">
          {isAuthenticated ? (
            <Link
              className="mobile-profile-button"
              to={user.isDemo ? '/home' : '/history'}
              aria-label={userLabel}
            >
              <UserRound size={18} />
            </Link>
          ) : (
            <button className="mobile-sign-in" type="button" onClick={() => setAuthOpen(true)}>
              {t('nav.sign_in')}
            </button>
          )}
          <button
            className="site-nav-toggle"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t('nav.close_menu') : t('nav.open_menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div ref={menuRef} className="mobile-navigation" id="mobile-navigation">
            <nav aria-label={t('nav.main_navigation')}>
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <label className="mobile-language-label">
              {t('nav.language')}
              <select value={activeLanguage.code} onChange={changeLanguage}>
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.native}
                  </option>
                ))}
              </select>
            </label>
            <button className="mobile-start-cta" type="button" onClick={startTriage}>
              <Mic size={16} /> {t('landing.start_triage')}
            </button>
            {isAuthenticated && (
              <button className="mobile-logout-button" type="button" onClick={logout}>
                <LogOut size={16} aria-hidden="true" /> {t('nav.logout')}
              </button>
            )}
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={closeAuth}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
