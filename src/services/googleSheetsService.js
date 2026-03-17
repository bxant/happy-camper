import {
  buildDaySkeleton,
  assignMealsToDays,
  assignHikesToDays,
  buildTimeSlots,
} from '../utils/scheduleBuilder';

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// ── Helpers ───────────────────────────────────────────

function columnIndexToLetter(index) {
  let letter = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter;
}

function hexToSheetsColor(hex) {
  const clean = hex.replace('#', '');
  return {
    red: parseInt(clean.substring(0, 2), 16) / 255,
    green: parseInt(clean.substring(2, 4), 16) / 255,
    blue: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

// ── Step 1: Create the spreadsheet ───────────────────

export async function createSpreadsheet(accessToken, title) {
  const response = await fetch(SHEETS_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Itinerary', sheetId: 0 } },
        { properties: { title: 'Meals', sheetId: 1 } },
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

// ── Step 2: Write values ──────────────────────────────

export async function writeItineraryToSheet(
  accessToken,
  spreadsheetId,
  schedule,
  honorableMentions,
  campgroundName
) {
  const valueRanges = [];

  // Row 1: Title
  valueRanges.push({
    range: 'Itinerary!B1',
    values: [[`${campgroundName.toUpperCase()} — ITINERARY`]],
  });

  // Row 3: Day headers
  const dayHeaders = ['TIME', ...schedule.map(day => day.dayOfWeek)];
  valueRanges.push({
    range: 'Itinerary!B3',
    values: [dayHeaders],
  });

  // Row 4: Dates
  const dateRow = ['', ...schedule.map(day => day.dateLabel)];
  valueRanges.push({
    range: 'Itinerary!B4',
    values: [dateRow],
  });

  // Row 6+: Time slots
  const allTimes = [];
  schedule.forEach(day => {
    day.timeSlots.forEach(slot => {
      if (!allTimes.includes(slot.time)) {
        allTimes.push(slot.time);
      }
    });
  });
  allTimes.sort((a, b) => {
    const toMinutes = (t) => {
        const [time, period] = t.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };
    return toMinutes(a) - toMinutes(b);
    });

  const timeSlotRows = allTimes.map(time => {
    const row = [time];
    schedule.forEach(day => {
      const slot = day.timeSlots.find(s => s.time === time);
      row.push(slot ? slot.label : '');
    });
    return row;
  });

  valueRanges.push({
    range: 'Itinerary!B6',
    values: timeSlotRows,
  });

  // Honorable mentions sidebar
  const mentionsColIndex = schedule.length + 3;
  const mentionsColLetter = columnIndexToLetter(mentionsColIndex);

  valueRanges.push({
    range: `Itinerary!${mentionsColLetter}3`,
    values: [['HONORABLE MENTIONS']],
  });

  valueRanges.push({
    range: `Itinerary!${mentionsColLetter}4`,
    values: [['Trail Name', 'Drive Time']],
  });

  const mentionRows = honorableMentions.map(hike => [
    hike.name,
    hike.driveMinutes ? `~${hike.driveMinutes} min drive` : 'Unknown',
  ]);

  valueRanges.push({
    range: `Itinerary!${mentionsColLetter}5`,
    values: mentionRows,
  });

  // Meals tab
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

// ── Step 3: Format the sheet ──────────────────────────

export async function formatSheet(accessToken, spreadsheetId, schedule) {
  const requests = [];

  const darkGreen = hexToSheetsColor('#1A3D1A');
  const medGreen = hexToSheetsColor('#2D6A2D');
  const lightGreen = hexToSheetsColor('#4A8A4A');
  const paleGreen = hexToSheetsColor('#E8F0E8');
  const veryPaleGreen = hexToSheetsColor('#F0F5F0');
  const white = { red: 1, green: 1, blue: 1 };
  const numDays = schedule.length;

  // Title row: row 0 (1-indexed row 1)
  requests.push({
    repeatCell: {
      range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
      cell: {
        userEnteredFormat: {
          textFormat: {
            bold: true,
            fontSize: 18,
            fontFamily: 'Arial',
            foregroundColor: darkGreen,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  });

  // Day header row: row 2 (1-indexed row 3)
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 1,
        endColumnIndex: numDays + 2,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: medGreen,
          textFormat: {
            bold: true,
            fontSize: 10,
            fontFamily: 'Arial',
            foregroundColor: white,
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // Date row: row 3 (1-indexed row 4)
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 1,
        endColumnIndex: numDays + 2,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: lightGreen,
          textFormat: {
            bold: true,
            fontSize: 9,
            fontFamily: 'Arial',
            foregroundColor: white,
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // Time slot rows: alternating background starting row 5
  const numTimeSlots = Math.max(...schedule.map(d => d.timeSlots.length));
  for (let i = 0; i < numTimeSlots; i++) {
    const rowIndex = 5 + i;
    const bg = i % 2 === 0 ? veryPaleGreen : white;

    // Time column cell
    requests.push({
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: paleGreen,
            textFormat: {
              bold: true,
              fontSize: 9,
              fontFamily: 'Arial',
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Activity columns
    requests.push({
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 2,
          endColumnIndex: numDays + 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: bg,
            textFormat: {
              fontSize: 9,
              fontFamily: 'Arial',
            },
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)',
      },
    });
  }

  // Honorable mentions header
  const mentionsColIndex = numDays + 2;
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: mentionsColIndex,
        endColumnIndex: mentionsColIndex + 2,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: darkGreen,
          textFormat: {
            bold: true,
            fontSize: 10,
            fontFamily: 'Arial',
            foregroundColor: white,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  });

  // Column widths
  // Time column (col B = index 1)
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
      properties: { pixelSize: 90 },
      fields: 'pixelSize',
    },
  });

  // Day columns
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 2, endIndex: numDays + 2 },
      properties: { pixelSize: 180 },
      fields: 'pixelSize',
    },
  });

  // Honorable mentions columns
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId: 0,
        dimension: 'COLUMNS',
        startIndex: mentionsColIndex,
        endIndex: mentionsColIndex + 2,
      },
      properties: { pixelSize: 200 },
      fields: 'pixelSize',
    },
  });

  // Row heights for time slot rows
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId: 0,
        dimension: 'ROWS',
        startIndex: 5,
        endIndex: 5 + numTimeSlots,
      },
      properties: { pixelSize: 40 },
      fields: 'pixelSize',
    },
  });

  // Meals tab header row
  requests.push({
    repeatCell: {
      range: {
        sheetId: 1,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: medGreen,
          textFormat: {
            bold: true,
            fontSize: 10,
            fontFamily: 'Arial',
            foregroundColor: white,
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // Freeze header rows on Itinerary tab
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: 0,
        gridProperties: { frozenRowCount: 4 },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  const response = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to format spreadsheet');
  }

  return true;
}

// ── Master function ───────────────────────────────────

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

  // Step 4: Format the sheet
  await formatSheet(accessToken, spreadsheetId, schedule);

  onStatusChange('success');
  return { spreadsheetUrl };
}