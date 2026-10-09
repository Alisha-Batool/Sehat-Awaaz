import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { facilitiesApi } from '../services/api';

export default function ClinicFinder() {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [manualQuery, setManualQuery] = useState('');

  const loadFacilities = async (coordinates, label = '') => {
    setLoading(true);
    setError('');
    setWarnings([]);
    setFacilities([]);
    setLocation(coordinates);
    setLocationLabel(label);
    try {
      const { data } = await facilitiesApi.nearby(
        coordinates.latitude,
        coordinates.longitude,
        5,
        'all'
      );
      setFacilities(data.facilities);
      setWarnings(data.warnings || []);
    } catch (requestError) {
      console.error('Nearby facility search failed', requestError);
      setError(t('facilities.search_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setError('');
    setWarnings([]);
    setLocation(null);
    setFacilities([]);
    if (!navigator.geolocation) {
      setError(t('facilities.geolocation_unsupported'));
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadFacilities({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      (positionError) => {
        setLoading(false);
        setError(
          positionError.code === 1
            ? t('facilities.location_denied')
            : t('facilities.location_unavailable')
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleManualSearch = async (event) => {
    event.preventDefault();
    const query = manualQuery.trim();
    if (query.length < 2) {
      setError(t('facilities.enter_location'));
      return;
    }

    setLoading(true);
    setError('');
    setWarnings([]);
    setLocation(null);
    setFacilities([]);
    try {
      const { data } = await facilitiesApi.geocode(query);
      const coordinates = data.location;
      await loadFacilities(
        { latitude: coordinates.latitude, longitude: coordinates.longitude },
        coordinates.displayName
      );
    } catch (requestError) {
      console.error('Facility location search failed', requestError);
      setLoading(false);
      setError(t('facilities.search_failed'));
    }
  };

  return (
    <div className="screen clinic-finder">
      <div className="screen-header">
        <span style={{ fontSize: '3rem' }} aria-hidden="true">🏥</span>
        <h1>{t('result.find_clinic')}</h1>
        <p>{t('facilities.subtitle')}</p>
      </div>

      <button
        className="btn btn-primary btn-block"
        onClick={handleUseCurrentLocation}
        disabled={loading}
      >
        {loading ? t('facilities.searching') : t('facilities.use_current_location')}
      </button>

      <div className="facility-search-divider" aria-hidden="true">
        {t('or')}
      </div>

      <form className="facility-manual-search" onSubmit={handleManualSearch}>
        <label className="facility-search-label" htmlFor="facility-location">
          {t('facilities.search_manually')}
        </label>
        <div className="facility-search-controls">
          <input
            id="facility-location"
            className="input"
            value={manualQuery}
            onChange={(event) => setManualQuery(event.target.value)}
            placeholder={t('facilities.location_placeholder')}
            maxLength={200}
          />
          <button
            className="btn btn-secondary"
            type="submit"
            disabled={loading || manualQuery.trim().length < 2}
          >
            {t('facilities.search')}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="facility-search-error">
          {error}
        </p>
      )}

      {loading && <div className="spinner" aria-label={t('facilities.searching')} />}

      {location && !loading && (
        <>
          {warnings.map((warning) => (
            <p key={warning} role="status" className="facility-search-warning">
              {t(`facilities.warning_${warning}`)}
            </p>
          ))}
          <div className="facility-results-heading">
            <h2>{t('facilities.results_title')}</h2>
            <p className="text-muted">
              {locationLabel || t('facilities.current_location')} · {t('facilities.radius')}
            </p>
          </div>

          {facilities.length === 0 ? (
            <div className="card facility-empty-state">
              <p>{t('facilities.no_results')}</p>
            </div>
          ) : (
            <div className="facility-results">
              {facilities.map((facility) => {
                const directionsUrl = new URL('https://www.google.com/maps/dir/');
                directionsUrl.searchParams.set('api', '1');
                directionsUrl.searchParams.set(
                  'destination',
                  `${facility.latitude},${facility.longitude}`
                );
                directionsUrl.searchParams.set(
                  'origin',
                  `${location.latitude},${location.longitude}`
                );

                return (
                  <article key={facility.id} className="card facility-card">
                    <div className="facility-card-heading">
                      <div>
                        <h3>{facility.name}</h3>
                        <p className="text-muted facility-type">{facility.type}</p>
                      </div>
                      <span className="facility-distance">
                        {t('facilities.distance', {
                          distance: Number(facility.distance_km).toFixed(1),
                        })}
                      </span>
                    </div>
                    <p className="text-muted facility-address">
                      {facility.address || t('facilities.address_unavailable')}
                    </p>
                    <a
                      href={directionsUrl.toString()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      {t('facilities.directions')}
                    </a>
                  </article>
                );
              })}
            </div>
          )}

          <p className="facility-data-note">{t('facilities.data_note')}</p>
        </>
      )}
    </div>
  );
}
