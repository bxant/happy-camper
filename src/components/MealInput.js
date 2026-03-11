import { useState } from 'react';

function MealInput({ mealType, meals, onAddMeal, onRemoveMeal }) {
  const [inputValue, setInputValue] = useState('');

  function handleKeyDown(event) {
    if (event.key === 'Enter' && inputValue.trim() !== '') {
      onAddMeal(mealType, inputValue.trim());
      setInputValue('');
    }
  }

  return (
    <div className="meal-input">
      <h4>{mealType}</h4>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Add a ${mealType.toLowerCase()} meal and press Enter`}
      />
      <div className="meal-tags">
        {meals.map((meal, index) => (
          <span key={index} className="meal-tag">
            {meal}
            <button onClick={() => onRemoveMeal(mealType, index)}>x</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default MealInput;