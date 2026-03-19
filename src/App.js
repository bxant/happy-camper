import { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import SplashPage from './pages/SplashPage';
import HomePage from './pages/HomePage';
import './App.css';
import { buildDaySkeleton, assignMealsToDays, assignHikesToDays, buildTimeSlots } from './utils/scheduleBuilder';

const days = buildDaySkeleton({
  startDate: '2026-06-07',
  endDate: '2026-06-10',
  arrivalTime: '14:00',
});

const withMeals = assignMealsToDays(
  days,
  ['Oatmeal', 'Chilaquiles', 'Scrambled Eggs'],
  ['Instant Ramen', 'Sandwiches'],
  ['Ceviche', 'Burgers', 'Pasta']
);

const preferredHikes = [
  { name: 'Mirror Lake Trail', driveMinutes: 10 },
  { name: 'Valley View Trail', driveMinutes: 15 },
  { name: 'Bridalveil Fall', driveMinutes: 20 },
  { name: 'Half Dome', driveMinutes: 25 },
];

const allAvailableHikes = [
  ...preferredHikes,
  { name: 'El Capitan Base', driveMinutes: 18 },
  { name: 'Sentinel Dome', driveMinutes: 30 },
];

const { updatedDays, honorableMentions } = assignHikesToDays(
  withMeals,
  preferredHikes,
  { 0: 1, 1: 2, 2: 1 },
  true,
  allAvailableHikes
);

const withTimeSlots = buildTimeSlots(updatedDays, '08:00', '22:00');

console.log('Full schedule:', JSON.stringify(withTimeSlots, null, 2));
console.log('Honorable mentions:', honorableMentions);

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function App() {
  const [authToken, setAuthToken] = useState(null);

  function handleAuthSuccess(tokenResponse) {
    setAuthToken(tokenResponse === null ? 'guest' : tokenResponse);
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {authToken ? (
        <div className="App">
          <h1>Happy Camper</h1>
          <HomePage authToken={authToken} />
        </div>
      ) : (
        <SplashPage onAuthSuccess={handleAuthSuccess} />
      )}
    </GoogleOAuthProvider>
  );
}

export default App;