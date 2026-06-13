// ============================================================
// STREAKS & ACHIEVEMENTS  —  goes in:  app/lib/streaks.js
// (NEW file — create it inside app/lib/)
//
// Day 21 · Chunk A: pure computation, no React, no database
// writes. Streaks and achievements are calculated LIVE from
// your real history every time the page loads — so they can
// never go stale or disagree with your logs.
//
// Two kinds of streak:
//
//   ADHERENCE STREAK (the smart one, powered by Day 20):
//     consecutive SCHEDULED dose days where you actually logged
//     the right peptide. A Mon/Wed/Fri protocol doesn't punish
//     you for (correctly) skipping Tuesday. If today is a dose
//     day you haven't logged yet, it's "pending" — it doesn't
//     break your streak until the day is over.
//
//   LOGGING STREAK (works without any schedules):
//     consecutive calendar days with at least one dose logged.
//
// Achievements are simple checks over your counts and streaks —
// all of them reward TRACKING and CONSISTENCY, never usage.
// ============================================================

import { dateFromString, toDateString, isDoseDay } from "./schedule-helpers";

function norm(name) {
  return (name || "").trim().toLowerCase();
}

// ---------------- adherence streak ----------------
// schedules: rows from `reminders`. doseLogs: rows from
// `dose_logs` (peptide_name, logged_at). todayString: "YYYY-MM-DD".
export function computeAdherenceStreaks(schedules, doseLogs, todayString) {
  const active = (schedules || []).filter((s) => s.active);
  const result = {
    hasSchedules: active.length > 0,
    current: 0,
    best: 0,
    todayPending: false, // today is a dose day, not logged yet
    todayDue: [],        // peptide names due today
    scheduledDays: 0,    // completed scheduled days so far
    hitDays: 0,          // ...of which you logged correctly
    adherencePct: null,
  };
  if (!result.hasSchedules) return result;

  // bucket logs by LOCAL day -> set of peptide names logged
  const loggedByDay = {};
  for (const log of doseLogs || []) {
    const key = toDateString(new Date(log.logged_at));
    if (!loggedByDay[key]) loggedByDay[key] = new Set();
    loggedByDay[key].add(norm(log.peptide_name));
  }

  // walk from the earliest schedule start to today, collecting
  // every scheduled day and whether it was fully hit (every
  // peptide due that day has a matching log that day)
  let earliest = null;
  for (const s of active) {
    if (earliest === null || s.start_date < earliest) earliest = s.start_date;
  }
  const today = dateFromString(todayString);
  const cursor = dateFromString(earliest);

  const days = [];
  while (cursor <= today) {
    const due = active.filter((s) => isDoseDay(s, cursor));
    if (due.length > 0) {
      const key = toDateString(cursor);
      const loggedSet = loggedByDay[key];
      const hit = due.every(
        (s) => loggedSet && loggedSet.has(norm(s.peptide_name))
      );
      days.push({ key, hit, due: due.map((s) => s.peptide_name) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (days.length === 0) return result; // first scheduled day is still ahead

  // if the most recent scheduled day is TODAY and not hit yet,
  // it's pending — exclude it from the math instead of counting
  // it as a miss
  const lastDay = days[days.length - 1];
  let usable = days;
  if (lastDay.key === todayString) {
    result.todayDue = lastDay.due;
    if (!lastDay.hit) {
      result.todayPending = true;
      usable = days.slice(0, -1);
    }
  }

  result.scheduledDays = usable.length;
  result.hitDays = usable.filter((d) => d.hit).length;
  result.adherencePct =
    usable.length > 0
      ? Math.round((result.hitDays / usable.length) * 100)
      : null;

  // current streak: walk backwards until the first miss
  let current = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    if (usable[i].hit) current++;
    else break;
  }
  result.current = current;

  // best streak: longest run of hits anywhere in history
  let best = 0;
  let run = 0;
  for (const d of usable) {
    if (d.hit) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  result.best = best;

  return result;
}

// ---------------- logging streak ----------------
export function computeLoggingStreaks(doseLogs, todayString) {
  const daySet = new Set();
  for (const log of doseLogs || []) {
    daySet.add(toDateString(new Date(log.logged_at)));
  }
  const result = {
    current: 0,
    best: 0,
    totalDaysLogged: daySet.size,
    loggedToday: daySet.has(todayString),
  };
  if (daySet.size === 0) return result;

  // best: sort the unique days, count consecutive runs
  const sorted = [...daySet].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = dateFromString(sorted[i - 1]);
    const cur = dateFromString(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  result.best = best;

  // current: walk back from today; an unlogged TODAY is pending,
  // not a break — start counting from yesterday in that case
  const cursor = dateFromString(todayString);
  if (!daySet.has(todayString)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (daySet.has(toDateString(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  result.current = current;

  return result;
}

// ---------------- achievements ----------------
// Every badge rewards tracking and consistency — never amounts.
// `data` is assembled by the Goals & Streaks page:
//   doseCount, weightCount, photoCount, labCount, inventoryCount,
//   scheduleCount, distinctSites, adherence, logging
export const ACHIEVEMENTS = [
  { id: "first_dose",     icon: "💉", title: "First Log",        description: "Logged your first dose",                  test: (d) => d.doseCount >= 1 },
  { id: "doses_10",       icon: "🔟", title: "Ten Down",         description: "Logged 10 doses",                         test: (d) => d.doseCount >= 10 },
  { id: "doses_50",       icon: "⭐", title: "Fifty Club",       description: "Logged 50 doses",                         test: (d) => d.doseCount >= 50 },
  { id: "doses_100",      icon: "💯", title: "Century",          description: "Logged 100 doses",                        test: (d) => d.doseCount >= 100 },
  { id: "doses_250",      icon: "🚀", title: "Veteran",          description: "Logged 250 doses",                        test: (d) => d.doseCount >= 250 },
  { id: "log_streak_7",   icon: "🔥", title: "On Fire",          description: "Logged doses 7 days in a row",            test: (d) => d.logging.best >= 7 },
  { id: "adherence_7",    icon: "🎯", title: "Locked In",        description: "Hit 7 scheduled dose days in a row",      test: (d) => d.adherence.best >= 7 },
  { id: "adherence_30",   icon: "🏆", title: "Iron Discipline",  description: "Hit 30 scheduled dose days in a row",     test: (d) => d.adherence.best >= 30 },
  { id: "adherence_90",   icon: "👑", title: "Untouchable",      description: "Hit 90 scheduled dose days in a row",     test: (d) => d.adherence.best >= 90 },
  { id: "first_weight",   icon: "⚖️", title: "Baseline",         description: "Logged your first weigh-in",              test: (d) => d.weightCount >= 1 },
  { id: "weights_10",     icon: "📈", title: "Trend Spotter",    description: "Logged 10 weigh-ins",                     test: (d) => d.weightCount >= 10 },
  { id: "first_photo",    icon: "📷", title: "Before",           description: "Added your first progress photo",         test: (d) => d.photoCount >= 1 },
  { id: "first_schedule", icon: "📅", title: "Planned Out",      description: "Saved your first schedule",               test: (d) => d.scheduleCount >= 1 },
  { id: "rotation_5",     icon: "🔄", title: "Rotation Pro",     description: "Used 5 different injection sites",        test: (d) => d.distinctSites >= 5 },
  { id: "first_lab",      icon: "🧪", title: "Data Driven",      description: "Logged your first lab result",            test: (d) => d.labCount >= 1 },
  { id: "first_inventory",icon: "📦", title: "Stocked Up",       description: "Started tracking your inventory",         test: (d) => d.inventoryCount >= 1 },
];

export function evaluateAchievements(data) {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: !!a.test(data) }));
}