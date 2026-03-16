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
  const hikePool = [...preferredHikes];
  let hikeIndex = 0;

  const updatedDays = days.map(day => {
    if (day.dayType === 'departure') return day;

    if (day.dayType === 'arrival' && !hikeOnArrivalDay) return day;

    const count = hikesPerDay[day.index] || 1;
    const assignedHikes = [];

    for (let i = 0; i < count; i++) {
      if (hikeIndex < hikePool.length) {
        assignedHikes.push(hikePool[hikeIndex]);
        hikeIndex++;
      }
    }

    return { ...day, hikes: assignedHikes };
  });

  // Honorable mentions = all preferred hikes + 2 closest from remaining pool
  const usedHikeNames = new Set(preferredHikes.map(h => h.name));
  const remaining = allAvailableHikes
    .filter(h => !usedHikeNames.has(h.name))
    .sort((a, b) => (a.driveMinutes || 999) - (b.driveMinutes || 999))
    .slice(0, 2);

  const honorableMentions = [...preferredHikes, ...remaining];

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

function roundUpToHalfHour(minutes) {
  return Math.ceil(minutes / 30) * 30;
}

function buildSlots(events) {
  const slots = [];
  let cursor = events.startMinute;

  for (const event of events.schedule) {
    slots.push({
      time: minutesToTimeLabel(cursor),
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
          schedule.push({ label: `Drive back to camp`, durationMinutes: driveTime });
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

    const [firstHike, secondHike] = day.hikes;

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

    const freeTimeStart = schedule.reduce((sum, e) => sum + e.durationMinutes, wakeMinutes);
    const freeTimeAvailable = bedMinutes - freeTimeStart - 120;

    if (freeTimeAvailable > 0) {
      schedule.push({ label: 'Free Time', durationMinutes: freeTimeAvailable });
    }

    schedule.push({ label: `Dinner — ${day.meals.dinner}`, durationMinutes: 60 });
    schedule.push({ label: 'Campfire & Rest', durationMinutes: 60 });
    schedule.push({ label: 'Sleep', durationMinutes: 0 });

    return {
      ...day,
      timeSlots: buildSlots({ startMinute: wakeMinutes, schedule }),
    };
  });
}