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

function HikeCard({ hike, actionButton }) {
  const nameElement = hike.allTrailsUrl ? (
    <a
      href={hike.allTrailsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{ color: '#2d6a2d', fontWeight: 'bold', textDecoration: 'underline' }}
    >
      {hike.name}
    </a>
  ) : (
    <strong>{hike.name}</strong>
  );

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '10px 12px',
      marginBottom: '8px',
      borderRadius: '6px',
      backgroundColor: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {nameElement}
            {hike.allTrailsUrl && (
              <span style={{ fontSize: '0.75em', color: '#888' }}>(AllTrails ↗)</span>
            )}
            {hike.offroadWarning && (
              <span style={{ color: '#cc6600', fontSize: '0.8em' }}>⚠️ May require high clearance</span>
            )}
          </div>
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
        <div style={{ paddingLeft: '12px', flexShrink: 0 }}>
          {actionButton}
        </div>
      </div>
    </div>
  );
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

  const hikesWithDistance = allAvailableHikes
    .map(hike => {
      const name = hike.name || hike.FacilityName;
      const distFromCamp = getDistanceFromCamp(hike);
      const driveMinutes = distFromCamp !== null ? getDriveMinutes(distFromCamp) : null;
      return { ...hike, name, distFromCamp, driveMinutes };
    })
    .filter(hike => !isPreferred(hike));

  const filtered = hikesWithDistance.filter(hike =>
    hike.driveMinutes === null || hike.driveMinutes <= maxDriveMinutes
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a.driveMinutes === null && b.driveMinutes === null) return 0;
    if (a.driveMinutes === null) return 1;
    if (b.driveMinutes === null) return -1;
    return a.driveMinutes - b.driveMinutes;
  });

  // Attach distance info to preferred hikes for the full card display
  const preferredWithDistance = preferredHikes.map(hike => {
    const distFromCamp = getDistanceFromCamp(hike);
    const driveMinutes = distFromCamp !== null ? getDriveMinutes(distFromCamp) : null;
    return { ...hike, distFromCamp, driveMinutes };
  });

  return (
    <div style={{ marginTop: '24px' }}>

      <h3>Hike Preferences</h3>
      {preferredWithDistance.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.9em' }}>
          No hikes selected yet. Click + on a hike below to add it.
        </p>
      ) : (
        preferredWithDistance.map(hike => (
          <HikeCard
            key={hike.name}
            hike={hike}
            actionButton={
              <button
                onClick={() => onRemoveHike(hike)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1em',
                  color: '#555',
                  padding: '0',
                }}
              >
                ✕
              </button>
            }
          />
        ))
      )}

      <h3 style={{ marginTop: '24px' }}>Nearby Hikes</h3>
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
          <HikeCard
            key={`${hike.source}-${hike.name}-${index}`}
            hike={hike}
            actionButton={
              <button
                onClick={() => onAddHike(hike)}
                style={{
                  background: 'none',
                  border: '1px solid #aaa',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2em',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#333',
                  padding: '0',
                }}
              >
                +
              </button>
            }
          />
        ))
      )}
    </div>
  );
}