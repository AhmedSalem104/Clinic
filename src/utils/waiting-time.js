const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const expectedDuration = ({ serviceBaseDuration, doctorAdjustment = 0, currentDayAdjustment = 0 }) => {
  const base = Number(serviceBaseDuration) || 15;
  return Math.round(clamp(base + Number(doctorAdjustment || 0) + Number(currentDayAdjustment || 0), 5, 240));
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const movePastPauses = (start, durationMinutes, pauses) => {
  let cursor = new Date(start);
  const ordered = (pauses || []).map((pause) => ({ start: new Date(pause.start), end: new Date(pause.end) })).filter((p) => p.end > p.start).sort((a, b) => a.start - b.start);
  for (const pause of ordered) {
    if (pause.end <= cursor) continue;
    const projectedEnd = addMinutes(cursor, durationMinutes);
    if (pause.start < projectedEnd && pause.end > cursor) {
      // A consultation is not split across a pause; move the entire consultation after it.
      cursor = pause.end;
    } else {
      break;
    }
  }
  // A later pause can still intersect the consultation after the first shift.
  return movePastPausesOnce(cursor, durationMinutes, ordered);
};

const movePastPausesOnce = (start, durationMinutes, pauses) => {
  let cursor = new Date(start);
  for (const pause of pauses) {
    if (pause.end <= cursor) continue;
    const projectedEnd = addMinutes(cursor, durationMinutes);
    if (pause.start < projectedEnd && pause.end > cursor) cursor = pause.end;
    else break;
  }
  return { start: new Date(cursor), end: addMinutes(cursor, durationMinutes) };
};

const recalculateQueue = (entries, now = new Date(), pauses = []) => {
  let cursor = new Date(now);
  return [...entries].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((entry, index) => {
    const duration = expectedDuration({
      serviceBaseDuration: entry.baseDurationMinutes || entry.expectedDurationMinutes,
      doctorAdjustment: entry.doctorAdjustment,
      currentDayAdjustment: entry.currentDayAdjustment
    });
    const range = movePastPauses(cursor, duration, pauses);
    cursor = range.end;
    return {
      ...entry,
      position: index + 1,
      expectedStartAt: range.start,
      expectedEndAt: range.end,
      expectedDurationMinutes: duration
    };
  });
};

module.exports = { expectedDuration, movePastPauses, recalculateQueue };
