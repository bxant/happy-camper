const BASE_URL = 'http://localhost:3001/api';

async function fetchHikesNearCampground(lat, lon) {
  const radiusInMiles = 40;
  const response = await fetch(
    `${BASE_URL}/hikes?lat=${lat}&lon=${lon}&radius=${radiusInMiles}`
  );
  const data = await response.json();
  return data;
}

export { fetchHikesNearCampground };