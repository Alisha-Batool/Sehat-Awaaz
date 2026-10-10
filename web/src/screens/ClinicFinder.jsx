import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const mapsSearchUrl = (query) => {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', query);
  return url.toString();
};

export default function ClinicFinder() {
  const { t } = useTranslation();
  const [manualQuery, setManualQuery] = useState('');
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError(t('facilities.geolocation_unsupported'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 || latitude > 90 ||
          longitude < -180 || longitude > 180
        ) {
          setError(t('facilities.location_unavailable'));
          setLocating(false);
          return;
        }

        window.location.assign(
          `https://www.google.com/maps/search/hospitals/@${latitude},${longitude},14z`
        );
      },
      (positionError) => {
        setError(
          positionError.code === 1
            ? t('facilities.location_denied')
            : t('facilities.location_unavailable')
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleManualSearch = (event) => {
    event.preventDefault();
    const query = manualQuery.trim();
    if (query.length < 2) {
      setError(t('facilities.enter_location'));
      return;
    }

    setError('');
    window.open(mapsSearchUrl(`hospitals and clinics near ${query}`), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="screen clinic-finder">
      <div className="screen-header">
        <span style={{ fontSize: '3rem' }} aria-hidden="true">🏥</span>
        <h1>{t('result.find_clinic')}</h1>
        <p>{t('facilities.subtitle')}</p>
      </div>

      <button className="btn btn-primary btn-block" onClick={handleUseCurrentLocation} disabled={locating}>
        {locating ? t('facilities.location_searching') : t('facilities.use_current_location')}
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
            disabled={manualQuery.trim().length < 2}
          >
            {t('facilities.search')}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="facility-search-error">{error}</p>}
    </div>
  );
}
