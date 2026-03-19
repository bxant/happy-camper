const BASE_URL = 'http://localhost:3001/api/nps';

const NPS_CAMPGROUND_MAP = {
  'jumbo rocks': 'jotr',
  'joshua tree': 'jotr',
  'furnace creek': 'deva',
  'stovepipe wells': 'deva',
  'mesquite spring': 'deva',
  'sunset campground': 'deva',
  'curry village': 'yose',
  'half dome': 'yose',
  'upper pines': 'yose',
  'lower pines': 'yose',
  'north pines': 'yose',
  'mather': 'grca',
  'desert view': 'grca',
};

export async function findNearbyNPSPark(lat, lon) {
  const response = await fetch(`${BASE_URL}/parks?lat=${lat}&lon=${lon}`);
  const parks = await response.json();

  if (!parks || parks.length === 0) return null;

  // Return the closest park — first result from NPS radius search
  return parks[0];
}

export async function fetchNPSAlerts(parkCode) {
  if (!parkCode) return [];
  const response = await fetch(`${BASE_URL}/alerts?parkCode=${parkCode}`);
  const alerts = await response.json();
  return alerts || [];
}

export function getParkCodeForCampground(facilityName) {
  const lower = facilityName.toLowerCase();
  for (const [keyword, code] of Object.entries(NPS_CAMPGROUND_MAP)) {
    if (lower.includes(keyword)) return code;
  }
  return null;
}