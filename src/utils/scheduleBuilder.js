import { format, addDays, differenceInCalendarDays } from 'date-fns';

export function buildDaySkeleton({ startDate, endDate, arrivalTime }) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const days = [];

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i);
    const dateLabel = format(date, 'EEEE, MMMM d');
    const dayOfWeek = format(date, 'EEE').toUpperCase();

    let dayType;
    if (i === 0) dayType = 'arrival';
    else if (i === totalDays - 1) dayType = 'departure';
    else dayType = 'full';

    days.push({
      index: i,
      date,
      dateLabel,
      dayOfWeek,
      dayType,
      arrivalTime: dayType === 'arrival' ? arrivalTime : null,
      meals: { breakfast: null, lunch: null, dinner: null },
      hikes: [],
      timeSlots: [],
    });
  }

  return days;
}

export function assignMealsToDays(days, breakfastPool, lunchPool, dinnerPool) {
  return days.map(day => {
    const i = day.index;
    const breakfast = breakfastPool[i % breakfastPool.length];
    const lunch = lunchPool[i % lunchPool.length];
    const dinner = dinnerPool[i % dinnerPool.length];

    if (day.dayType === 'arrival') {
      return { ...day, meals: { breakfast: null, lunch, dinner } };
    }

    if (day.dayType === 'departure') {
      return { ...day, meals: { breakfast, lunch: null, dinner: null } };
    }

    return { ...day, meals: { breakfast, lunch, dinner } };
  });
}

export function assignHikesToDays(days, preferredHikes, hikesPerDay, hikeOnArrivalDay, allAvailableHikes) {
  // Build the full pool — preferred first, then remaining by drive time
  const preferredNames = new Set(preferredHikes.map(h => h.name));
  const remainingPool = allAvailableHikes
    .filter(h => !preferredNames.has(h.name))
    .sort((a, b) => (a.driveMinutes || 999) - (b.driveMinutes || 999));

  const fullPool = [...preferredHikes, ...remainingPool];
  let hikeIndex = 0;
  const scheduledHikeNames = new Set();

  const updatedDays = days.map(day => {
    if (day.dayType === 'departure') return day;
    if (day.dayType === 'arrival' && !hikeOnArrivalDay) return day;

    const count = Math.min(hikesPerDay[day.index] || 1, 3);
    const assignedHikes = [];

    for (let i = 0; i < count; i++) {
      if (hikeIndex < fullPool.length) {
        assignedHikes.push(fullPool[hikeIndex]);
        scheduledHikeNames.add(fullPool[hikeIndex].name);
        hikeIndex++;
      }
    }

    return { ...day, hikes: assignedHikes };
  });

  // Calculate total hikes needed across all days
  const totalHikesNeeded = days.reduce((sum, day) => {
    if (day.dayType === 'departure') return sum;
    if (day.dayType === 'arrival' && !hikeOnArrivalDay) return sum;
    return sum + Math.min(hikesPerDay[day.index] || 1, 3);
  }, 0);

  // Rebuild honorable mentions — hikes NOT in schedule, sorted by drive time
  // Total = hikes needed + 2 for flexibility
  const honorableMentions = allAvailableHikes
    .filter(h => !scheduledHikeNames.has(h.name))
    .sort((a, b) => (a.driveMinutes || 999) - (b.driveMinutes || 999))
    .slice(0, totalHikesNeeded + 2);

  return { updatedDays, honorableMentions };
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes === 0 ? '00' : minutes;
  return `${displayHour}:${displayMinutes} ${period}`;
}

function timeToRowOffset(totalMinutes) {
  const startMinutes = 0; // midnight anchor — supports any start time
  const diff = (totalMinutes - startMinutes + 24 * 60) % (24 * 60);
  return Math.round(diff / 30);
}

function roundUpToHalfHour(minutes) {
  return Math.ceil(minutes / 30) * 30;
}

function buildSlots(events) {
  const slots = [];
  let cursor = events.startMinute;

  for (const event of events.schedule) {
    slots.push({
      time: minutesToTimeLabel(cursor),
      rowOffset: timeToRowOffset(cursor),
      label: event.label,
    });
    cursor += event.durationMinutes;
  }

  return slots;
}

