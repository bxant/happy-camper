import { hasOffroadWarning } from './descriptionParser';
import { calculateDistanceBetweenPoints, getDriveMinutes } from './hikeUtils';

// Comfort ranges kept here for sheet scheduler use later
// const COMFORT_RANGES = {
//   'Beginner (0-3 miles)':     { min: 0,  max: 3  },
//   'Intermediate (3-6 miles)': { min: 3,  max: 6  },
//   'Advanced (6-10 miles)':    { min: 6,  max: 10 },
//   'Absolute Pro (10+ miles)': { min: 10, max: 99 },
// };

export function selectHikesForTrip({
  parsedHikes,
  radiusHikes,
  preferredHikes,
  campLat,
  campLon,
}) {
  // Merge parsed and radius hikes, deduplicate by name
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
      });
    }
  }

  // Attach drive minutes to each hike
  const hikesWithDrive = allHikes.map(h => {
    const distFromCamp =
      campLat && campLon && h.FacilityLatitude && h.FacilityLongitude
        ? calculateDistanceBetweenPoints(campLat, campLon, h.FacilityLatitude, h.FacilityLongitude)
        : null;
    const driveMinutes = distFromCamp !== null ? getDriveMinutes(distFromCamp) : null;
    return { ...h, distFromCamp, driveMinutes };
  });

  // Preferred hikes = user selected, these go into the schedule
  const scheduled = hikesWithDrive.filter(h =>
    preferredHikes.some(p => p.name === h.name)
  );

  // Honorable mentions cutoff = furthest preferred drive time + 10 min, default 30
  const preferredDriveTimes = scheduled
    .map(h => h.driveMinutes)
    .filter(m => m !== null);

  const maxPreferredDrive = preferredDriveTimes.length > 0
    ? Math.max(...preferredDriveTimes)
    : 30;

  const cutoff = maxPreferredDrive + 10;

  const honorableMentions = hikesWithDrive.filter(h =>
    !preferredHikes.some(p => p.name === h.name) &&
    (h.driveMinutes === null || h.driveMinutes <= cutoff)
  );

  return { scheduledHikes: scheduled, honorableMentions };
}