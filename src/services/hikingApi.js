const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_MIRROR = 'https://overpass.kumi.systems/api/interpreter';

// Name patterns that strongly suggest a road/service path, not a hiking trail
const ROAD_NAME_PATTERNS = [
  /\broad\b/i,
  /\blane\b/i,
  /\bdrive\b/i,
  /\bohv\b/i,
  /\broute\b/i,
  /^fsr\s/i,
  /^usfs\s/i,
  /^usda\s/i,
  /^fs\s/i,
  /^[0-9a-z]{2,6}[a-z]?\d*[a-z]?$/i, // pure codes like 8S10, 9S06, 5S02B
];

// OSM highway types that warrant an offroad warning
const OFFROAD_HIGHWAY_TYPES = new Set(['track', 'service', 'unclassified']);

function isOffroadPath(el) {
  const highway = el.tags.highway || '';
  const surface = el.tags.surface || '';
  const access = el.tags.access || '';

  if (OFFROAD_HIGHWAY_TYPES.has(highway)) return true;
  if (access === 'private' || access === 'no') return true;
  if (el.tags.motorcar === 'yes' || el.tags.motor_vehicle === 'yes') return true;
  if (surface === 'unpaved' && highway === 'track') return true;
  return false;
}

function looksLikeRoadNotTrail(name) {
  return ROAD_NAME_PATTERNS.some(pattern => pattern.test(name.trim()));
}

async function fetchFromOverpass(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function fetchHikesFromOverpass(lat, lon, radiusMiles = 25) {
  const radiusMeters = radiusMiles * 1609.34;

  // Dropped highway=track — primary source of road/service path noise
  const query = `
    [out:json][timeout:25];
    (
        way["highway"="path"]["name"](around:${radiusMeters},${lat},${lon});
        way["highway"="footway"]["name"](around:${radiusMeters},${lat},${lon});
        way["route"="hiking"](around:${radiusMeters},${lat},${lon});
        relation["route"="hiking"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
    `;

  const body = `data=${encodeURIComponent(query)}`;

  let data;
  const urls = [OVERPASS_URL, OVERPASS_MIRROR];

  for (let attempt = 0; attempt < urls.length; attempt++) {
    try {
      data = await fetchFromOverpass(urls[attempt], body);
      break;
    } catch (err) {
      console.warn(`Overpass attempt ${attempt + 1} failed (${urls[attempt]}):`, err.message);
      if (attempt < urls.length - 1) {
        await new Promise(res => setTimeout(res, 2000));
      } else {
        throw err;
      }
    }
  }

  const seen = new Set();
  return data.elements
    .filter(el => el.tags && el.tags.name)
    .filter(el => {
      if (seen.has(el.tags.name)) return false;
      seen.add(el.tags.name);
      return true;
    })
    .map(el => {
      const name = el.tags.name;
      const offroadWarning = isOffroadPath(el);
      const needsVerify = looksLikeRoadNotTrail(name) || offroadWarning;

      return {
        name,
        distanceMiles: el.tags.distance
          ? parseFloat(el.tags.distance) * 0.621371
          : el.tags.length
          ? parseFloat(el.tags.length) * 0.621371
          : null,
        surface: el.tags.surface || null,
        difficulty: el.tags.sac_scale || el.tags.difficulty || null,
        FacilityLatitude: el.center?.lat || el.lat || null,
        FacilityLongitude: el.center?.lon || el.lon || null,
        offroadWarning,
        needsVerify,
        source: 'overpass',
      };
    });
}