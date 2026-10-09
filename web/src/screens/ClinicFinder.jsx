import { useState } from 'react';
import GoogleFacilityMap from '../components/common/GoogleFacilityMap';
import { useTranslation } from 'react-i18next';
import {
  geocodeLocation,
  isGoogleMapsConfigured,
  searchNearbyFacilities,
} from '../services/googleMaps';

function getGoogleMapsError(error, fallback) {
  const message = error?.message || '';
  if (/billing.*(enable|required)|enable billing/i.test(message)) {
    return 'Google Cloud billing is not enabled for this project. Enable billing, then retry.';
  }
  if (/not allowed|referer|referrer|REQUEST_DENIED/i.test(message)) {
    return 'Google rejected this website for the API key. Allow http://localhost:5173/* in the key’s website restrictions and enable Geocoding API, Places API (New), and Maps JavaScript API.';
  }
  if (/not activated|ApiNotActivated|REQUEST_DENIED/i.test(message)) {
    return 'Enable Geocoding API, Places API (New), and Maps JavaScript API for the Google Cloud project used by this key.';
  }
  if (/InvalidKey|invalid api key/i.test(message)) {
    return 'Google rejected the API key. Check that it is correct and that its API and website restrictions allow this app.';
  }
  return message || fallback;
}

export default function ClinicFinder() {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [manualQuery, setManualQuery] = useState('');

  const loadFacilities = async (coordinates, label = '') => {
    setLoading(true);
    setError('');
    setMapError('');
    setFacilities([]);
    setLocation(coordinates);
    setLocationLabel(label);
    try {
      const results = await searchNearbyFacilities(coordinates);
      setFacilities(results);
    } catch (requestError) {
      console.error('Google Places facility search failed', requestError);
      setError(getGoogleMapsError(requestError, t('facilities.search_failed')));
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setError('');
    setMapError('');
    setLocation(null);
    setFacilities([]);
    if (!isGoogleMapsConfigured()) {
      setError(t('facilities.api_key_required'));
      return;
    }
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

    if (!isGoogleMapsConfigured()) {
      setError(t('facilities.api_key_required'));
      return;
    }

    setLoading(true);
    setError('');
    setMapError('');
    setLocation(null);
    setFacilities([]);
    try {
      const coordinates = await geocodeLocation(query);
      await loadFacilities(
        { latitude: coordinates.latitude, longitude: coordinates.longitude },
        coordinates.displayName
      );
    } catch (requestError) {
      console.error('Google Maps location search failed', requestError);
      setLoading(false);
      setError(getGoogleMapsError(requestError, t('facilities.search_failed')));
    }
  };

  const googleMapsConfigured = isGoogleMapsConfigured();
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location
      ? `hospitals and clinics near ${location.latitude},${location.longitude}`
      : manualQuery.trim() || 'hospitals and clinics'
  )}`;

  return (
    <div className="screen clinic-finder">
      <div className="screen-header">
        <span style={{ fontSize: '3rem' }} aria-hidden="true">🏥</span>
        <h1>{t('result.find_clinic')}</h1>
        <p>{t('facilities.subtitle')}</p>
      </div>

      {!googleMapsConfigured && (
        <p role="status" className="facility-search-warning">
          {t('facilities.api_key_required')}
        </p>
      )}

      <button
        className="btn btn-primary btn-block"
        onClick={handleUseCurrentLocation}
        disabled={loading || !googleMapsConfigured}
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
            disabled={!googleMapsConfigured || loading || manualQuery.trim().length < 2}
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
      {(error || !googleMapsConfigured) && (
        <a
          className="btn btn-ghost facility-fallback-link"
          href={googleMapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('facilities.google_fallback')}
        </a>
      )}

      {loading && <div className="spinner" aria-label={t('facilities.searching')} />}

      {location && !loading && (
        <>
          {mapError && <p role="alert" className="facility-search-warning">{mapError}</p>}
          <div className="facility-results-heading">
            <h2>{t('facilities.results_title')}</h2>
            <p className="text-muted">
              {locationLabel || t('facilities.current_location')} · {t('facilities.radius')}
            </p>
          </div>

          <div className="facility-map">
            <GoogleFacilityMap
              key={`${location.latitude},${location.longitude}`}
              location={location}
              facilities={facilities}
              onError={setMapError}
            />
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
