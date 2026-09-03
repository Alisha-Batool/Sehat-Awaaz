import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function TriageResult() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const result = JSON.parse(sessionStorage.getItem('triageResult') || '{}');
  const { tier, explanation, disclaimer, emergency, home_care, source } = result;

  if (!tier) {
    navigate('/home');
    return null;
  }

  const tierConfig = {
    emergency: {
      icon: '🚨',
      title: t('result.emergency_title'),
      className: 'emergency',
    },
    clinic: {
      icon: '🏥',
      title: t('result.clinic_title'),
      className: 'clinic',
    },
    home_care: {
      icon: '🏠',
      title: t('result.home_care_title'),
      className: 'home_care',
    },
  };

  const config = tierConfig[tier] || tierConfig.clinic;

  return (
    <div className="screen">
      <div className="text-center" style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '3rem' }}>{config.icon}</span>
        <h1 style={{ marginTop: '12px', fontSize: '1.5rem' }}>{config.title}</h1>
        <span className={`tier-badge ${config.className}`} style={{ marginTop: '12px' }}>
          {tier.replace('_', ' ').toUpperCase()}
        </span>
        {source === 'demo' && <div className="badge-demo">Demo Mode — backend not connected</div>}
      </div>

      <div className="card mb-md">
        <p style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>{explanation}</p>
      </div>

      {/* Tier-specific actions */}
      {tier === 'emergency' && (
        <>
          <a href="tel:1122" className="btn btn-danger btn-block" style={{ textDecoration: 'none' }}>
            {t('result.call_now')} — 1122
          </a>
          <button className="btn btn-secondary btn-block mt-md" onClick={() => navigate('/emergency')}>
            What to do while waiting
          </button>
        </>
      )}

      {tier === 'clinic' && (
        <button className="btn btn-primary btn-block" onClick={() => navigate('/clinic-finder')}>
          {t('result.find_clinic')}
        </button>
      )}

      {tier === 'home_care' && home_care && (
        <div>
          <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>{t('result.home_care_tips')}</h3>
          <div className="card">
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              {home_care.tips?.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
            {home_care.watchFor && (
              <>
                <h4 style={{ marginTop: '12px', color: 'var(--color-clinic)' }}>
                  {t('result.watch_for')}:
                </h4>
                <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
                  {home_care.watchFor.map((sign, i) => (
                    <li key={i}>{sign}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      <button
        className="btn btn-ghost btn-block mt-lg"
        onClick={() => {
          sessionStorage.clear();
          navigate('/home');
        }}
      >
        {t('result.re_triage')}
      </button>

      {disclaimer && (
        <div className="disclaimer mt-md">{disclaimer}</div>
      )}
    </div>
  );
}
