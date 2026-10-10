import { useEffect, useRef, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthModalSubmitTransition } from './authModalFlow';
import { normalizeAuthEmail, validateAuthEmail, validateAuthForm } from './authValidation';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { register, passwordLogin, requestPasswordReset, resendVerification } = useAuth();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (!isOpen) setSuccessMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = normalizeAuthEmail(formData.get('email'));
    const password = String(formData.get('password') || '');
    const name = String(formData.get('name') || '').trim();
    setEmail(email);

    const validationError = mode === 'forgot'
      ? validateAuthEmail(email)
      : validateAuthForm({ mode, name, email, password });
    if (validationError) {
      setError(t(validationError));
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const result = await register(name, email, password);
        setMode('login');
        setSuccessMessage(t(result.verificationEmailSent
          ? 'auth_modal.registration_verification_sent'
          : 'auth_modal.registration_verification_failed'));
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setSuccessMessage(t('auth_modal.password_reset_request_sent'));
      } else {
        await passwordLogin(email, password);
      }
      if (mode === 'login') {
        onSuccess?.();
        onClose();
      }
    } catch (authError) {
      const transition = getAuthModalSubmitTransition(mode, { status: authError.response?.status });
      setMode(transition.mode);
      setError(t(transition.errorMessageKey));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const validationError = validateAuthEmail(email);
    if (validationError) {
      setError(t(validationError));
      return;
    }
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      await resendVerification(email);
      setSuccessMessage(t('auth_modal.verification_resend_result'));
    } catch {
      setError(t('auth_modal.request_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRegistration = mode === 'register';
  const isForgotPassword = mode === 'forgot';

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
          {isRegistration
            ? t('auth_modal.create_title')
            : isForgotPassword ? t('auth_modal.forgot_title') : t('auth_modal.login_title')}
        </h2>
        <p className="auth-modal-description">
          {isRegistration
            ? t('auth_modal.create_description')
            : isForgotPassword ? t('auth_modal.forgot_description') : t('auth_modal.login_description')}
        </p>

        <form key={mode} className="auth-modal-form" onSubmit={handleSubmit} noValidate>
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
                required
                placeholder="you@example.com"
              />
            </span>
          </label>

          {!isForgotPassword && (
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
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => {
                setError('');
                setSuccessMessage('');
                setMode('forgot');
              }}
            >
              {t('auth_modal.forgot_password_link')}
            </button>
          )}

          {successMessage && <p className="auth-modal-success" role="status">{successMessage}</p>}
          {error && <p className="auth-modal-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isRegistration
              ? t('auth_modal.create_account')
              : isForgotPassword ? t('auth_modal.send_reset_link') : t('auth_modal.sign_in')}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>

        {mode === 'login' && (
          <button
            type="button"
            className="auth-inline-link auth-resend-link"
            onClick={handleResendVerification}
            disabled={isSubmitting}
          >
            {t('auth_modal.resend_verification_email')}
          </button>
        )}
        <p className="auth-demo-notice">{t('auth_modal.demo_notice')}</p>
        <p className="auth-modal-switch">
          {isRegistration
            ? t('auth_modal.have_account')
            : isForgotPassword ? t('auth_modal.remember_password') : t('auth_modal.no_account')}
          {' '}
          <button
            type="button"
            onClick={() => {
              setSuccessMessage('');
              setMode(isRegistration || isForgotPassword ? 'login' : 'register');
            }}
          >
            {isRegistration || isForgotPassword ? t('auth_modal.sign_in') : t('auth_modal.create_account')}
          </button>
        </p>
      </section>
    </div>
  );
}
