function StepGenerate({ status, spreadsheetUrl, campgroundName, onRetry, onDownloadJSON, schedule }) {

  const steps = [
    { key: 'building', label: 'Building your schedule' },
    { key: 'creating', label: 'Creating your Google Sheet' },
    { key: 'writing', label: 'Writing your itinerary' },
    { key: 'success', label: 'Your trip is ready!' },
  ];

  function getStepState(stepKey) {
    const order = ['building', 'creating', 'writing', 'success'];
    const currentIndex = order.indexOf(status);
    const stepIndex = order.indexOf(stepKey);

    if (status === 'error') return 'error';
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  }

  if (status === 'idle') return null;

  return (
    <div className="step-container generate-step">

      {status !== 'success' && status !== 'error' && (
        <>
          <h2 className="step-title">Planning your adventure...</h2>
          <p className="step-subtitle">
            Hang tight while we build your perfect itinerary.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="generate-success-icon">🏕️</div>
          <h2 className="step-title">Your itinerary is ready!</h2>
          <p className="step-subtitle">
            {campgroundName} is all planned out. Time to pack your bags.
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="generate-error-icon">⚠️</div>
          <h2 className="step-title">Something went wrong</h2>
          <p className="step-subtitle">
            We couldn't create your Google Sheet. You can retry or download your itinerary as a JSON file instead.
          </p>
        </>
      )}

      {/* Progress steps */}
      <div className="generate-steps">
        {steps.map((step) => {
          const state = getStepState(step.key);
          return (
            <div key={step.key} className={`generate-step-row ${state}`}>
              <div className="generate-step-indicator">
                {state === 'done' && '✓'}
                {state === 'active' && <span className="generate-spinner" />}
                {state === 'pending' && '○'}
                {state === 'error' && '✕'}
              </div>
              <span className="generate-step-label">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {status === 'success' && spreadsheetUrl && (
        <a
          className="generate-sheet-link"
          href={spreadsheetUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open your Google Sheet →
        </a>
      )}

      {status === 'error' && (
        <div className="generate-error-actions">
          <button className="step-continue-btn" onClick={onRetry}>
            Try Again
          </button>
          <button className="step-back-btn" onClick={onDownloadJSON}>
            Download as JSON instead
          </button>
        </div>
      )}
    </div>
  );
}

export default StepGenerate;