export function buildTimeSlots(days, wakeUpTime, bedTime) {
  return days.map(day => {
    const wakeMinutes = timeToMinutes(wakeUpTime);
    const bedMinutes = timeToMinutes(bedTime);
    const schedule = [];

    if (day.dayType === 'arrival') {
      const arrivalMinutes = timeToMinutes(day.arrivalTime);

      if (arrivalMinutes <= timeToMinutes('14:00')) {
        schedule.push({ label: 'Arrive & Set Up Camp', durationMinutes: 60 });
        schedule.push({ label: `Lunch — ${day.meals.lunch}`, durationMinutes: 60 });
        if (day.hikes.length > 0) {
          const hike = day.hikes[0];
          const driveTime = roundUpToHalfHour(hike.driveMinutes || 30);
          schedule.push({ label: `Drive to ${hike.name}`, durationMinutes: driveTime });
          schedule.push({ label: `Hike — ${hike.name}`, durationMinutes: 120 });
          schedule.push({ label: 'Drive back to camp', durationMinutes: driveTime });
        }
        schedule.push({ label: `Dinner — ${day.meals.dinner}`, durationMinutes: 60 });
        schedule.push({ label: 'Campfire & Rest', durationMinutes: 60 });
        schedule.push({ label: 'Sleep', durationMinutes: 0 });
      } else if (arrivalMinutes < timeToMinutes('18:00')) {
        schedule.push({ label: 'Arrive & Set Up Camp', durationMinutes: 60 });
        schedule.push({ label: `Dinner — ${day.meals.dinner}`, durationMinutes: 60 });
        schedule.push({ label: 'Campfire & Rest', durationMinutes: 60 });
        schedule.push({ label: 'Sleep', durationMinutes: 0 });
      } else {
        schedule.push({ label: 'Arrive & Set Up Camp', durationMinutes: 30 });
        schedule.push({ label: `Dinner — ${day.meals.dinner}`, durationMinutes: 60 });
        schedule.push({ label: 'Sleep', durationMinutes: 0 });
      }

      return {
        ...day,
        timeSlots: buildSlots({ startMinute: arrivalMinutes, schedule }),
      };
    }

    if (day.dayType === 'departure') {
      schedule.push({ label: 'Wake Up', durationMinutes: 30 });
      schedule.push({ label: `Breakfast — ${day.meals.breakfast}`, durationMinutes: 60 });
      schedule.push({ label: 'Pack Up Camp', durationMinutes: 90 });
      schedule.push({ label: 'Head Home', durationMinutes: 0 });

      return {
        ...day,
        timeSlots: buildSlots({ startMinute: wakeMinutes, schedule }),
      };
    }

    // Full day
    schedule.push({ label: 'Wake Up', durationMinutes: 30 });
    schedule.push({ label: `Breakfast — ${day.meals.breakfast}`, durationMinutes: 60 });

    const [firstHike, secondHike, thirdHike] = day.hikes;

    if (firstHike) {
      const driveTime = roundUpToHalfHour(firstHike.driveMinutes || 30);
      schedule.push({ label: `Drive to ${firstHike.name}`, durationMinutes: driveTime });
      schedule.push({ label: `Hike — ${firstHike.name}`, durationMinutes: 120 });
      schedule.push({ label: 'Drive back to camp', durationMinutes: driveTime });
    }

    schedule.push({ label: `Lunch — ${day.meals.lunch}`, durationMinutes: 60 });

    if (secondHike) {
      const driveTime = roundUpToHalfHour(secondHike.driveMinutes || 30);
      schedule.push({ label: `Drive to ${secondHike.name}`, durationMinutes: driveTime });
      schedule.push({ label: `Hike — ${secondHike.name}`, durationMinutes: 120 });
      schedule.push({ label: 'Drive back to camp', durationMinutes: driveTime });
    }

    // Free time calculated before dinner
    const freeTimeStart = schedule.reduce((sum, e) => sum + e.durationMinutes, wakeMinutes);
    const freeTimeAvailable = bedMinutes - freeTimeStart - 120;

    if (freeTimeAvailable > 0) {
      schedule.push({ label: 'Free Time', durationMinutes: freeTimeAvailable });
    }

    schedule.push({ label: `Dinner — ${day.meals.dinner}`, durationMinutes: 60 });

    // Third hike is an evening walk — no drive time, no duration math
    if (thirdHike) {
      schedule.push({ label: `Evening Walk — ${thirdHike.name}`, durationMinutes: 60 });
    }

    schedule.push({ label: 'Campfire & Rest', durationMinutes: 60 });
    schedule.push({ label: 'Sleep', durationMinutes: 0 });

    return {
      ...day,
      timeSlots: buildSlots({ startMinute: wakeMinutes, schedule }),
    };
  });
}