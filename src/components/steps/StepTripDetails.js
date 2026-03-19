import { useState, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { searchCampgrounds } from '../../services/recreationApi';
import CampgroundDetail from '../CampgroundDetail';

function StepTripDetails({
  selectedCampground,
  npsAlerts,
  startDate,
  endDate,
  arrivalTime,
  departureTime,
  wakeUpTime,
  bedTime,
  hikeOnArrivalDay,
  onCampgroundSelect,
  onDatesChange,
  onArrivalTimeChange,
  onDepartureTimeChange,
  onWakeUpTimeChange,
  onBedTimeChange,
  onHikeOnArrivalDayChange,
  onContinue,
}) {
  const [campgroundSearch, setCampgroundSearch] = useState(
    selectedCampground ? selectedCampground.FacilityName : ''
  );
  const [campgroundResults, setCampgroundResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);

  // react-day-picker uses a range object { from, to }
  const selected = {
    from: startDate ? new Date(startDate + 'T00:00:00') : undefined,
    to: endDate ? new Date(endDate + 'T00:00:00') : undefined,
  };

  function handleDayClick(range) {
    if (!range) return;
    const from = range.from
      ? range.from.toISOString().split('T')[0]
      : '';
    const to = range.to
      ? range.to.toISOString().split('T')[0]
      : '';
    onDatesChange(from, to);
  }

  async function handleCampgroundSearch(event) {
    const value = event.target.value;
    setCampgroundSearch(value);
    setError(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length > 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await searchCampgrounds(value);
          setCampgroundResults(results);
        } catch (err) {
          setError('Unable to search campgrounds. Please try again.');
          setCampgroundResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 500);
    } else {
      setCampgroundResults([]);
    }
  }

  function handleSelect(campground) {
    setCampgroundSearch(campground.FacilityName);
    setCampgroundResults([]);
    onCampgroundSelect(campground);
  }

  const numberOfNights = startDate && endDate
    ? Math.round((new Date(endDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / (1000 * 60 * 60 * 24))
    : 0;

  const canContinue = selectedCampground && startDate && endDate;

  return (
    <div className="step-container">
      <h2 className="step-title">Trip Details</h2>
      <p className="step-subtitle">Let's set up the basics for your wilderness escape.</p>

      {/* Campground Search */}
      <div className="step-field step-search-wrapper">
        <label className="step-label">Location or Stay Name</label>
        <input
          className="step-input"
          type="text"
          value={campgroundSearch}
          onChange={handleCampgroundSearch}
          placeholder="e.g. Zion National Park"
        />
        {campgroundResults.length > 0 && (
          <ul className="step-results">
            {campgroundResults.map((campground) => (
              <li
                key={campground.FacilityID}
                className="step-result-item"
                onClick={() => handleSelect(campground)}
              >
                {campground.FacilityName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLoading && <p className="step-loading">Searching...</p>}
      {error && <p className="step-error">{error}</p>}

      {/* Date Picker */}
      <div className="step-field">
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={handleDayClick}
          disabled={{ before: new Date() }}
        />
        {numberOfNights > 0 && (
          <p className="step-nights">
            {numberOfNights} night{numberOfNights !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Times */}
      <div className="step-times">
        <div className="step-field">
          <label className="step-label">Arrival Time</label>
          <input
            className="step-input"
            type="time"
            value={arrivalTime}
            onChange={(e) => onArrivalTimeChange(e.target.value)}
          />
        </div>
        <div className="step-field">
          <label className="step-label">Departure Time</label>
          <input
            className="step-input"
            type="time"
            value={departureTime}
            onChange={(e) => onDepartureTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div className="step-times">
        <div className="step-field">
          <label className="step-label">Wake Up Time</label>
          <input
            className="step-input"
            type="time"
            value={wakeUpTime}
            onChange={(e) => onWakeUpTimeChange(e.target.value)}
          />
        </div>
        <div className="step-field">
          <label className="step-label">Bedtime</label>
          <input
            className="step-input"
            type="time"
            value={bedTime}
            onChange={(e) => onBedTimeChange(e.target.value)}
          />
        </div>
      </div>

      {/* Trail Start Preference */}
      <div className="step-field">
        <label className="step-label">Trail Start Preference</label>
        <button
          className={`trail-preference-btn ${hikeOnArrivalDay ? 'active' : ''}`}
          onClick={() => onHikeOnArrivalDayChange(!hikeOnArrivalDay)}
        >
          <div className="trail-preference-content">
            <strong>Hike on arrival day</strong>
            <span>Maximize your time with a sunset trail session.</span>
          </div>
        </button>
      </div>

      <button
        className="step-continue-btn"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Continue Setup →
      </button>

      {selectedCampground && (
        <div className="campground-detail-below">
          <div className="campground-detail-divider" />
          <CampgroundDetail
            campground={selectedCampground}
            npsAlerts={npsAlerts}
          />
        </div>
      )}

    </div>
  );
}

export default StepTripDetails;