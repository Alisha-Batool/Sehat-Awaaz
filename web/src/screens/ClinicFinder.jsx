import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { facilitiesApi } from '../services/api';

export default function ClinicFinder() {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Default to Lahore if geolocation fails
        setLocation({ lat: 31.5204, lng: 74.3587 });
      }
    );
  }, []);

  useEffect(() => {
    if (!location) return;

    facilitiesApi
      .nearby(location.lat, location.lng, 15)
      .then(({ data }) => setFacilities(data.facilities || []))
      .catch(() => setError('Could not load nearby facilities'))
      .finally(() => setLoading(false));
  }, [location]);

  return (
    <div className="screen">
      <div className="screen-header">
        <span style={{ fontSize: '3rem' }}>🏥</span>
        <h1>{t('result.find_clinic')}</h1>
      </div>

      {loading && <div className="spinner" />}
      {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {facilities.map((f) => (
          <div key={f.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem' }}>{f.name}</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {f.type} — {f.district}, {f.province}
                </p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {f.distance_km} km away
                  {f.emergency_capable && ' — Emergency capable'}
                </p>
              </div>
              <span className={`confidence-chip confidence-${f.confidence || 'low'}`}>
                {f.confidence} confidence
              </span>
            </div>

            {f.phone && (
              <a href={`tel:${f.phone}`} className="btn btn-secondary" style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                Call {f.phone}
              </a>
            )}

            {f.lat && f.lng && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lng}#map=15/${f.lat}/${f.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ marginTop: '8px', fontSize: '0.85rem' }}
              >
                View on Map
              </a>
            )}

            {f.last_verified && (
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                Last verified: {new Date(f.last_verified).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
