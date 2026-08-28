const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Find nearby healthcare facilities using Haversine distance formula.
 * Falls back to simple bounding box for performance.
 */
async function findNearby(lat, lng, radiusKm = 10) {
  // Haversine-based distance calculation in SQL
  const result = await db.query(
    `SELECT id, name, type, province, district, lat, lng, phone,
            emergency_capable, last_verified,
            (6371 * acos(
              cos(radians($1)) * cos(radians(lat)) *
              cos(radians(lng) - radians($2)) +
              sin(radians($1)) * sin(radians(lat))
            )) AS distance_km
     FROM facilities
     WHERE lat IS NOT NULL AND lng IS NOT NULL
     HAVING (6371 * acos(
              cos(radians($1)) * cos(radians(lat)) *
              cos(radians(lng) - radians($2)) +
              sin(radians($1)) * sin(radians(lat))
            )) <= $3
     ORDER BY distance_km ASC
     LIMIT 20`,
    [lat, lng, radiusKm]
  );

  return result.rows.map((f) => ({
    ...f,
    distance_km: Math.round(f.distance_km * 10) / 10,
    confidence: f.last_verified
      ? getConfidenceLevel(f.last_verified)
      : 'unknown',
  }));
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

module.exports = { findNearby, getClinicFinderMessage };
