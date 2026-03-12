export function calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateHikeDuration(distanceMiles, elevationGain = 0) {
  const baseHours = distanceMiles / 2;
  const elevationHours = (elevationGain / 1000) * 0.5;
  return baseHours + elevationHours;
}

export function filterHikesByProximity(hikes, campLat, campLon, radiusMiles = 40) {
  return hikes.filter(hike => {
    if (!hike.FacilityLatitude || !hike.FacilityLongitude) return true;
    const dist = calculateDistanceBetweenPoints(
      campLat, campLon,
      hike.FacilityLatitude, hike.FacilityLongitude
    );
    return dist <= radiusMiles;
  });
}

export function getDriveMinutes(distanceMiles) {
  return Math.round((distanceMiles / 25) * 60);
}