import { hasOffroadWarning } from './descriptionParser';

export function estimateHikeDuration(distanceMiles, elevationGain = 0) {
  const baseHours = distanceMiles / 2;
  const elevationHours = (elevationGain / 1000) * 0.5;
  return baseHours + elevationHours;
}

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

export function filterHikesByProximity(hikes, campLat, campLon) {
  return hikes.filter(hike => {
    if (!hike.FacilityLatitude || !hike.FacilityLongitude) return true;
    const dist = calculateDistanceBetweenPoints(
      campLat, campLon,
      hike.FacilityLatitude, hike.FacilityLongitude
    );
    return dist <= 40;
  });
}

const COMFORT_RANGES = {
  'Beginner (0-3 miles)':       { min: 0,  max: 3  },
  'Intermediate (3-6 miles)':   { min: 3,  max: 6  },
  'Advanced (6-10 miles)':      { min: 6,  max: 10 },
  'Absolute Pro (10+ miles)':   { min: 10, max: 99 },
};

function buildDayHikes(pool, targetMin, targetMax) {
  // Sort descending by distance so longest goes first
  const sorted = [...pool].sort((a, b) => (b.distanceMiles || 0) - (a.distanceMiles || 0));
  const dayHikes = [];
  let totalMiles = 0;

  for (const hike of sorted) {
    const miles = hike.distanceMiles || 0;
    if (totalMiles >= targetMin) break;
    if (totalMiles + miles > targetMax * 1.2) continue; // allow 20% overage max
    dayHikes.push(hike);
    totalMiles += miles;
    if (totalMiles >= targetMin) break;
  }

  return dayHikes;
}

export function selectHikesForTrip({
  parsedHikes,
  radiusHikes,
  favoritedHikes,
  hikingLevel,
  numberOfHikeSlots,
  campLat,
  campLon,
}) {
  const range = COMFORT_RANGES[hikingLevel] || { min: 3, max: 6 };

  // Merge and deduplicate by name
  const allHikes = [...parsedHikes];
  for (const rh of radiusHikes) {
    if (!allHikes.some(h => h.name === rh.FacilityName)) {
      allHikes.push({
        name: rh.FacilityName,
        distanceMiles: null,
        source: 'radius_search',
        FacilityLatitude: rh.FacilityLatitude,
        FacilityLongitude: rh.FacilityLongitude,
        offroadWarning: hasOffroadWarning(rh.FacilityDescription, rh.FacilityDirections),
        isFavorited: favoritedHikes.some(f => f.name === rh.FacilityName),
      });
    }
  }

  // Tag parsed hikes with offroad and favorite flags
  const taggedHikes = allHikes.map(h => ({
    ...h,
    offroadWarning: h.offroadWarning ?? false,
    isFavorited: favoritedHikes.some(f => f.name === h.name),
  }));

  // Sort: favorited first, then non-offroad, then offroad
  const sorted = [...taggedHikes].sort((a, b) => {
    if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1;
    if (a.offroadWarning !== b.offroadWarning) return a.offroadWarning ? 1 : -1;
    return 0;
  });

  const scheduledHikes = [];
  const usedNames = new Set();

  for (let slot = 0; slot < numberOfHikeSlots; slot++) {
    const available = sorted.filter(h => !usedNames.has(h.name));
    const dayHikes = buildDayHikes(available, range.min, range.max);
    for (const h of dayHikes) {
      scheduledHikes.push(h);
      usedNames.add(h.name);
    }
  }

  const honorableMentions = sorted.filter(h => !usedNames.has(h.name));

  return { scheduledHikes, honorableMentions };
}