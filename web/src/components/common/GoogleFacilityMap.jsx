import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isGoogleMapsConfigured, loadGoogleMaps } from '../../services/googleMaps';

function createInfoContent(facility, location, t) {
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = facility.name;
  const address = document.createElement('p');
  address.textContent = facility.address || t('facilities.address_unavailable');
  content.append(title, address);

  const mapsLink = document.createElement('a');
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
  mapsLink.href = directionsUrl.toString();
  mapsLink.target = '_blank';
  mapsLink.rel = 'noopener noreferrer';
  mapsLink.textContent = t('facilities.directions');
  content.appendChild(mapsLink);
  return content;
}

export default function GoogleFacilityMap({ location, facilities, onError }) {
  const { t } = useTranslation();
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLibraryRef = useRef(null);
  const infoWindowRef = useRef(null);
  const facilityMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let active = true;
    setMapReady(false);
    onError('');

    loadGoogleMaps()
      .then(async (maps) => {
        const [mapsLibrary, markerLibrary] = await Promise.all([
          maps.importLibrary('maps'),
          maps.importLibrary('marker'),
        ]);
        return { mapsLibrary, markerLibrary };
      })
      .then(({ mapsLibrary, markerLibrary }) => {
        if (!active) return;
        mapRef.current = new mapsLibrary.Map(mapElementRef.current, {
          center: { lat: location.latitude, lng: location.longitude },
          zoom: 13,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
        });
        markerLibraryRef.current = markerLibrary;
        infoWindowRef.current = new mapsLibrary.InfoWindow();
        const userMarkerContent = document.createElement('div');
        userMarkerContent.className = 'google-user-pin';
        new markerLibrary.AdvancedMarkerElement({
          map: mapRef.current,
          position: { lat: location.latitude, lng: location.longitude },
          title: t('facilities.current_location'),
          content: userMarkerContent,
        });
        mapRef.current.setOptions({ maxZoom: 16 });
        setMapReady(true);
      })
      .catch((error) => {
        if (active) onError(error.message);
      });

    return () => {
      active = false;
      facilityMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      facilityMarkersRef.current = [];
      mapRef.current = null;
      markerLibraryRef.current = null;
      infoWindowRef.current = null;
    };
  }, [location, onError, t]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerLibraryRef.current) return;

    facilityMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    facilityMarkersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: location.latitude, lng: location.longitude });
    facilities.forEach((facility) => {
      const position = { lat: facility.latitude, lng: facility.longitude };
      bounds.extend(position);
      const markerContent = document.createElement('div');
      markerContent.className = 'google-facility-pin';
      const marker = new markerLibraryRef.current.AdvancedMarkerElement({
        map: mapRef.current,
        position,
        title: facility.name,
        content: markerContent,
        gmpClickable: true,
      });
      marker.addEventListener('gmp-click', () => {
        infoWindowRef.current.setContent(createInfoContent(facility, location, t));
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
      });
      facilityMarkersRef.current.push(marker);
    });

    if (facilities.length) mapRef.current.fitBounds(bounds, 48);
  }, [facilities, location, mapReady, t]);

  return (
    <>
      <div
        ref={mapElementRef}
        className="google-facility-map"
        aria-label={t('facilities.map_label')}
      />
      {!isGoogleMapsConfigured() && (
        <p className="facility-search-warning">{t('facilities.api_key_required')}</p>
      )}
      {isGoogleMapsConfigured() && !mapReady && (
        <p className="facility-search-warning">{t('facilities.map_loading')}</p>
      )}
    </>
  );
}
