import { useState } from 'react';
import { calculateDistanceBetweenPoints } from '../utils/hikeUtils';

function getDriveMinutes(distanceMiles) {
  return Math.round((distanceMiles / 25) * 60);
}

function getDriveLabel(distanceMiles) {
  if (distanceMiles < 1) return 'Walkable from camp';
  const minutes = getDriveMinutes(distanceMiles);
  if (minutes < 2) return '~1 min drive';
  return `~${minutes} min drive`;
}

export default function HikeSelector({
  allAvailableHikes,
  preferredHikes,
  onAddHike,
  onRemoveHike,
  campLat,
  campLon,
}) {
  const [maxDriveMinutes, setMaxDriveMinutes] = useState(60);

  function getDistanceFromCamp(hike) {
    if (!campLat || !campLon) return null;
    if (!hike.FacilityLatitude || !hike.FacilityLongitude) return null;
    return calculateDistanceBetweenPoints(
      campLat, campLon,
      hike.FacilityLatitude, hike.FacilityLongitude
    );
  }

  function isPreferred(hike) {
    return preferredHikes.some(p => p.name === (hike.name || hike.FacilityName));
  }

  // Normalize, attach distance, filter out already preferred
  const hikesWithDistance = allAvailableHikes
    .map(hike => {
      const name = hike.name || hike.FacilityName;
      const distFromCamp = getDistanceFromCamp(hike);
      const driveMinutes = distFromCamp !== null ? getDriveMinutes(distFromCamp) : null;
      return { ...hike, name, distFromCamp, driveMinutes };
    })
    .filter(hike => !isPreferred(hike));

  // Filter by slider, keep unknowns
  const filtered = hikesWithDistance.filter(hike =>
    hike.driveMinutes === null || hike.driveMinutes <= maxDriveMinutes
  );

  // Sort closest first, unknowns last
  const sorted = [...filtered].sort((a, b) => {
    if (a.driveMinutes === null && b.driveMinutes === null) return 0;
    if (a.driveMinutes === null) return 1;
    if (b.driveMinutes === null) return -1;
    return a.driveMinutes - b.driveMinutes;
  });

  return (
    <div style={{ marginTop: '24px' }}>

      {/* Hike Preferences — tag style like meals */}
      <h3>Hike Preferences</h3>
      {preferredHikes.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.9em' }}>
          No hikes selected yet. Click a hike below to add it.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {preferredHikes.map(hike => (
            <span
              key={hike.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#e8f4e8',
                border: '1px solid #a8d5a8',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.9em',
              }}
            >
              {hike.name}
              <button
                onClick={() => onRemoveHike(hike)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  padding: '0',
                  lineHeight: 1,
                  color: '#555',
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Nearby Hikes pool */}
      <h3>Nearby Hikes</h3>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em' }}>
          Max drive time from camp: <strong>{maxDriveMinutes} min</strong>
        </label>
        <input
          type="range"
          min={5}
          max={120}
          step={5}
          value={maxDriveMinutes}
          onChange={e => setMaxDriveMinutes(Number(e.target.value))}
          style={{ width: '100%', maxWidth: '300px' }}
        />
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: '#888' }}>No hikes found within {maxDriveMinutes} minutes of camp.</p>
      ) : (
        sorted.map((hike, index) => (
          <div
            key={`${hike.source}-${hike.name}-${index}`}
            onClick={() => onAddHike(hike)}
            style={{
              border: '1px solid #ccc',
              padding: '10px 12px',
              marginBottom: '8px',
              borderRadius: '6px',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{hike.name}</strong>
                {hike.offroadWarning && (
                  <span style={{ marginLeft: '8px', color: '#cc6600', fontSize: '0.8em' }}>
                    ⚠️ May require high clearance
                  </span>
                )}
                <div style={{ fontSize: '0.85em', color: '#555', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>
                    <strong>Distance from campsite:</strong>{' '}
                    {hike.distFromCamp !== null ? getDriveLabel(hike.distFromCamp) : 'Unknown'}
                  </span>
                  <span>
                    <strong>Hike distance:</strong>{' '}
                    {hike.distanceMiles ? `${hike.distanceMiles} miles` : 'Unknown'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '1.2em', color: '#aaa', paddingLeft: '12px' }}>+</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}