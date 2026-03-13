import { useState } from 'react';
import { searchCampgrounds } from '../services/recreationApi';
import MealInput from '../components/MealInput';
import { fetchHikesFromOverpass } from '../services/hikingApi';
import { useRef } from 'react';
import { parseTrailsFromDescription } from '../utils/descriptionParser';
import HikeSelector from '../components/HikeSelector';
import CampgroundDetail from '../components/CampgroundDetail';
import { fetchNPSAlerts, getParkCodeForCampground } from '../services/npsApi';

function HomePage() {
  //const [sheetLink, setSheetLink] = useState('');
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
  const [breakfastMeals, setBreakfastMeals] = useState([]);
  const [lunchMeals, setLunchMeals] = useState([]);
  const [dinnerMeals, setDinnerMeals] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [preferredHikes, setPreferredHikes] = useState([]);  
  const [availableHikes, setAvailableHikes] = useState([]);
  const [npsAlerts, setNpsAlerts] = useState([]);

  // Loading type ref
  const searchTimeoutRef = useRef(null);

    
  async function handleCampgroundSearch(event) {
    const value = event.target.value;
    setCampgroundSearch(value);
    setError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

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

  async function handleCampgroundSelect(campground) {
    console.log('campground object:', campground);
    setSelectedCampground(campground);
    setCampgroundSearch(campground.FacilityName);
    setCampgroundResults([]);
    setPreferredHikes([]);

    const parsed = parseTrailsFromDescription(campground.FacilityDescription);
    console.log("Parsed trails: ", parsed);

    try {
      const overpass = await fetchHikesFromOverpass(
        campground.FacilityLatitude,
        campground.FacilityLongitude
      );

      console.log("overpass hikes: ", overpass);
      console.log("overpass length: ", overpass?.length);

      setAvailableHikes({
        parsed,
        radius: [],
        overpass: overpass || [],
      });

      const parkCode = getParkCodeForCampground(campground.FacilityName);
      if (parkCode) {
        const alerts = await fetchNPSAlerts(parkCode);
        console.log("NPS alerts: ", alerts);
        setNpsAlerts(alerts);
      } else {
        setNpsAlerts([]);
      }

    } catch (err) {
      console.error('Error fetching hikes:', err);
      setAvailableHikes({ parsed, radius: [], overpass: [] });
      setNpsAlerts([]);
    }
  }

  function handleAddHike(hike) {
    const normalized = { ...hike, name: hike.name || hike.FacilityName };
    setPreferredHikes(prev => {
      if (prev.some(p => p.name === normalized.name)) return prev;
      return [...prev, normalized];
    });
  }

  function handleRemoveHike(hike) {
    setPreferredHikes(prev => prev.filter(p => p.name !== hike.name));
  }

  function handleAddMeal(mealType, meal) {
    if (mealType === 'Breakfast') setBreakfastMeals([...breakfastMeals, meal]);
    if (mealType === 'Lunch') setLunchMeals([...lunchMeals, meal]);
    if (mealType === 'Dinner') setDinnerMeals([...dinnerMeals, meal]);
  }

  function handleRemoveMeal(mealType, index) {
    if (mealType === 'Breakfast') setBreakfastMeals(breakfastMeals.filter((_, i) => i !== index));
    if (mealType === 'Lunch') setLunchMeals(lunchMeals.filter((_, i) => i !== index));
    if (mealType === 'Dinner') setDinnerMeals(dinnerMeals.filter((_, i) => i !== index));
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

  // function handleSheetLinkChange(event) {
  //   setSheetLink(event.target.value);
  // }

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
    const errors = [];

    if (!startDate) errors.push('Please select a trip start date.');
    if (!selectedCampground) errors.push('Please search and select a campground.');
    if (breakfastMeals.length === 0) errors.push('Please add at least one breakfast meal.');
    if (lunchMeals.length === 0) errors.push('Please add at least one lunch meal.');
    if (dinnerMeals.length === 0) errors.push('Please add at least one dinner meal.');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    console.log('Start Date:', startDate);
    console.log('Number of Days:', numberOfDays);
    console.log('Hiking Level:', hikingLevel);
    console.log('Campground:', selectedCampground.FacilityName);
    console.log('Breakfast:', breakfastMeals);
    console.log('Lunch:', lunchMeals);
    console.log('Dinner:', dinnerMeals);
  }
  // function handleSubmit() {
  // // console.log('Sheet Link:', sheetLink);
  // console.log('Start Date:', startDate);
  // console.log('Number of Days:', numberOfDays);
  // console.log('Hiking Level:', hikingLevel);
  // }

  return (
    <div className="home-page">
      {/* <h2>Plan Your Trip</h2>

      <label>Google Sheet Link</label>
      <input
        type="text"
        value={sheetLink}
        onChange={handleSheetLinkChange}
        placeholder="Paste your Google Sheet link here"
      /> */}

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
            onClick={() => handleCampgroundSelect(campground)}
        >
            {campground.FacilityName}
        </li>
        ))}
    </ul>
    )}
    {selectedCampground && (
      <CampgroundDetail
        campground={selectedCampground}
        npsAlerts={npsAlerts}
      />
    )}

    {isLoading && <p>Searching...</p>}
    {error && <p style={{color: 'red'}}>{error}</p>}

    <h3>Meals</h3>
      <MealInput
        mealType="Breakfast"
        meals={breakfastMeals}
        onAddMeal={handleAddMeal}
        onRemoveMeal={handleRemoveMeal}
      />
      <MealInput
        mealType="Lunch"
        meals={lunchMeals}
        onAddMeal={handleAddMeal}
        onRemoveMeal={handleRemoveMeal}
      />
      <MealInput
        mealType="Dinner"
        meals={dinnerMeals}
        onAddMeal={handleAddMeal}
        onRemoveMeal={handleRemoveMeal}
      />

    {validationErrors.length > 0 && (
    <div style={{color: 'red'}}>
      {validationErrors.map((err, index) => (
        <p key={index}>{err}</p>
      ))}
    </div>
  )}

    {selectedCampground && (
    <HikeSelector
      allAvailableHikes={[
  ...(availableHikes.parsed || []),
  ...(availableHikes.radius || []),
  ...(availableHikes.overpass || []),
]}
      preferredHikes={preferredHikes}
      onAddHike={handleAddHike}
      onRemoveHike={handleRemoveHike}
      campLat={selectedCampground.FacilityLatitude}
      campLon={selectedCampground.FacilityLongitude}
    />
  )}

    <button onClick={handleSubmit}>Plan My Trip</button>

    </div>
  );
}

export default HomePage;