import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('onboarding.title')}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '2rem' }}>🎙️</span>
          <p style={{ flex: 1 }}>{t('onboarding.step1')}</p>
        </div>

        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '2rem' }}>❓</span>
          <p style={{ flex: 1 }}>{t('onboarding.step2')}</p>
        </div>

        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '2rem' }}>🏥</span>
          <p style={{ flex: 1 }}>{t('onboarding.step3')}</p>
        </div>

        <div className="disclaimer">
          {t('onboarding.disclaimer')}
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={() => navigate('/home')}
        >
          {t('onboarding.get_started')}
        </button>
      </div>
    </div>
  );
}
