import { useState } from 'react';
import { searchCampgrounds } from '../services/recreationApi';

function HomePage() {
  const [sheetLink, setSheetLink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [hikingLevel, setHikingLevel] = useState('beginner');
  const [campgroundSearch, setCampgroundSearch] = useState('');
  const [campgroundResults, setCampgroundResults] = useState([]);
  const [selectedCampground, setSelectedCampground] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [arrivalTime, setArrivalTime] = useState('12:00');
  const [wakeUpTime, setWakeUpTime] = useState('08:00');
  const [bedTime, setBedTime] = useState('22:00');
  const [morningHikeDays, setMorningHikeDays] = useState(0);
  const [hikeOnArrivalDay, setHikeOnArrivalDay] = useState(false);
  const [wantsMorningHikes, setWantsMorningHikes] = useState(false);
  
  async function handleCampgroundSearch(event) {
    setCampgroundSearch(event.target.value);
    setError(null);
    if (event.target.value.length > 2) {
      setIsLoading(true);
      try {
        const results = await searchCampgrounds(event.target.value);
        setCampgroundResults(results);
      } catch (err) {
        setError('Unable to search campgrounds. Please try again.');
        setCampgroundResults([]);
      } finally {
        setIsLoading(false);
      }
    }
  }

  function handleArrivalTimeChange(event) {
  setArrivalTime(event.target.value);
  }

  function handleWakeUpTimeChange(event) {
    setWakeUpTime(event.target.value);
  }

  function handleBedTimeChange(event) {
    setBedTime(event.target.value);
  }

  function handleMorningHikeDaysChange(event) {
    const value = Math.min(Number(event.target.value), numberOfDays - 2);
    setMorningHikeDays(value);
  }

  function handleSheetLinkChange(event) {
    setSheetLink(event.target.value);
  }

  function handleStartDateChange(event) {
    setStartDate(event.target.value);
  }

  function handleNumberOfDaysChange(event) {
    setNumberOfDays(event.target.value);
  }

  function handleHikingLevelChange(event) {
  setHikingLevel(event.target.value);
  }

  function handleSubmit() {
  console.log('Sheet Link:', sheetLink);
  console.log('Start Date:', startDate);
  console.log('Number of Days:', numberOfDays);
  console.log('Hiking Level:', hikingLevel);
  }

  return (
    <div className="home-page">
      <h2>Plan Your Trip</h2>

      <label>Google Sheet Link</label>
      <input
        type="text"
        value={sheetLink}
        onChange={handleSheetLinkChange}
        placeholder="Paste your Google Sheet link here"
      />

      <label>Trip Start Date</label>
      <input
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
      />

      <label>Number of Days</label>
      <select value={numberOfDays} onChange={handleNumberOfDaysChange}>
        <option value={1}>1 day</option>
        <option value={2}>2 days</option>
        <option value={3}>3 days</option>
        <option value={4}>4 days</option>
        <option value={5}>5 days</option>
        <option value={6}>6 days</option>
        <option value={7}>7 days</option>
      </select>

      
    <label>Hiking Comfort Level</label>
    <select value={hikingLevel} onChange={handleHikingLevelChange}>
        <option value="beginner">Beginner (0-3 miles)</option>
        <option value="intermediate">Intermediate (3-6 miles)</option>
        <option value="advanced">Advanced (6-10 miles)</option>
        <option value="pro">Absolute Pro (10+ miles)</option>
    </select>

    <label>Expected Arrival Time (Day 1)</label>
    <input
      type="time"
      value={arrivalTime}
      onChange={handleArrivalTimeChange}
    />

    <label>Expected Wake Up Time</label>
    <input
      type="time"
      value={wakeUpTime}
      onChange={handleWakeUpTimeChange}
    />

    <label>Expected Bedtime</label>
    <input
      type="time"
      value={bedTime}
      onChange={handleBedTimeChange}
    />

    <label>
      <input
        type="checkbox"
        checked={wantsMorningHikes}
        onChange={(e) => setWantsMorningHikes(e.target.checked)}
      />
      I would like morning hikes recommended
    </label>

    {wantsMorningHikes && (
      <>
        <label>Number of Morning Hike Days</label>
        <small>Morning hikes will not be scheduled on arrival or departure day.</small>
        <input
          type="number"
          min={0}
          max={numberOfDays - 2}
          value={morningHikeDays}
          onChange={handleMorningHikeDaysChange}
        />
      </>
    )}

    <label>
      <input
        type="checkbox"
        checked={hikeOnArrivalDay}
        onChange={(e) => setHikeOnArrivalDay(e.target.checked)}
      />
      I want to hike on my arrival day
    </label>

    <label>Search Campground</label>
    <input
    type="text"
    value={campgroundSearch}
    onChange={handleCampgroundSearch}
    placeholder="Search for a campground"
    />
    {campgroundResults.length > 0 && (
    <ul>
        {campgroundResults.map((campground) => (
        <li
            key={campground.FacilityID}
            onClick={() => setSelectedCampground(campground)}
        >
            {campground.FacilityName}
        </li>
        ))}
    </ul>
    )}
    {selectedCampground && (
    <p>Selected: {selectedCampground.FacilityName}</p>
    )}

    {isLoading && <p>Searching...</p>}
    {error && <p style={{color: 'red'}}>{error}</p>}

        <button onClick={handleSubmit}>Plan My Trip</button>

    </div>
  );
}

export default HomePage;