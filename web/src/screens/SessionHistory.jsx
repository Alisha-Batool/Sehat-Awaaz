import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sessionsApi } from '../services/api';

export default function SessionHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionsApi
      .list()
      .then(({ data }) => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await sessionsApi.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  const tierColors = {
    emergency: 'var(--color-emergency)',
    clinic: 'var(--color-clinic)',
    home_care: 'var(--color-home-care)',
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>{t('history.title')}</h1>
      </div>

      {loading && <div className="spinner" />}

      {!loading && sessions.length === 0 && (
        <div className="card text-center">
          <p style={{ color: '#999' }}>{t('history.empty')}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sessions.map((session) => (
          <div key={session.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    color: tierColors[session.tier] || '#333',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  {session.tier?.replace('_', ' ')}
                </span>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                  {new Date(session.created_at).toLocaleDateString()} —{' '}
                  {new Date(session.created_at).toLocaleTimeString()}
                </p>
                {session.explanation && (
                  <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>{session.explanation}</p>
                )}
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => handleDelete(session.id)}
                style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}
              >
                {t('history.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost btn-block mt-lg" onClick={() => navigate('/home')}>
        {t('back')}
      </button>
    </div>
  );
}
