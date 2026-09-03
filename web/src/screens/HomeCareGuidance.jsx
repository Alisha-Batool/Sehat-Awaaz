import { useTranslation } from 'react-i18next';

export default function HomeCareGuidance() {
  const { t } = useTranslation();
  const result = JSON.parse(sessionStorage.getItem('triageResult') || '{}');
  const guidance = result.home_care;

  return (
    <div className="screen">
      <div className="screen-header">
        <span style={{ fontSize: '3rem' }}>🏠</span>
        <h1>{t('result.home_care_title')}</h1>
      </div>

      {guidance ? (
        <div>
          <div className="card mb-md">
            <h3 style={{ marginBottom: '12px' }}>{guidance.title}</h3>
            <ul style={{ paddingLeft: '20px', lineHeight: 2.2 }}>
              {guidance.tips?.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>

          {guidance.watchFor && (
            <div className="card" style={{ borderColor: 'var(--color-clinic)' }}>
              <h3 style={{ color: 'var(--color-clinic)', marginBottom: '12px' }}>
                {t('result.watch_for')}
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: 2.2 }}>
                {guidance.watchFor.map((sign, i) => <li key={i}>{sign}</li>)}
              </ul>
              <p className="text-muted" style={{ marginTop: '12px', fontSize: '0.9rem' }}>
                If any of these occur, seek medical help immediately.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <p>Rest, stay hydrated, and monitor your symptoms. If they worsen, seek medical help.</p>
        </div>
      )}
    </div>
  );
}
