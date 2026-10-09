let googleMapsPromise;

export function isGoogleMapsConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim());
}

export async function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to web/.env.local.'
    );
  }

  if (window.google?.maps?.importLibrary) return window.google.maps;
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const scriptId = 'google-maps-javascript-api';
    let script = document.getElementById(scriptId);
    const startedAt = Date.now();
    let pollTimer;

    const checkReady = () => {
      if (window.google?.maps?.importLibrary) {
        clearTimeout(pollTimer);
        resolve(window.google.maps);
        return;
      }

      if (Date.now() - startedAt >= 10000) {
        reject(
          new Error(
            'Google Maps did not initialize. Check that Maps JavaScript API is enabled and the API key is valid.'
          )
        );
        return;
      }

      pollTimer = setTimeout(checkReady, 50);
    };

    const handleError = () => {
      clearTimeout(pollTimer);
      reject(new Error('Could not load Google Maps. Check the API key and network.'));
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
      })}`;
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
    }

    checkReady();
  }).catch((error) => {
    googleMapsPromise = null;
    throw error;
  });

  return googleMapsPromise;
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(lat2 - lat1);
  const lngDelta = toRadians(lng2 - lng1);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(lngDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371 * 2 * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine)
  );
}

export async function geocodeLocation(query) {
  const maps = await loadGoogleMaps();
  const { results } = await new maps.Geocoder().geocode({
    address: query,
    componentRestrictions: { country: 'PK' },
  });

  if (!results?.length) {
    throw new Error('Google Maps could not find that location in Pakistan.');
  }

  const result = results[0];
  return {
    latitude: result.geometry.location.lat(),
    longitude: result.geometry.location.lng(),
    displayName: result.formatted_address,
  };
}

export async function searchNearbyFacilities(location) {
  const maps = await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference } = await maps.importLibrary('places');
  const { places } = await Place.searchNearby({
    fields: [
      'id',
      'displayName',
      'location',
      'formattedAddress',
      'types',
    ],
    locationRestriction: {
      center: { lat: location.latitude, lng: location.longitude },
      radius: 5000,
    },
    includedPrimaryTypes: ['hospital', 'medical_clinic'],
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
  });

  return places
    .filter((place) => place.location)
    .map((place) => {
      const latitude = place.location.lat();
      const longitude = place.location.lng();
      const type = place.types?.find((item) =>
        ['hospital', 'medical_clinic'].includes(item)
      );
      return {
        id: place.id,
        name: place.displayName || 'Healthcare facility',
        latitude,
        longitude,
        address: place.formattedAddress || null,
        type: type === 'medical_clinic' ? 'Clinic' : 'Hospital',
        phone: null,
        distance_km:
          Math.round(
            calculateDistanceKm(
              location.latitude,
              location.longitude,
              latitude,
              longitude
            ) * 10
          ) / 10,
      };
    })
    .sort((first, second) => first.distance_km - second.distance_km);
}
