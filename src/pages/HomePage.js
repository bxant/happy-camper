import { useState } from 'react';
import { fetchHikesFromOverpass } from '../services/hikingApi';
import { parseTrailsFromDescription } from '../utils/descriptionParser';
import { fetchNPSAlerts, getParkCodeForCampground } from '../services/npsApi';
import { generateItinerary } from '../services/googleSheetsService';
import StepReservation from '../components/steps/StepReservation';
import StepTripDetails from '../components/steps/StepTripDetails';
import StepTrails from '../components/steps/StepTrails';
import StepMeals from '../components/steps/StepMeals';
import StepGenerate from '../components/steps/StepGenerate';
import '../components/steps/Steps.css';

function HomePage({ authToken }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCampground, setSelectedCampground] = useState(null);
  const [npsAlerts, setNpsAlerts] = useState([]);
  const [availableHikes, setAvailableHikes] = useState({ parsed: [], radius: [], overpass: [] });
  const [preferredHikes, setPreferredHikes] = useState([]);
  const [hikesPerDay, setHikesPerDay] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('12:00');
  const [departureTime, setDepartureTime] = useState('11:00');
  const [wakeUpTime, setWakeUpTime] = useState('08:00');
  const [bedTime, setBedTime] = useState('22:00');
  const [hikeOnArrivalDay, setHikeOnArrivalDay] = useState(false);
  const [breakfastMeals, setBreakfastMeals] = useState([]);
  const [lunchMeals, setLunchMeals] = useState([]);
  const [dinnerMeals, setDinnerMeals] = useState([]);
  const [status, setStatus] = useState('idle');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null);

  async function handleCampgroundSelect(campground) {
    setSelectedCampground(campground);
    setPreferredHikes([]);

    const parsed = parseTrailsFromDescription(campground.FacilityDescription);

    try {
      const overpass = await fetchHikesFromOverpass(
        campground.FacilityLatitude,
        campground.FacilityLongitude
      );
      setAvailableHikes({ parsed, radius: [], overpass: overpass || [] });

      const parkCode = getParkCodeForCampground(campground.FacilityName);
      if (parkCode) {
        const alerts = await fetchNPSAlerts(parkCode);
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
    if (mealType === 'Breakfast') setBreakfastMeals(prev => [...prev, meal]);
    if (mealType === 'Lunch') setLunchMeals(prev => [...prev, meal]);
    if (mealType === 'Dinner') setDinnerMeals(prev => [...prev, meal]);
  }

  function handleRemoveMeal(mealType, index) {
    if (mealType === 'Breakfast') setBreakfastMeals(prev => prev.filter((_, i) => i !== index));
    if (mealType === 'Lunch') setLunchMeals(prev => prev.filter((_, i) => i !== index));
    if (mealType === 'Dinner') setDinnerMeals(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (authToken === 'guest') {
      handleDownloadJSON();
      return;
    }

    setCurrentStep(5);
    setStatus('building');

    try {
      const result = await generateItinerary({
        accessToken: authToken.access_token,
        campgroundName: selectedCampground.FacilityName,
        startDate,
        endDate,
        arrivalTime,
        wakeUpTime,
        bedTime,
        breakfastPool: breakfastMeals,
        lunchPool: lunchMeals,
        dinnerPool: dinnerMeals,
        preferredHikes,
        hikesPerDay,
        hikeOnArrivalDay,
        allAvailableHikes: mergedHikes,
        onStatusChange: setStatus,
      });

      setSpreadsheetUrl(result.spreadsheetUrl);
    } catch (err) {
      console.error('Error generating itinerary:', err);
      setStatus('error');
    }
  }

  function handleDownloadJSON() {
    const blob = new Blob(
      [JSON.stringify({
        campground: selectedCampground?.FacilityName,
        startDate,
        endDate,
        arrivalTime,
        departureTime,
        wakeUpTime,
        bedTime,
        meals: { breakfastMeals, lunchMeals, dinnerMeals },
        preferredHikes,
        hikesPerDay,
      }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'happy-camper-itinerary.json';
    a.click();
    URL.revokeObjectURL(url);
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
          onContinue={() => handleSubmit()}
          onBack={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 5 && (
        <StepGenerate
          status={status}
          spreadsheetUrl={spreadsheetUrl}
          campgroundName={selectedCampground?.FacilityName}
          onRetry={() => handleSubmit()}
          onDownloadJSON={handleDownloadJSON}
        />
      )}
    </div>
  );
}

export default HomePage;