const Facility = require('../models/Facility');
const logger = require('../utils/logger');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const responseCache = new Map();

function getCached(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(key, value) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchJson(url, options, serviceName) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const upstreamError = new Error(`${serviceName} is unavailable or timed out`);
    upstreamError.statusCode = 502;
    upstreamError.cause = error;
    throw upstreamError;
  }

  if (!response.ok) {
    const upstreamError = new Error(
      `${serviceName} returned HTTP ${response.status}`
    );
    upstreamError.statusCode = response.status === 429 ? 503 : 502;
    throw upstreamError;
  }

  try {
    return await response.json();
  } catch (error) {
    const upstreamError = new Error(`${serviceName} returned an invalid response`);
    upstreamError.statusCode = 502;
    upstreamError.cause = error;
    throw upstreamError;
  }
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
  );
}

function normalizeOsmFacility(element) {
  const tags = element.tags || {};
  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const type = tags.amenity || tags.healthcare || 'healthcare facility';
  const address =
    tags['addr:full'] ||
    [
      tags['addr:housenumber'] && tags['addr:street']
        ? `${tags['addr:housenumber']} ${tags['addr:street']}`
        : tags['addr:street'],
      tags['addr:suburb'],
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      tags['addr:state'],
    ]
      .filter(Boolean)
      .join(', ') ||
    null;

  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags['name:en'] || `Unnamed ${type}`,
    latitude,
    longitude,
    address,
    type,
    source: 'OpenStreetMap',
  };
}

async function findOpenStreetMapFacilities(lat, lng, radiusKm, type) {
  const cacheKey = `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusKm}:${type}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const amenityFilter =
    type === 'all' ? 'hospital|clinic' : type;
  const query = `[out:json][timeout:15];(node["amenity"~"${amenityFilter}"](around:${Math.round(radiusKm * 1000)},${lat},${lng});way["amenity"~"${amenityFilter}"](around:${Math.round(radiusKm * 1000)},${lat},${lng});relation["amenity"~"${amenityFilter}"](around:${Math.round(radiusKm * 1000)},${lat},${lng}););out center tags;`;
  const payload = await fetchJson(
    OVERPASS_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SehatAwaaz/0.1.0 (healthcare facility finder)',
      },
      body: new URLSearchParams({ data: query }),
    },
    'OpenStreetMap Overpass'
  );
  if (!Array.isArray(payload.elements)) {
    const error = new Error('OpenStreetMap Overpass returned an invalid facility list');
    error.statusCode = 502;
    throw error;
  }

  const facilities = payload.elements
    .map(normalizeOsmFacility)
    .filter(Boolean);
  setCached(cacheKey, facilities);
  return facilities;
}

async function findDatabaseFacilities(lat, lng, radiusKm, type) {
  const filter = {
    lat: { $ne: null },
    lng: { $ne: null },
  };

  if (type !== 'all') {
    const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.type = { $regex: escapedType, $options: 'i' };
  }

  const records = await Facility.find(filter).lean();

  return records
    .map((facility) => ({
      facility,
      distance: distanceInKm(
        lat,
        lng,
        Number(facility.lat),
        Number(facility.lng)
      ),
    }))
    .filter(({ facility, distance }) =>
      Number.isFinite(Number(facility.lat)) &&
      Number.isFinite(Number(facility.lng)) &&
      distance <= radiusKm
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20)
    .map(({ facility }) => ({
      id: `local-${facility._id}`,
      name: facility.name,
      type: facility.type || 'healthcare facility',
      latitude: Number(facility.lat),
      longitude: Number(facility.lng),
      address:
        facility.address ||
        [facility.district, facility.province].filter(Boolean).join(', ') ||
        null,
      phone: facility.phone,
      emergency_capable: facility.emergency_capable,
      last_verified: facility.last_verified,
      confidence: facility.last_verified
        ? getConfidenceLevel(facility.last_verified)
        : 'unknown',
      source: 'Sehat Awaaz directory',
    }));
}

/**
 * Search the OpenStreetMap directory separately from the triage decision.
 */
async function findNearby(lat, lng, radiusKm = 5, type = 'all') {
  const [osmResult, directoryResult] = await Promise.allSettled([
    findOpenStreetMapFacilities(lat, lng, radiusKm, type),
    findDatabaseFacilities(lat, lng, radiusKm, type),
  ]);
  const warnings = [];

  if (osmResult.status === 'rejected') {
    logger.warn('OpenStreetMap facility search failed', { error: osmResult.reason.message });
    if (directoryResult.status === 'rejected') throw osmResult.reason;
    warnings.push('osm_unavailable');
  }
  if (directoryResult.status === 'rejected') {
    logger.warn('Local facility directory is unavailable', {
      error: directoryResult.reason.message,
    });
    warnings.push('directory_unavailable');
  }

  const osmFacilities = osmResult.status === 'fulfilled' ? osmResult.value : [];
  const directoryFacilities =
    directoryResult.status === 'fulfilled' ? directoryResult.value : [];
  const seen = new Set();
  const facilities = [...osmFacilities, ...directoryFacilities]
    .map((facility) => ({
      ...facility,
      exactDistanceKm: distanceInKm(lat, lng, facility.latitude, facility.longitude),
    }))
    .filter((facility) => {
      if (facility.exactDistanceKm > radiusKm) return false;
      const identity = `${facility.name.toLocaleLowerCase()}:${facility.latitude.toFixed(4)}:${facility.longitude.toFixed(4)}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort((a, b) => a.exactDistanceKm - b.exactDistanceKm)
    .map(({ exactDistanceKm, ...facility }) => ({
      ...facility,
      distance_km: Math.round(exactDistanceKm * 10) / 10,
    }));

  return { facilities, warnings };
}

async function geocodeLocation(query) {
  const cacheKey = `geocode:${query.toLocaleLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = new URL(NOMINATIM_URL);
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'pk',
  }).toString();
  const results = await fetchJson(
    url,
    {
      headers: {
        'User-Agent': 'SehatAwaaz/0.1.0 (healthcare facility finder)',
        Accept: 'application/json',
      },
    },
    'OpenStreetMap Nominatim'
  );

  if (!Array.isArray(results)) {
    const error = new Error('OpenStreetMap Nominatim returned an invalid location list');
    error.statusCode = 502;
    throw error;
  }
  if (!results.length) {
    const error = new Error('No matching location was found in Pakistan');
    error.statusCode = 404;
    throw error;
  }

  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const error = new Error('OpenStreetMap Nominatim returned invalid coordinates');
    error.statusCode = 502;
    throw error;
  }

  const location = {
    latitude,
    longitude,
    displayName: results[0].display_name,
  };
  setCached(cacheKey, location);
  return location;
}

/**
 * Get a confidence level based on when the facility was last verified
 */
function getConfidenceLevel(lastVerified) {
  const daysSince = Math.floor(
    (Date.now() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince <= 90) return 'high';
  if (daysSince <= 365) return 'medium';
  return 'low';
}

function getClinicFinderMessage(language) {
  const messages = {
    en: 'We found nearby healthcare facilities. Please visit one for a proper checkup.',
    ur: 'ہم نے قریبی صحت کی سہولیات تلاش کی ہیں۔ براہ کرم مناسب معائنے کے لیے جائیں۔',
    'ur-roman': 'Hum ne qareebi sehat ki sahuliyaat talaash ki hain. Barah-e-karam munasib muainay ke liye jayein.',
  };
  return messages[language] || messages.en;
}

module.exports = { findNearby, geocodeLocation, getClinicFinderMessage };
