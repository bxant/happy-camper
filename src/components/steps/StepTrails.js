import { useState } from 'react';
import HikeSelector from '../HikeSelector';

function StepTrails({
  allAvailableHikes,
  preferredHikes,
  startDate,
  endDate,
  hikeOnArrivalDay,
  onAddHike,
  onRemoveHike,
  hikesPerDay,
  onHikesPerDayChange,
  onContinue,
  onBack,
  campLat,
  campLon,
}) {
  const [showTrails, setShowTrails] = useState(false);

  const numberOfNights = startDate && endDate
    ? Math.round((new Date(endDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / (1000 * 60 * 60 * 24))
    : 0;

  const fullDays = Array.from({ length: numberOfNights + 1 }, (_, i) => i)
    .filter(i => {
      if (i === numberOfNights) return false;
      if (i === 0 && !hikeOnArrivalDay) return false;
      return true;
    });

  const hikeCount = preferredHikes.length;

  if (showTrails) {
    return (
      <div className="step-container">
        <button className="step-back-btn" onClick={() => setShowTrails(false)}>
          ← Back to Trail Preferences
        </button>

        <h2 className="step-title">Explore Regional Trails</h2>
        <p className="step-subtitle">
          Select the hikes you want included in your itinerary.
        </p>

        <div className="trails-disclaimer">
          ⚠️ Hike durations are estimated at 2 hours and drive times are approximate.
          Trails are scheduled based on your preferences, not trail length or difficulty.
          We recommend researching each trail before your trip.
        </div>

        <HikeSelector
          allAvailableHikes={allAvailableHikes}
          preferredHikes={preferredHikes}
          onAddHike={onAddHike}
          onRemoveHike={onRemoveHike}
          campLat={campLat}
          campLon={campLon}
        />

        <button
          className="step-continue-btn"
          onClick={() => setShowTrails(false)}
        >
          Done — Back to Preferences
        </button>
      </div>
    );
  }

  return (
    <div className="step-container">
      <h2 className="step-title">Trail Preferences</h2>
      <p className="step-subtitle">
        Choose how many hikes per day and explore trails in the area.
      </p>

      {fullDays.length > 0 && (
        <div className="step-field">
          <label className="step-label">Hikes per day</label>
          <p className="step-hint">
            Choose how many hikes you'd like scheduled per day. Max 3 per day.
          </p>

          <div className="trails-safety-notice">
            🏕️ We cap hikes at 3 per day for your safety. The 3rd hike is scheduled
            as an evening walk after dinner. If you're feeling ambitious, feel free
            to edit your itinerary sheet when it's complete.
          </div>

          <div className="hikes-per-day">
            {fullDays.map((dayIndex) => (
              <div key={dayIndex} className="hikes-per-day-row">
                <span className="hikes-per-day-label">
                  {dayIndex === 0 ? 'Arrival Day' : `Day ${dayIndex + 1}`}
                </span>
                <div className="hikes-per-day-controls">
                  <button
                    className="hike-count-btn"
                    onClick={() => onHikesPerDayChange(
                      dayIndex,
                      Math.max(0, (hikesPerDay[dayIndex] || 1) - 1)
                    )}
                  >
                    −
                  </button>
                  <span className="hike-count-value">
                    {hikesPerDay[dayIndex] || 1}
                  </span>
                  <button
                    className="hike-count-btn"
                    onClick={() => onHikesPerDayChange(
                      dayIndex,
                      Math.min(3, (hikesPerDay[dayIndex] || 1) + 1)
                    )}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className={`explore-trails-btn ${hikeCount > 0 ? 'has-hikes' : ''}`}
        onClick={() => setShowTrails(true)}
      >
        {hikeCount > 0
          ? `Hikes Selected: ${hikeCount} ✓`
          : '🧭 Explore regional trails'}
      </button>

      <p className="step-hint" style={{ textAlign: 'center' }}>
        ⚠️ Hike durations and drive times are estimates only.
        Always research trails before your trip.
      </p>

      <div className="step-nav">
        <button className="step-back-btn" onClick={onBack}>
          ← Back
        </button>
        <button
          className="step-continue-btn"
          onClick={onContinue}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

export default StepTrails;