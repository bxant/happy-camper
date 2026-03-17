import {
  buildDaySkeleton,
  assignMealsToDays,
  assignHikesToDays,
  buildTimeSlots,
} from '../utils/scheduleBuilder';

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

export async function createSpreadsheet(accessToken, title) {
  const response = await fetch(SHEETS_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Itinerary' } },
        { properties: { title: 'Meals' } },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create spreadsheet');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

export async function writeItineraryToSheet(accessToken, spreadsheetId, schedule, honorableMentions, campgroundName) {
  const valueRanges = [];

  // --- ROW 1: Title ---
  valueRanges.push({
    range: 'Itinerary!A1',
    values: [[`${campgroundName} — Itinerary`]],
  });

  // --- ROW 3: Day headers ---
  const dayHeaders = ['TIME', ...schedule.map(day => day.dateLabel)];
  valueRanges.push({
    range: 'Itinerary!A3',
    values: [dayHeaders],
  });

  // --- ROW 4+: Time slots ---
  // First collect all unique time labels across all days
  const allTimes = [];
  schedule.forEach(day => {
    day.timeSlots.forEach(slot => {
      if (!allTimes.includes(slot.time)) {
        allTimes.push(slot.time);
      }
    });
  });

  // Build one row per time slot
  const timeSlotRows = allTimes.map(time => {
    const row = [time];
    schedule.forEach(day => {
      const slot = day.timeSlots.find(s => s.time === time);
      row.push(slot ? slot.label : '');
    });
    return row;
  });

  valueRanges.push({
    range: 'Itinerary!A4',
    values: timeSlotRows,
  });

  // --- Honorable mentions sidebar ---
  // Starts at column after the last day column
  // schedule.length days + 1 for time column + 1 gap column
  const mentionsColIndex = schedule.length + 2;
  const mentionsColLetter = columnIndexToLetter(mentionsColIndex);

  valueRanges.push({
    range: `Itinerary!${mentionsColLetter}3`,
    values: [['HONORABLE MENTIONS']],
  });

  valueRanges.push({
    range: `Itinerary!${mentionsColLetter}4`,
    values: [['Hike'], ['Drive Time']],
  });

  const mentionRows = honorableMentions.map(hike => [
    hike.name,
    hike.driveMinutes ? `~${hike.driveMinutes} min drive` : 'Unknown',
  ]);

  valueRanges.push({
    range: `Itinerary!${mentionsColLetter}5`,
    values: mentionRows,
  });

  // --- Meals tab ---
  valueRanges.push({
    range: 'Meals!A1',
    values: [['Day', 'Breakfast', 'Lunch', 'Dinner']],
  });

  const mealRows = schedule.map(day => [
    day.dateLabel,
    day.meals.breakfast || '—',
    day.meals.lunch || '—',
    day.meals.dinner || '—',
  ]);

  valueRanges.push({
    range: 'Meals!A2',
    values: mealRows,
  });

  // --- Send everything to Google ---
  const response = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: valueRanges,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to write to spreadsheet');
  }

  return true;
}

function columnIndexToLetter(index) {
  let letter = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter;
}

export async function generateItinerary({
  accessToken,
  campgroundName,
  startDate,
  endDate,
  arrivalTime,
  wakeUpTime,
  bedTime,
  breakfastPool,
  lunchPool,
  dinnerPool,
  preferredHikes,
  hikesPerDay,
  hikeOnArrivalDay,
  allAvailableHikes,
  onStatusChange,
}) {
  try {
    // Step 1: Build the schedule
    onStatusChange('building');
    const days = buildDaySkeleton({ startDate, endDate, arrivalTime });
    const withMeals = assignMealsToDays(days, breakfastPool, lunchPool, dinnerPool);
    const { updatedDays, honorableMentions } = assignHikesToDays(
      withMeals,
      preferredHikes,
      hikesPerDay,
      hikeOnArrivalDay,
      allAvailableHikes
    );
    const schedule = buildTimeSlots(updatedDays, wakeUpTime, bedTime);

    // Step 2: Create the sheet
    onStatusChange('creating');
    const month = new Date(startDate + 'T00:00:00')
      .toLocaleString('default', { month: 'long' }).toUpperCase();
    const year = new Date(startDate + 'T00:00:00').getFullYear();
    const title = `${campgroundName.toUpperCase()} ITINERARY - ${month} ${year}`;
    const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(accessToken, title);

    // Step 3: Write the data
    onStatusChange('writing');
    await writeItineraryToSheet(
      accessToken,
      spreadsheetId,
      schedule,
      honorableMentions,
      campgroundName
    );

    onStatusChange('success');
    return { spreadsheetUrl };

  } catch (error) {
    onStatusChange('error');
    throw error;
  }
}