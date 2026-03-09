const BASE_URL = 'http://localhost:3001/api';

async function searchCampgrounds(query) {
  const response = await fetch(
    `${BASE_URL}/campgrounds?query=${query}`
  );
  const data = await response.json();
  return data;
}

export { searchCampgrounds };