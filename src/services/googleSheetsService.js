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
        { properties: { title: 'Weekly Calendar Template', sheetId: 0 } },
        { properties: { title: 'Meals, Ingredients, and Equipment', sheetId: 1 } },
        { properties: { title: 'Weekly Calendar Data Keys', sheetId: 2 } },
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

function subtractOneHour(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes - 60;
  const adjusted = (totalMinutes + 24 * 60) % (24 * 60);
  const h = Math.floor(adjusted / 60);
  const m = adjusted % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMinutes = m === 0 ? '00' : String(m).padStart(2, '0');
  return `${displayHour}:${displayMinutes} ${period}`;
}

export async function writeItineraryToSheet(
  accessToken,
  spreadsheetId,
  schedule,
  honorableMentions,
  campgroundName,
  wakeUpTime
) {
  const valueRanges = [];
  const numDays = schedule.length;

  // ── Weekly Calendar Template tab ──

  // Row 1: Title
  valueRanges.push({
    range: 'Weekly Calendar Template!B1',
    values: [[`${campgroundName.toUpperCase()} — ITINERARY`]],
  });

  // Row 1: Config labels
  valueRanges.push({
    range: 'Weekly Calendar Template!E1',
    values: [['SCHEDULE START TIME', 'TIME INTERVAL', 'TRIP START DATE']],
  });

  // Row 2: Config values — these are the cells users can edit
  // E2 = start time, F2 = interval in minutes (30 or 60), G2 = trip start date
    valueRanges.push({
    range: 'Weekly Calendar Template!E2',
    values: [[subtractOneHour(wakeUpTime), '30', schedule[0]?.dateLabel || '']],
    });

  // Row 3: Hidden interval helper — extracts numeric value from F2
  // =--LEFT(F2,2) pulls "30" or "60" from the interval cell
  valueRanges.push({
    range: 'Weekly Calendar Template!F3',
    values: [['=--F2']],
  });

  // Row 4: Day headers
  const dayHeaders = ['TIME', ...schedule.map(day => day.dayOfWeek)];
  valueRanges.push({
    range: 'Weekly Calendar Template!B4',
    values: [dayHeaders],
  });

  // Row 5: Dates
  const dateRow = ['', ...schedule.map(day => day.dateLabel)];
  valueRanges.push({
    range: 'Weekly Calendar Template!B5',
    values: [dateRow],
  });

  // Row 7: First time slot — references config cell E2
  valueRanges.push({
    range: 'Weekly Calendar Template!B7',
    values: [['=E2']],
  });

  // Rows 8+: Formula-driven time slots
  // Each row = previous row + TIME(0, interval_minutes, 0)
  const timeFormulaRows = [];
  for (let i = 1; i < 48; i++) {
    const prevRow = 7 + i - 1;
    timeFormulaRows.push([`=B${prevRow}+TIME(0,$F$3,0)`]);
  }

  valueRanges.push({
    range: 'Weekly Calendar Template!B8',
    values: timeFormulaRows,
  });

  // Write activity columns day by day
  schedule.forEach((day, dayIdx) => {
    const colLetter = columnIndexToLetter(3 + dayIdx);
    
    // Build a rowOffset -> label map for this day
    const offsetToLabel = {};
    day.timeSlots.forEach(slot => {
        offsetToLabel[slot.rowOffset] = slot.label;
    });

    // Write 48 rows, using rowOffset to place activities correctly
    const activityRows = Array.from({ length: 48 }, (_, i) => [
        offsetToLabel[i] || ''
        ]);

    valueRanges.push({
        range: `Weekly Calendar Template!${colLetter}7`,
        values: activityRows,
    });
    });

  // Honorable mentions sidebar
  const mentionsColIndex = numDays + 3;
  const mentionsColLetter = columnIndexToLetter(mentionsColIndex);

  valueRanges.push({
    range: `Weekly Calendar Template!${mentionsColLetter}4`,
    values: [['HIKES NOT IN ITINERARY — WORTH CONSIDERING']],
  });

  valueRanges.push({
    range: `Weekly Calendar Template!${mentionsColLetter}5`,
    values: [['Trail Name', 'Drive Time']],
  });

  const mentionRows = honorableMentions.map(hike => [
    hike.name,
    hike.driveMinutes ? `~${hike.driveMinutes} min drive` : 'Unknown',
  ]);

  valueRanges.push({
    range: `Weekly Calendar Template!${mentionsColLetter}6`,
    values: mentionRows,
  });

  valueRanges.push({
    range: `Weekly Calendar Template!${mentionsColLetter}${6 + honorableMentions.length + 1}`,
    values: [[
      '⚠️ Hike durations are estimated at 2 hrs. Drive times are approximate. Research trails before your trip.'
    ]],
  });

  // ── Meals, Ingredients, and Equipment tab ──
  valueRanges.push({
    range: 'Meals, Ingredients, and Equipment!A1',
    values: [['Day', 'Breakfast', 'Chef', 'Lunch', 'Chef', 'Dinner', 'Chef']],
  });

  const mealRows = schedule.map(day => [
    day.dateLabel,
    day.meals.breakfast || '—',
    day.meals.breakfast ? 'Self' : '—',
    day.meals.lunch || '—',
    day.meals.lunch ? 'Self' : '—',
    day.meals.dinner || '—',
    day.meals.dinner ? 'Self' : '—',
  ]);

  valueRanges.push({
    range: 'Meals, Ingredients, and Equipment!A2',
    values: mealRows,
  });

  // ── Weekly Calendar Data Keys tab ──
  valueRanges.push({
    range: 'Weekly Calendar Data Keys!B2',
    values: [['SCHEDULE START TIME', '', 'TIME INTERVAL']],
  });

  valueRanges.push({
    range: 'Weekly Calendar Data Keys!B3',
    values: [
        ['12:00 AM', '', '30 (30 minute intervals)'],
        ['12:30 AM', '', '60 (60 minute intervals)'],
        ['1:00 AM', '', ''],
        ['1:30 AM', '', ''],
        ['2:00 AM', '', ''],
        ['2:30 AM', '', ''],
        ['3:00 AM', '', ''],
        ['3:30 AM', '', ''],
        ['4:00 AM', '', ''],
        ['4:30 AM', '', ''],
        ['5:00 AM', '', ''],
        ['5:30 AM', '', ''],
        ['6:00 AM', '', ''],
        ['6:30 AM', '', ''],
        ['7:00 AM', '', ''],
        ['7:30 AM', '', ''],
        ['8:00 AM', '', ''],
        ['8:30 AM', '', ''],
        ['9:00 AM', '', ''],
        ['9:30 AM', '', ''],
        ['10:00 AM', '', ''],
        ['10:30 AM', '', ''],
        ['11:00 AM', '', ''],
        ['12:00 PM', '', ''],
    ],
    });

  valueRanges.push({
    range: 'Weekly Calendar Data Keys!B11',
    values: [[
      'To reflow your schedule: change the value in cell E2 (start time) or F2 (interval) on the Weekly Calendar Template tab. All time slots will update automatically.'
    ]],
  });

  // Send all values — USER_ENTERED so formulas work
  const response = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
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
  const numTimeSlots = 48;
  // Dropdown for start time — cell E2
    requests.push({
    setDataValidation: {
        range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 4,
        endColumnIndex: 5,
        },
        rule: {
        condition: {
            type: 'ONE_OF_LIST',
            values: [
                { userEnteredValue: '12:00 AM' },
                { userEnteredValue: '12:30 AM' },
                { userEnteredValue: '1:00 AM' },
                { userEnteredValue: '1:30 AM' },
                { userEnteredValue: '2:00 AM' },
                { userEnteredValue: '2:30 AM' },
                { userEnteredValue: '3:00 AM' },
                { userEnteredValue: '3:30 AM' },
                { userEnteredValue: '4:00 AM' },
                { userEnteredValue: '4:30 AM' },
                { userEnteredValue: '5:00 AM' },
                { userEnteredValue: '5:30 AM' },
                { userEnteredValue: '6:00 AM' },
                { userEnteredValue: '6:30 AM' },
                { userEnteredValue: '7:00 AM' },
                { userEnteredValue: '7:30 AM' },
                { userEnteredValue: '8:00 AM' },
                { userEnteredValue: '8:30 AM' },
                { userEnteredValue: '9:00 AM' },
                { userEnteredValue: '9:30 AM' },
                { userEnteredValue: '10:00 AM' },
                { userEnteredValue: '10:30 AM' },
                { userEnteredValue: '11:00 AM' },
                { userEnteredValue: '12:00 PM' },
            ],
        },
        showCustomUi: true,
        strict: true,
        },
    },
    });

