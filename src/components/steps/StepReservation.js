import { useState } from 'react';

function StepReservation({ onConfirm }) {
  const [showNoView, setShowNoView] = useState(false);

  if (showNoView) {
    return (
      <div className="step-container reservation-step">
        <div className="reservation-emblem">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" stroke="#2d6a2d" strokeWidth="1.5" opacity="0.2" />
            <circle cx="40" cy="40" r="28" fill="#e8f0e8" />
            <rect x="26" y="24" width="28" height="32" rx="3" stroke="#2d6a2d" strokeWidth="2" fill="white" />
            <line x1="26" y1="32" x2="54" y2="32" stroke="#2d6a2d" strokeWidth="2" />
            <line x1="32" y1="20" x2="32" y2="28" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" />
            <line x1="48" y1="20" x2="48" y2="28" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" />
            <line x1="34" y1="42" x2="46" y2="42" stroke="#cc4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="34" y1="42" x2="46" y2="42" stroke="#cc4444" strokeWidth="2" strokeLinecap="round" transform="rotate(90 40 42)" />
          </svg>
        </div>

        <h2 className="step-title">You need a reservation to continue!</h2>
        <p className="step-subtitle">
          Go to Recreation.gov to find and book your perfect campsite, then come back here to plan your trip!
        </p>

        <div className="reservation-options">
          <button
            className="reservation-btn primary"
            onClick={() => window.open('https://www.recreation.gov', '_blank')}
          >
            Go to Recreation.gov
          </button>
          <button
            className="reservation-btn secondary"
            onClick={() => onConfirm(true)}
          >
            Actually, I do have one
          </button>
        </div>

        <div className="reservation-info">
          <span className="reservation-info-icon">ⓘ</span>
          <div>
            <strong>Why book a reservation?</strong>
            <p>Unlock camping checklists, trail recommendations, and meal planning once your booking is confirmed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container reservation-step">
      <div className="reservation-emblem">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" stroke="#2d6a2d" strokeWidth="1.5" opacity="0.2" />
          <circle cx="40" cy="40" r="28" fill="#e8f0e8" />
          <path d="M22 38 L32 28 L40 20 L48 28 L58 38 H52 V56 H28 V38 Z" fill="#2d6a2d" opacity="0.8" />
          <rect x="34" y="44" width="12" height="12" fill="#1a3d1a" />
          <path d="M28 38 L28 28 L34 28 L34 38" fill="#3d8a3d" opacity="0.6" />
        </svg>
      </div>

      <h2 className="step-title">Do you have a campsite reserved already?</h2>
      <p className="step-subtitle">
        Help us customize your experience by letting us know your current status.
      </p>

      <div className="reservation-options">
        <button
          className="reservation-btn primary"
          onClick={() => onConfirm(true)}
        >
          Yes, I have one
        </button>
        <button
          className="reservation-btn secondary"
          onClick={() => setShowNoView(true)}
        >
          No, not yet
        </button>
      </div>
    </div>
  );
}

export default StepReservation;