import { useEffect, useRef, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { demoLogin } = useAuth();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    emailRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled])'
      );
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
    };
  }, [isOpen, mode, onClose]);

  useEffect(() => {
    setError('');
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const name = String(formData.get('name') || '').trim();

    if (password.length < 8) {
      setError(t('auth_modal.password_error'));
      return;
    }
    if (mode === 'register' && name.length < 2) {
      setError(t('auth_modal.name_error'));
      return;
    }

    const displayName = mode === 'register'
      ? name
      : email.split('@')[0].replace(/[._-]+/g, ' ');
    demoLogin(displayName || t('auth_modal.default_name'), email);
    onSuccess?.();
    onClose();
  };

  const isRegistration = mode === 'register';

  return (
    <div
      className="auth-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          aria-label={t('auth_modal.close')}
        >
          <X size={19} />
        </button>

        <div className="auth-modal-brand">
          <span className="brand-mark"><UserRound size={20} /></span>
          <span>{t('auth_modal.eyebrow')}</span>
        </div>
        <h2 id="auth-modal-title">
          {isRegistration ? t('auth_modal.create_title') : t('auth_modal.login_title')}
        </h2>
        <p className="auth-modal-description">
          {isRegistration ? t('auth_modal.create_description') : t('auth_modal.login_description')}
        </p>

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          {isRegistration && (
            <label className="auth-field">
              <span>{t('auth_modal.full_name')}</span>
              <span className="auth-input-wrap">
                <UserRound size={17} aria-hidden="true" />
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder={t('auth_modal.name_placeholder')}
                />
              </span>
            </label>
          )}

          <label className="auth-field">
            <span>{t('auth_modal.email')}</span>
            <span className="auth-input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                ref={emailRef}
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                placeholder="you@example.com"
              />
            </span>
          </label>

          <label className="auth-field">
            <span>{t('auth_modal.password')}</span>
            <span className="auth-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                name="password"
                type="password"
                autoComplete={isRegistration ? 'new-password' : 'current-password'}
                minLength={8}
                maxLength={128}
                required
                placeholder={t('auth_modal.password_placeholder')}
              />
            </span>
          </label>

          {error && <p className="auth-modal-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit">
            {isRegistration ? t('auth_modal.create_account') : t('auth_modal.sign_in')}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-demo-notice">{t('auth_modal.demo_notice')}</p>
        <p className="auth-modal-switch">
          {isRegistration ? t('auth_modal.have_account') : t('auth_modal.no_account')}
          {' '}
          <button
            type="button"
            onClick={() => setMode(isRegistration ? 'login' : 'register')}
          >
            {isRegistration ? t('auth_modal.sign_in') : t('auth_modal.create_account')}
          </button>
        </p>
      </section>
    </div>
  );
}
