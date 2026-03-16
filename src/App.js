import { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import SplashPage from './pages/SplashPage';
import HomePage from './pages/HomePage';
import './App.css';

import { buildDaySkeleton } from './utils/scheduleBuilder';

const test = buildDaySkeleton({
  startDate: '2026-06-07',
  endDate: '2026-06-10',
  arrivalTime: '14:00',
});
console.log('Day skeleton:', test);

// Replace with your actual Google OAuth Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';

function App() {
  const [authToken, setAuthToken] = useState(null);

  function handleAuthSuccess(tokenResponse) {
    setAuthToken(tokenResponse);
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