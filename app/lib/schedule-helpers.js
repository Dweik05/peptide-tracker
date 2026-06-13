// ============================================================
// SCHEDULE HELPERS  —  goes in:  app/lib/schedule-helpers.js
// (FULL REPLACEMENT — adds doseOnDate for titration. Every
//  existing export is byte-identical; only the new function at
//  the bottom is added, so the calendar/email keep working.)
//
// Pure date math for schedules saved in the `reminders` table.
// No React on purpose — the Calendar page (browser) and the
// email reminder route (server) share this exact logic so they
// can never disagree about which days are dose days or what
// dose applies.
//
// A schedule row looks like:
//   {
//     peptide_name, dose_amount, unit,
//     dose_phases: [{dose, weeks}, ...] | null,  ← titration (NEW)
//     interval_days: 1 | 2 | null,
//     days_of_week: [1,3,5] | null,
//     start_date: "YYYY-MM-DD",
//     end_date:   "YYYY-MM-DD",
//     active: true/false, ...
//   }
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

// Whole days between two noon-anchored dates. Math.round absorbs
// the ±1 hour a daylight-saving change can introduce.
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// THE core question: does this schedule put a dose on this date?
// (Ignores `active` — use dosesDueOn() for the usual case.)
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
export function dosesDueOn(schedules, date) {
  return (schedules || []).filter(
    (schedule) => schedule.active && isDoseDay(schedule, date)
  );
}

// Human-readable frequency for a schedule row.
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

// ---------------- titration (NEW, Day 22) ----------------
// dose_phases is an ordered array sharing the schedule's single
// `unit`, e.g. [{ dose: 0.5, weeks: 4 }, { dose: 1.0, weeks: 4 }].
// Each phase covers a span of whole weeks measured from start_date:
// the first phase covers weeks 1–4, the next the following weeks,
// and so on. A schedule with no dose_phases is a FLAT protocol and
// returns dose_amount unchanged — so every existing schedule keeps
// behaving exactly as before.
export function doseOnDate(schedule, date) {
  const phases = schedule.dose_phases;
  if (!Array.isArray(phases) || phases.length === 0) {
    return schedule.dose_amount; // flat protocol — unchanged behavior
  }

  const start = dateFromString(schedule.start_date);
  const day = atNoon(date);
  const weeksSinceStart = Math.floor(daysBetween(start, day) / 7);

  if (weeksSinceStart < 0) return Number(phases[0].dose); // before start (guard)

  let cumulativeWeeks = 0;
  for (const phase of phases) {
    cumulativeWeeks += Number(phase.weeks) || 0;
    if (weeksSinceStart < cumulativeWeeks) return Number(phase.dose);
  }
  // past the final phase — clamp to the last dose
  return Number(phases[phases.length - 1].dose);
}