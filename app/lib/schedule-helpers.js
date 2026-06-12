// ============================================================
// SCHEDULE HELPERS  —  goes in:  app/lib/schedule-helpers.js
// (NEW file — create it inside app/lib/)
//
// Day 20 · Chunk B: pure date math for schedules saved in the
// `reminders` table. There's NO React in here on purpose —
// that's what lets the Calendar page (browser) and the email
// reminder route (server, Chunk C) share the exact same logic,
// so they can never disagree about which days are dose days.
//
// A schedule row looks like:
//   {
//     peptide_name, dose_amount, unit,
//     interval_days: 1 | 2 | null,      ← daily / every other day
//     days_of_week: [1,3,5] | null,     ← 0=Sun ... 6=Sat
//     start_date: "YYYY-MM-DD",
//     end_date:   "YYYY-MM-DD",         ← last day, inclusive
//     active: true/false, ...
//   }
// Exactly one of interval_days / days_of_week is set (the
// database enforces this with a check constraint).
// ============================================================

// Parse "YYYY-MM-DD" at local noon so timezone shifts can never
// move it to the wrong day.
export function dateFromString(value) {
  return new Date(`${value}T12:00:00`);
}

// Format a Date back to "YYYY-MM-DD" (local).
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Re-anchor any Date at local noon (drops the time part safely).
export function atNoon(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

// Whole days between two noon-anchored dates. Math.round
// absorbs the ±1 hour a daylight-saving change can introduce.
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// THE core question: does this schedule put a dose on this date?
// (Ignores `active` — callers decide whether paused schedules
// count. Use dosesDueOn() below for the usual case.)
export function isDoseDay(schedule, date) {
  const day = atNoon(date);
  const start = dateFromString(schedule.start_date);
  const end = dateFromString(schedule.end_date);

  if (day < start || day > end) return false;

  if (schedule.interval_days) {
    const diff = daysBetween(start, day);
    return diff % schedule.interval_days === 0;
  }

  if (Array.isArray(schedule.days_of_week)) {
    return schedule.days_of_week.includes(day.getDay());
  }

  return false;
}

// All ACTIVE schedules that have a dose due on a given date.
// This is what the calendar grid and the email route both call.
export function dosesDueOn(schedules, date) {
  return (schedules || []).filter(
    (schedule) => schedule.active && isDoseDay(schedule, date)
  );
}

// Human-readable frequency for a schedule row, e.g.
// "Every day", "Every other day", "Mon, Wed, Fri".
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function describeFrequency(schedule) {
  if (schedule.interval_days === 1) return "Every day";
  if (schedule.interval_days === 2) return "Every other day";
  if (schedule.interval_days) return `Every ${schedule.interval_days} days`;
  if (Array.isArray(schedule.days_of_week) && schedule.days_of_week.length > 0) {
    if (schedule.days_of_week.length === 7) return "Every day";
    return MON_FIRST_ORDER.filter((d) => schedule.days_of_week.includes(d))
      .map((d) => DAY_LABELS[d])
      .join(", ");
  }
  return "—";
}