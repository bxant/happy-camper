const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';


export async function fetchHikesFromOverpass(lat, lon, radiusMiles = 25) {
  const radiusMeters = radiusMiles * 1609.34;

  const query = `
    [out:json][timeout:25];
    (
        way["highway"="path"]["name"](around:${radiusMeters},${lat},${lon});
        way["highway"="footway"]["name"](around:${radiusMeters},${lat},${lon});
        way["highway"="track"]["name"](around:${radiusMeters},${lat},${lon});
        way["route"="hiking"](around:${radiusMeters},${lat},${lon});
        relation["route"="hiking"](around:${radiusMeters},${lat},${lon});
    );
    out center tags;
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
        distanceMiles: el.tags.distance
            ? parseFloat(el.tags.distance) * 0.621371  // OSM distance is in km
            : el.tags.length
            ? parseFloat(el.tags.length) * 0.621371
            : null,
        surface: el.tags.surface || null,
        difficulty: el.tags.sac_scale || el.tags.difficulty || null,
        FacilityLatitude: el.center?.lat || el.lat || null,
        FacilityLongitude: el.center?.lon || el.lon || null,
        offroadWarning: false,
        source: 'overpass',
        allTrailsUrl: `https://www.alltrails.com/search?q=${encodeURIComponent(el.tags.name)}`,
        }));
}