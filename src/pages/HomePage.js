import { useState, useRef } from 'react';
import { fetchHikesFromOverpass } from '../services/hikingApi';
import { parseTrailsFromDescription } from '../utils/descriptionParser';
import { fetchNPSAlerts, getParkCodeForCampground } from '../services/npsApi';
import StepReservation from '../components/steps/StepReservation';
import StepTripDetails from '../components/steps/StepTripDetails';
import StepTrails from '../components/steps/StepTrails';
import StepMeals from '../components/steps/StepMeals';
import StepGenerate from '../components/steps/StepGenerate';
import '../components/steps/Steps.css';

function HomePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
  const [currentStep, setCurrentStep] = useState(1);
  const [departureTime, setDepartureTime] = useState('11:00');
  const [hikesPerDay, setHikesPerDay] = useState({});
  const [status, setStatus] = useState('idle');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null);

  const searchTimeoutRef = useRef(null);

  // Derived from date range
  const numberOfDays = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  function handleStartDateChange(event) {
    const value = event.target.value;
    setStartDate(value);
    // Clear end date if it's now before the new start date
    if (endDate && value >= endDate) setEndDate('');
  }

  function handleEndDateChange(event) {
    setEndDate(event.target.value);
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

  function handleArrivalTimeChange(event) { setArrivalTime(event.target.value); }
  function handleWakeUpTimeChange(event) { setWakeUpTime(event.target.value); }
  function handleBedTimeChange(event) { setBedTime(event.target.value); }

  function handleMorningHikeDaysChange(event) {
    const value = Math.min(Number(event.target.value), numberOfDays - 2);
    setMorningHikeDays(value);
  }

  function handleHikingLevelChange(event) { setHikingLevel(event.target.value); }

  function handleSubmit() {
    const errors = [];

    if (!startDate) errors.push('Please select a trip start date.');
    if (!endDate) errors.push('Please select a trip end date.');
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
    console.log('End Date:', endDate);
    console.log('Number of Days:', numberOfDays);
    console.log('Hiking Level:', hikingLevel);
    console.log('Campground:', selectedCampground.FacilityName);
    console.log('Breakfast:', breakfastMeals);
    console.log('Lunch:', lunchMeals);
    console.log('Dinner:', dinnerMeals);
  }

  const mergedHikes = (() => {
    const parsed = availableHikes.parsed || [];
    const overpass = availableHikes.overpass || [];
    const parsedNames = new Set(parsed.map(h => h.name?.toLowerCase()));
    const deduped = overpass.filter(h => !parsedNames.has(h.name?.toLowerCase()));
    return [...parsed, ...deduped];
    })();

  return (
  <div className="home-page">
    {currentStep === 1 && (
      <StepReservation
        onConfirm={(hasReservation) => {
          if (hasReservation) {
            setCurrentStep(2);
          } else {
            window.open('https://www.recreation.gov', '_blank');
          }
        }}
      />
    )}

    {currentStep === 2 && (
      <StepTripDetails
        selectedCampground={selectedCampground}
        npsAlerts={npsAlerts}
        startDate={startDate}
        endDate={endDate}
        arrivalTime={arrivalTime}
        departureTime={departureTime}
        wakeUpTime={wakeUpTime}
        bedTime={bedTime}
        hikeOnArrivalDay={hikeOnArrivalDay}
        onCampgroundSelect={handleCampgroundSelect}
        onDatesChange={(from, to) => {
          setStartDate(from);
          setEndDate(to);
        }}
        onArrivalTimeChange={setArrivalTime}
        onDepartureTimeChange={setDepartureTime}
        onWakeUpTimeChange={setWakeUpTime}
        onBedTimeChange={setBedTime}
        onHikeOnArrivalDayChange={setHikeOnArrivalDay}
        onContinue={() => setCurrentStep(3)}
      />
    )}

    {currentStep === 3 && (
      <StepTrails
        allAvailableHikes={mergedHikes}
        preferredHikes={preferredHikes}
        startDate={startDate}
        endDate={endDate}
        hikeOnArrivalDay={hikeOnArrivalDay}
        onAddHike={handleAddHike}
        onRemoveHike={handleRemoveHike}
        hikesPerDay={hikesPerDay}
        onHikesPerDayChange={(dayIndex, count) =>
          setHikesPerDay(prev => ({ ...prev, [dayIndex]: count }))
        }
        campLat={selectedCampground?.FacilityLatitude}
        campLon={selectedCampground?.FacilityLongitude}
        onContinue={() => setCurrentStep(4)}
        onBack={() => setCurrentStep(2)}
      />
    )}

    {currentStep === 4 && (
      <StepMeals
        breakfastMeals={breakfastMeals}
        lunchMeals={lunchMeals}
        dinnerMeals={dinnerMeals}
        onAddMeal={handleAddMeal}
        onRemoveMeal={handleRemoveMeal}
        onContinue={() => setCurrentStep(5)}
        onBack={() => setCurrentStep(3)}
      />
    )}

    {currentStep === 5 && (
      <StepGenerate
        status={status}
        spreadsheetUrl={spreadsheetUrl}
        campgroundName={selectedCampground?.FacilityName}
        onRetry={() => handleSubmit()}
        onDownloadJSON={() => {
          const blob = new Blob(
            [JSON.stringify({ schedule: mergedHikes, campground: selectedCampground }, null, 2)],
            { type: 'application/json' }
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'happy-camper-itinerary.json';
          a.click();
          URL.revokeObjectURL(url);
        }}
        schedule={mergedHikes}
      />
    )}
  </div>
);

}

export default HomePage;