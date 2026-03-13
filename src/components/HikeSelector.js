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

function HikeCard({ hike, actionButton, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #ccc',
        padding: '10px 12px',
        marginBottom: '8px',
        borderRadius: '6px',
        backgroundColor: '#fff',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <strong>{hike.name}</strong>
            {hike.offroadWarning && (
              <span style={{ color: '#cc6600', fontSize: '0.8em' }}>⚠️ High clearance may be needed</span>
            )}
            {hike.needsVerify && !hike.offroadWarning && (
              <span style={{ color: '#999', fontSize: '0.8em' }}>⚠️ Verify before visiting</span>
            )}
          </div>
          <div style={{ fontSize: '0.85em', color: '#555', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span>
              <strong>Distance from campsite:</strong>{' '}
              {hike.distFromCamp !== null ? getDriveLabel(hike.distFromCamp) : 'Unknown'}
            </span>
            {hike.distanceMiles && (
              <span>
                <strong>Hike distance:</strong> {hike.distanceMiles} miles
              </span>
            )}
          </div>
        </div>
        <div
          style={{ paddingLeft: '12px', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {actionButton}
        </div>
      </div>
    </div>
  );
}

function AddButton({ onAdd }) {
  return (
    <button
      onClick={onAdd}
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
  );
}

function RemoveButton({ onRemove }) {
  return (
    <button
      onClick={onRemove}
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
  const [maxDriveMinutes, setMaxDriveMinutes] = useState(15);
  const [activeTab, setActiveTab] = useState('trails');

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

  // Attach distance, normalize name, exclude already-preferred
  const hikesWithDistance = allAvailableHikes
    .map(hike => {
      const name = hike.name || hike.FacilityName;
      const distFromCamp = getDistanceFromCamp(hike);
      const driveMinutes = distFromCamp !== null ? getDriveMinutes(distFromCamp) : null;
      return { ...hike, name, distFromCamp, driveMinutes };
    })
    .filter(hike => !isPreferred(hike));

  // Drive time filter
  const withinRange = hikesWithDistance.filter(hike =>
    hike.driveMinutes === null || hike.driveMinutes <= maxDriveMinutes
  );

  // Split into trails vs all paths
  // facility_description hikes are always trusted — they came from the campground's own listing
  // "trails" = description source OR (no needsVerify and no offroadWarning)
  // "allPaths" = everything else (roads, OHV, flagged names)
  const trails = withinRange.filter(hike =>
    hike.source === 'facility_description' || (!hike.needsVerify && !hike.offroadWarning)
  );
  const allPaths = withinRange.filter(hike =>
    hike.source !== 'facility_description' && (hike.needsVerify || hike.offroadWarning)
  );

  function sortByDistance(list) {
    return [...list].sort((a, b) => {
      // Parsed description hikes always float to the top
      const aDesc = a.source === 'facility_description' ? 0 : 1;
      const bDesc = b.source === 'facility_description' ? 0 : 1;
      if (aDesc !== bDesc) return aDesc - bDesc;

      if (a.driveMinutes === null && b.driveMinutes === null) return 0;
      if (a.driveMinutes === null) return 1;
      if (b.driveMinutes === null) return -1;
      return a.driveMinutes - b.driveMinutes;
    });
  }

  const sortedTrails = sortByDistance(trails);
  const sortedAllPaths = sortByDistance(allPaths);
  const activeList = activeTab === 'trails' ? sortedTrails : sortedAllPaths;

  const preferredWithDistance = preferredHikes.map(hike => {
    const distFromCamp = getDistanceFromCamp(hike);
    const driveMinutes = distFromCamp !== null ? getDriveMinutes(distFromCamp) : null;
    return { ...hike, distFromCamp, driveMinutes };
  });

  const tabStyle = (tab) => ({
    padding: '6px 16px',
    border: '1px solid #ccc',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.85em',
    fontWeight: activeTab === tab ? 'bold' : 'normal',
    backgroundColor: activeTab === tab ? '#2d6a2d' : '#f5f5f5',
    color: activeTab === tab ? '#fff' : '#333',
  });

  return (
    <div style={{ marginTop: '24px' }}>
      <h3>Hike Preferences</h3>
      {preferredWithDistance.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.9em' }}>
          No hikes selected yet. Click a hike below to add it.
        </p>
      ) : (
        preferredWithDistance.map(hike => (
          <HikeCard
            key={hike.name}
            hike={hike}
            actionButton={<RemoveButton onRemove={() => onRemoveHike(hike)} />}
          />
        ))
      )}

      <h3 style={{ marginTop: '24px' }}>Nearby Hikes</h3>

      {/* Drive time slider */}
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

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button style={tabStyle('trails')} onClick={() => setActiveTab('trails')}>
          🥾 Hiking Trails {sortedTrails.length > 0 && `(${sortedTrails.length})`}
        </button>
        <button style={tabStyle('allPaths')} onClick={() => setActiveTab('allPaths')}>
          🛤️ All Paths {sortedAllPaths.length > 0 && `(${sortedAllPaths.length})`}
        </button>
      </div>

      {activeTab === 'allPaths' && (
        <p style={{ fontSize: '0.8em', color: '#888', marginBottom: '12px' }}>
          These paths may include fire roads, OHV routes, or service roads. Verify before visiting.
        </p>
      )}

      {activeList.length === 0 ? (
        <p style={{ color: '#888' }}>
          {activeTab === 'trails'
            ? `No hiking trails found within ${maxDriveMinutes} minutes of camp.`
            : `No other paths found within ${maxDriveMinutes} minutes of camp.`}
        </p>
      ) : (
        activeList.map((hike, index) => (
          <HikeCard
            key={`${hike.source}-${hike.name}-${index}`}
            hike={hike}
            onClick={() => onAddHike(hike)}
            actionButton={<AddButton onAdd={() => onAddHike(hike)} />}
          />
        ))
      )}
    </div>
  );
}