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