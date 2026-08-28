import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { authApi } from '../services/api';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, guestLogin } = useAuth();

  // Auto-login as guest if no user
  useEffect(() => {
    if (!user) {
      guestLogin().catch(() => {});
    }
  }, [user, guestLogin]);

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        {user?.isGuest && (
          <p style={{ fontSize: '0.8rem', color: '#F57C00', marginTop: '8px' }}>
            {t('home.guest_notice')}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button
          className="btn btn-primary btn-block"
          onClick={() => navigate('/symptoms')}
          style={{ padding: '20px', fontSize: '1.1rem' }}
        >
          <span style={{ fontSize: '1.4rem' }}>⌨️</span>
          {t('home.type_symptoms')}
        </button>

        <div className="text-center" style={{ color: '#999' }}>{t('or')}</div>

        <button
          className="btn btn-secondary btn-block"
          onClick={() => navigate('/voice')}
          style={{ padding: '20px', fontSize: '1.1rem' }}
        >
          <span style={{ fontSize: '1.4rem' }}>🎙️</span>
          {t('home.use_voice')}
        </button>

        {user && !user.isGuest && (
          <button
            className="btn btn-ghost btn-block mt-lg"
            onClick={() => navigate('/history')}
          >
            {t('history.title')}
          </button>
        )}
      </div>
    </div>
  );
}
