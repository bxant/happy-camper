import MealInput from '../MealInput';

function StepMeals({
  breakfastMeals,
  lunchMeals,
  dinnerMeals,
  onAddMeal,
  onRemoveMeal,
  onContinue,
  onBack,
}) {
  const canContinue = breakfastMeals.length > 0 
    && lunchMeals.length > 0 
    && dinnerMeals.length > 0;

  return (
    <div className="step-container">
      <h2 className="step-title">Meal Planning</h2>
      <p className="step-subtitle">
        Add your meals for the trip. We'll assign them to each day automatically.
      </p>

      <MealInput
        mealType="Breakfast"
        meals={breakfastMeals}
        onAddMeal={onAddMeal}
        onRemoveMeal={onRemoveMeal}
      />
      <MealInput
        mealType="Lunch"
        meals={lunchMeals}
        onAddMeal={onAddMeal}
        onRemoveMeal={onRemoveMeal}
      />
      <MealInput
        mealType="Dinner"
        meals={dinnerMeals}
        onAddMeal={onAddMeal}
        onRemoveMeal={onRemoveMeal}
      />

      {!canContinue && (
        <p className="step-hint">
          Please add at least one meal for each category to continue.
        </p>
      )}

      <div className="step-nav">
        <button className="step-back-btn" onClick={onBack}>
          ← Back
        </button>
        <button
          className="step-continue-btn"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Plan My Trip →
        </button>
      </div>
    </div>
  );
}

export default StepMeals;