// Dropdown for time interval — cell F2
requests.push({
  setDataValidation: {
    range: {
      sheetId: 0,
      startRowIndex: 1,
      endRowIndex: 2,
      startColumnIndex: 5,
      endColumnIndex: 6,
    },
    rule: {
      condition: {
        type: 'ONE_OF_LIST',
        values: [
          { userEnteredValue: '30' },
          { userEnteredValue: '60' },
        ],
      },
      showCustomUi: true,
      strict: true,
    },
  },
});
  // Title cell — wrap text
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            bold: true,
            fontSize: 18,
            fontFamily: 'Arial',
            foregroundColor: darkGreen,
          },
          wrapStrategy: 'WRAP',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(textFormat,wrapStrategy,verticalAlignment)',
    },
  });

  // Config label row — row 1
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 4,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: veryPaleGreen,
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

  // Config value row — row 2
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 4,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: veryPaleGreen,
          textFormat: {
            bold: true,
            fontSize: 10,
            fontFamily: 'Arial',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // Day header row — row 4 (index 3)
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

  // Date row — row 5 (index 4)
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 4,
        endRowIndex: 5,
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

  // Time slot rows — rows 7 through 7+48 (index 6 through 6+48)
  for (let i = 0; i < numTimeSlots; i++) {
    const rowIndex = 6 + i;
    const bg = i % 2 === 0 ? veryPaleGreen : white;

    // Time column
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
              fontSize: 10,
              fontFamily: 'Arial',
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            numberFormat: {
              type: 'TIME',
              pattern: 'h:mm AM/PM',
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,numberFormat)',
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
              fontSize: 10,
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
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: mentionsColIndex,
        endColumnIndex: mentionsColIndex + 2,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: darkGreen,
          textFormat: {
            bold: true,
            fontSize: 9,
            fontFamily: 'Arial',
            foregroundColor: white,
          },
          horizontalAlignment: 'CENTER',
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
    },
  });

  // Honorable mentions sub-header
  requests.push({
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 4,
        endRowIndex: 5,
        startColumnIndex: mentionsColIndex,
        endColumnIndex: mentionsColIndex + 2,
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
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  });

  // Column widths
  // Time column
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
      properties: { pixelSize: 85 },
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
      properties: { pixelSize: 220 },
      fields: 'pixelSize',
    },
  });

  // Row heights — compact like the template
  // Header rows
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'ROWS', startIndex: 0, endIndex: 2 },
      properties: { pixelSize: 30 },
      fields: 'pixelSize',
    },
  });

  // Day header and date rows
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'ROWS', startIndex: 3, endIndex: 5 },
      properties: { pixelSize: 21 },
      fields: 'pixelSize',
    },
  });

  // Time slot rows — compact
    requests.push({
    updateDimensionProperties: {
        range: {
        sheetId: 0,
        dimension: 'ROWS',
        startIndex: 6,
        endIndex: 62, // 56 time slots starting at row index 6
        },
        properties: { pixelSize: 21 },
        fields: 'pixelSize',
    },
    });

  // Freeze header rows
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: 0,
        gridProperties: { frozenRowCount: 5 },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // ── Meals tab formatting ──
  requests.push({
    repeatCell: {
      range: {
        sheetId: 1,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 7,
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

  // Chef columns styling
  [2, 4, 6].forEach(colIndex => {
    requests.push({
      repeatCell: {
        range: {
          sheetId: 1,
          startRowIndex: 1,
          endRowIndex: schedule.length + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: veryPaleGreen,
            textFormat: {
              fontSize: 10,
              fontFamily: 'Arial',
              italic: true,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
  });

  // Meals tab column widths
  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 1, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 160 },
      fields: 'pixelSize',
    },
  });

  requests.push({
    updateDimensionProperties: {
      range: { sheetId: 1, dimension: 'COLUMNS', startIndex: 1, endIndex: 7 },
      properties: { pixelSize: 150 },
      fields: 'pixelSize',
    },
  });

  // Meals row heights
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId: 1,
        dimension: 'ROWS',
        startIndex: 0,
        endIndex: schedule.length + 1,
      },
      properties: { pixelSize: 21 },
      fields: 'pixelSize',
    },
  });

  // ── Data Keys tab formatting ──
  requests.push({
    repeatCell: {
      range: {
        sheetId: 2,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
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

  onStatusChange('creating');
  const month = new Date(startDate + 'T00:00:00')
    .toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = new Date(startDate + 'T00:00:00').getFullYear();
  const title = `${campgroundName.toUpperCase()} ITINERARY - ${month} ${year}`;
  const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(accessToken, title);

  onStatusChange('writing');
  await writeItineraryToSheet(
    accessToken,
    spreadsheetId,
    schedule,
    honorableMentions,
    campgroundName,
    wakeUpTime
  );

  await formatSheet(accessToken, spreadsheetId, schedule);

  onStatusChange('success');
  return { spreadsheetUrl };
}