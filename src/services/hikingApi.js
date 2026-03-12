const BASE_URL = 'http://localhost:3001/api';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchHikesNearCampground(lat, lon) {
  const radiusInMiles = 40;
  const response = await fetch(
    `${BASE_URL}/hikes?lat=${lat}&lon=${lon}&radius=${radiusInMiles}`
  );
  const data = await response.json();
  return data;
}

export async function fetchHikesFromOverpass(lat, lon, radiusMiles = 25) {
  const radiusMeters = radiusMiles * 1609.34;

  const query = `
    [out:json][timeout:25];
    (
      way["highway"="path"]["name"](around:${radiusMeters},${lat},${lon});
      way["highway"="footway"]["name"](around:${radiusMeters},${lat},${lon});
      way["route"="hiking"](around:${radiusMeters},${lat},${lon});
      relation["route"="hiking"](around:${radiusMeters},${lat},${lon});
    );
    out center;
  `;

  const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
    });

    const data = await response.json();

    const seen = new Set();
    return data.elements
    .filter(el => el.tags && el.tags.name)
    .filter(el => {
        if (seen.has(el.tags.name)) return false;
        seen.add(el.tags.name);
        return true;
    })
    .map(el => ({
        name: el.tags.name,
        distanceMiles: el.tags.distance ? parseFloat(el.tags.distance) : null,
        surface: el.tags.surface || null,
        difficulty: el.tags.sac_scale || null,
        FacilityLatitude: el.center?.lat || null,
        FacilityLongitude: el.center?.lon || null,
        offroadWarning: false,
        source: 'overpass',
    }));
}