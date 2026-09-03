import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { emergencyApi } from '../services/api';

export default function EmergencyAction() {
  const { t } = useTranslation();
  const [guidance, setGuidance] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const result = JSON.parse(sessionStorage.getItem('triageResult') || '{}');
  const emergency = result.emergency;

  const categories = [
    { key: 'chest_pain', label: 'Chest Pain', icon: '💔' },
    { key: 'breathing', label: 'Difficulty Breathing', icon: '🫁' },
    { key: 'bleeding', label: 'Severe Bleeding', icon: '🩸' },
    { key: 'seizure', label: 'Seizure', icon: '⚡' },
  ];

  const loadGuidance = async (category) => {
    setSelectedCategory(category);
    try {
      const { data } = await emergencyApi.guidance(category);
      setGuidance(data);
    } catch {
      setGuidance({ title: 'Emergency', steps: ['Stay calm', 'Call 1122', 'Follow operator instructions'] });
    }
  };

  return (
    <div className="screen">
      <div className="text-center" style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '3rem' }}>🚨</span>
        <h1 style={{ color: 'var(--color-emergency)', marginTop: '12px' }}>
          {t('result.emergency_title')}
        </h1>
      </div>

      {/* Emergency call button — works even offline */}
      <a
        href="tel:1122"
        className="btn btn-danger btn-block"
        style={{ fontSize: '1.2rem', padding: '18px', textDecoration: 'none' }}
      >
        {t('result.call_now')} — 1122
      </a>

      {emergency?.message && (
        <p className="text-muted" style={{ textAlign: 'center', marginTop: '12px' }}>
          {typeof emergency.message === 'string' ? emergency.message : emergency.message.en}
        </p>
      )}

      <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>
        What to do while waiting:
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`option-btn ${selectedCategory === cat.key ? 'selected' : ''}`}
            onClick={() => loadGuidance(cat.key)}
          >
            <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {selectedCategory && guidance.steps && (
        <div className="card mt-md" style={{ borderColor: 'var(--color-emergency)' }}>
          <h4 style={{ marginBottom: '8px' }}>{guidance.title}</h4>
          <ol style={{ paddingLeft: '20px', lineHeight: 2 }}>
            {guidance.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
