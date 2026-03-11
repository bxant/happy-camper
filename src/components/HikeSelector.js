import { calculateDistanceBetweenPoints } from '../utils/hikeSelector';

function getDriveTimeLabel(distanceMiles) {
  if (distanceMiles < 1) return 'Walkable from camp';
  const minutes = Math.round((distanceMiles / 25) * 60);
  if (minutes < 2) return '~1 min drive';
  return `~${minutes} min drive`;
}

export default function HikeSelector({
  scheduledHikes,
  honorableMentions,
  favoritedHikes,
  allAvailableHikes,
  onToggleFavorite,
  onRemoveFromSchedule,
  campLat,
  campLon,
}) {
  function getDistanceFromCamp(hike) {
    if (!campLat || !campLon) return null;
    if (!hike.FacilityLatitude || !hike.FacilityLongitude) return null;
    return calculateDistanceBetweenPoints(
      campLat, campLon,
      hike.FacilityLatitude, hike.FacilityLongitude
    );
  }

  function isFavorited(hike) {
    return favoritedHikes.some(f => f.name === hike.name);
  }

  function renderHikeCard(hike, showRemove) {
    const distFromCamp = getDistanceFromCamp(hike);
    const driveLabel = distFromCamp !== null ? getDriveTimeLabel(distFromCamp) : null;
    const favorited = isFavorited(hike);

    return (
      <div key={hike.name} style={{ border: '1px solid #ccc', padding: '8px', marginBottom: '8px', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button
              onClick={() => onToggleFavorite(hike)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', padding: '0', marginRight: '6px' }}
            >
              {favorited ? '❤️' : '🤍'}
            </button>
            <strong>{hike.name}</strong>
            {hike.offroadWarning && (
              <span style={{ marginLeft: '6px', color: '#cc6600', fontSize: '0.85em' }}>
                ⚠️ May require high clearance
              </span>
            )}
            <div style={{ fontSize: '0.85em', color: '#555', marginTop: '4px' }}>
              {hike.distanceMiles ? `${hike.distanceMiles} miles` : 'Distance unknown'}
              {driveLabel && ` · ${driveLabel}`}
            </div>
          </div>
          {showRemove && (
            <button
              onClick={() => onRemoveFromSchedule(hike)}
              style={{ marginLeft: '12px', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3>Your Hikes</h3>
      {scheduledHikes.length === 0 ? (
        <p style={{ color: '#888' }}>No hikes scheduled yet. Select a campground to get recommendations.</p>
      ) : (
        scheduledHikes.map(hike => renderHikeCard(hike, true))
      )}

      {honorableMentions.length > 0 && (
        <>
          <h3 style={{ marginTop: '24px' }}>Honorable Mentions</h3>
          <p style={{ fontSize: '0.85em', color: '#666' }}>
            These hikes didn't make the schedule but are worth exploring on your own.
          </p>
          {honorableMentions.map(hike => renderHikeCard(hike, false))}
        </>
      )}
    </div>
  );
}