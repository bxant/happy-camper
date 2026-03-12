const BASE_URL = 'http://localhost:3001/api/nps';

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