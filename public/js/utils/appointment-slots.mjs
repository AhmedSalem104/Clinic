import { clockMinutes } from './time.mjs';

const parseBreaks = (value) => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

export const makeSlots = (schedule, booked, duration, date, pauses = [], exceptions = []) => {
  if (!schedule || exceptions.some((item) => ['vacation', 'unavailable'].includes(item.ExceptionType))) return [];
  const special = exceptions.find((item) => item.ExceptionType === 'special' && item.StartTime && item.EndTime);
  const startMinute = clockMinutes(special?.StartTime || schedule.StartTime);
  const endMinute = clockMinutes(special?.EndTime || schedule.EndTime);
  const breaks = parseBreaks(schedule.BreaksJson);
  const dayStart = new Date(`${date}T00:00:00`);
  const output = [];

  for (let minute = startMinute; minute + duration <= endMinute; minute += duration) {
    const start = new Date(dayStart.getTime() + minute * 60000);
    const end = new Date(start.getTime() + duration * 60000);
    const overlapsBooking = booked.some((booking) => {
      const bookingStart = new Date(booking.StartAt).getTime();
      const bookingEnd = bookingStart + Number(booking.ExpectedDurationMinutes || duration) * 60000;
      return start.getTime() < bookingEnd && end.getTime() > bookingStart;
    });
    const overlapsBreak = breaks.some((item) => {
      const breakStart = clockMinutes(item.start || item.StartTime || item.from);
      const breakEnd = clockMinutes(item.end || item.EndTime || item.to);
      return minute < breakEnd && minute + duration > breakStart;
    });
    const overlapsPause = pauses.some((pause) => start.getTime() < new Date(pause.EndAt).getTime() && end.getTime() > new Date(pause.StartedAt).getTime());
    if (!overlapsBooking && !overlapsBreak && !overlapsPause) output.push(start);
  }
  return output;
};
