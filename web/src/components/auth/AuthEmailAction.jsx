import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { validateNewPassword } from './authValidation';

export default function AuthEmailAction() {
  const { t } = useTranslation();
  const { verifyEmail, resetPassword } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const isVerification = location.pathname === '/verify-email';
  const attemptedToken = useRef('');
  const [verificationState, setVerificationState] = useState(token ? 'loading' : 'error');
  const [resetState, setResetState] = useState(token ? 'form' : 'error');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isVerification) return;
    if (!token) {
      setVerificationState('error');
      return;
    }
    if (attemptedToken.current === token) return;
    attemptedToken.current = token;
    setVerificationState('loading');
    verifyEmail(token)
      .then(() => setVerificationState('success'))
      .catch(() => setVerificationState('error'));
  }, [isVerification, token, verifyEmail]);

  const handleReset = async (event) => {
    event.preventDefault();
    const passwordError = validateNewPassword(password);
    if (passwordError) {
      setErrorKey(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorKey('auth_modal.passwords_mismatch');
      return;
    }
    if (!token) {
      setResetState('error');
      return;
    }

    setErrorKey('');
    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setResetState('success');
    } catch {
      setResetState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const state = isVerification ? verificationState : resetState;
  const title = isVerification ? t('auth_modal.verify_title') : t('auth_modal.reset_title');
  let message;
  if (isVerification) {
    message = state === 'loading'
      ? t('auth_modal.verify_loading')
      : state === 'success'
        ? t('auth_modal.verification_success')
        : t('auth_modal.verification_failed');
  } else {
    message = state === 'success'
      ? t('auth_modal.password_reset_success')
      : state === 'error' ? t('auth_modal.password_reset_invalid') : '';
  }

  return (
    <div className="auth-action-page">
      <section className="auth-modal auth-action-card" aria-labelledby="auth-action-title">
        <div className="auth-modal-brand">
          <span className="brand-mark"><ShieldCheck size={20} /></span>
          <span>{t('auth_modal.eyebrow')}</span>
        </div>
        <h1 id="auth-action-title">{title}</h1>
        <p className="auth-modal-description">
          {isVerification ? t('auth_modal.verify_description') : t('auth_modal.reset_description')}
        </p>

        {isVerification && (
          <p
            className={state === 'error' ? 'auth-modal-error' : 'auth-modal-success'}
            role={state === 'error' ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}
        {!isVerification && state !== 'form' && (
          <p className={state === 'success' ? 'auth-modal-success' : 'auth-modal-error'} role="status">
            {message}
          </p>
        )}

        {!isVerification && state === 'form' && (
          <form className="auth-modal-form" onSubmit={handleReset} noValidate>
            <label className="auth-field">
              <span>{t('auth_modal.password')}</span>
              <span className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </span>
            </label>
            <label className="auth-field">
              <span>{t('auth_modal.confirm_password')}</span>
              <span className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </span>
            </label>
            {errorKey && <p className="auth-modal-error" role="alert">{t(errorKey)}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {t('auth_modal.reset_password_button')}
            </button>
          </form>
        )}

        {state !== 'loading' && (
          <p className="auth-modal-switch">
            <Link to="/">{t('auth_modal.return_to_sign_in')}</Link>
          </p>
        )}
      </section>
    </div>
  );
}
