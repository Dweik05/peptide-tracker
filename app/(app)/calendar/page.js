"use client";

// ============================================================
// CALENDAR  —  goes in:  app/(app)/calendar/page.js
// (NEW page — create the folder "calendar" inside app/(app)/
//  and a "page.js" inside it.)
//
// Day 20 · Chunk B: the month view your saved schedules run on.
//
//   - Month grid (Mon-first, matching the planner's day picker)
//     with ◀ ▶ navigation and a Today button
//   - ● emerald dot  = a dose is SCHEDULED that day
//     ● sky dot      = you actually LOGGED a dose that day
//     (a past day with emerald but no sky = a missed dose,
//      visible at a glance — no nagging, just the dots)
//   - Click any day → detail panel: what's scheduled, what was
//     logged (with times)
//   - "Your schedules" card: pause/resume, email on/off, delete
//
// Scheduled markers come from ACTIVE schedules only, computed
// live from the recurrence rules via app/lib/schedule-helpers.js
// (the same math the email route will use in Chunk C).
// Logged markers come from your real dose_logs history.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  dateFromString,
  toDateString,
  dosesDueOn,
  describeFrequency,
} from "../../lib/schedule-helpers";

// ---------------- helpers (display only) ----------------

// Cells for one month, Mon-first. `null` = blank alignment cell.
function buildMonthCells(year, month) {
  const first = new Date(year, month, 1, 12);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7; // Mon=0 ... Sun=6

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d, 12));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatLongDate(dateString) {
  return dateFromString(dateString).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString) {
  return dateFromString(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayString = toDateString(today);

  // which month is on screen
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0–11

  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]); // dose_logs for the visible month
  const [selectedDate, setSelectedDate] = useState(todayString);

  // ---------- load session + schedules once ----------
  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);

      const { data } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setSchedules(data || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- load logged doses whenever the month changes ----------
  // We fetch with a one-day pad on each side, then bucket by LOCAL
  // date below — so a dose logged at 11pm on the last day of the
  // month can't fall off the grid because of timezone conversion.
  useEffect(() => {
    if (!userId) return;
    async function loadLogs() {
      const monthStart = new Date(viewYear, viewMonth, 1, 12);
      const padStart = new Date(monthStart);
      padStart.setDate(padStart.getDate() - 1);
      const nextMonthStart = new Date(viewYear, viewMonth + 1, 1, 12);
      const padEnd = new Date(nextMonthStart);
      padEnd.setDate(padEnd.getDate() + 1);

      const { data } = await supabase
        .from("dose_logs")
        .select("peptide_name, dose_amount, unit, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", padStart.toISOString())
        .lt("logged_at", padEnd.toISOString())
        .order("logged_at", { ascending: true });
      setLogs(data || []);
    }
    loadLogs();
  }, [userId, viewYear, viewMonth]);

  // ---------- month navigation ----------
  function changeMonth(delta) {
    const moved = new Date(viewYear, viewMonth + delta, 1, 12);
    setViewYear(moved.getFullYear());
    setViewMonth(moved.getMonth());
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayString);
  }

  // ---------- schedule management ----------
  async function handleToggleActive(schedule) {
    const { error } = await supabase
      .from("reminders")
      .update({ active: !schedule.active })
      .eq("id", schedule.id);
    if (!error) {
      setSchedules((current) =>
        current.map((s) =>
          s.id === schedule.id ? { ...s, active: !schedule.active } : s
        )
      );
    }
  }

  async function handleToggleEmail(schedule) {
    const { error } = await supabase
      .from("reminders")
      .update({ email_reminders: !schedule.email_reminders })
      .eq("id", schedule.id);
    if (!error) {
      setSchedules((current) =>
        current.map((s) =>
          s.id === schedule.id
            ? { ...s, email_reminders: !schedule.email_reminders }
            : s
        )
      );
    }
  }

  async function handleDelete(schedule) {
    const sure = window.confirm(
      `Delete the ${schedule.peptide_name} schedule? This can't be undone. ` +
        `Your logged doses are NOT affected — only the schedule is removed.`
    );
    if (!sure) return;
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", schedule.id);
    if (!error) {
      setSchedules((current) => current.filter((s) => s.id !== schedule.id));
    }
  }

  // ---------- derived data for the grid ----------
  const cells = buildMonthCells(viewYear, viewMonth);

  // logged doses bucketed by LOCAL date string
  const loggedMap = {};
  for (const log of logs) {
    const key = toDateString(new Date(log.logged_at));
    if (!loggedMap[key]) loggedMap[key] = [];
    loggedMap[key].push(log);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  const selectedScheduled = selectedDate
    ? dosesDueOn(schedules, dateFromString(selectedDate))
    : [];
  const selectedLogged = selectedDate ? loggedMap[selectedDate] || [] : [];

  function scheduleStatus(schedule) {
    if (schedule.end_date < todayString) return "ended"; // "YYYY-MM-DD" compares safely as text
    return schedule.active ? "active" : "paused";
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading the calendar...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-slate-400 mt-1">
          Your saved schedules on a month view — scheduled days vs. what you
          actually logged.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ---------- LEFT (2 cols): the month grid ---------- */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          {/* month navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
              >
                ▶
              </button>
            </div>
          </div>

          {/* weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_HEADERS.map((label) => (
              <div
                key={label}
                className="text-center text-xs text-slate-500 py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* the days */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cellDate, index) => {
              if (!cellDate) {
                return <div key={`blank-${index}`} className="aspect-square" />;
              }
              const key = toDateString(cellDate);
              const scheduledHere = dosesDueOn(schedules, cellDate);
              const loggedHere = loggedMap[key] || [];
              const isToday = key === todayString;
              const isSelected = key === selectedDate;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/50"
                  } ${isToday ? "border border-emerald-500" : ""}`}
                >
                  <span className="text-sm">{cellDate.getDate()}</span>
                  <span className="flex gap-1 justify-center mt-1 h-1.5">
                    {scheduledHere.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                    {loggedHere.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Scheduled dose
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Logged dose
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-emerald-500" />
              Today
            </span>
          </div>
        </div>

        {/* ---------- RIGHT: day detail + schedule management ---------- */}
        <div className="space-y-6">
          {/* day detail */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              {selectedDate ? formatLongDate(selectedDate) : "Pick a day"}
            </h2>

            {selectedScheduled.length === 0 && selectedLogged.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">
                Nothing scheduled or logged this day.
              </p>
            ) : (
              <div className="space-y-4 mt-3">
                {selectedScheduled.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Scheduled
                    </p>
                    <ul className="space-y-2">
                      {selectedScheduled.map((schedule) => (
                        <li
                          key={schedule.id}
                          className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
                        >
                          <span className="text-white">
                            {schedule.peptide_name}
                          </span>{" "}
                          · {schedule.dose_amount} {schedule.unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedLogged.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      Logged
                    </p>
                    <ul className="space-y-2">
                      {selectedLogged.map((log, index) => (
                        <li
                          key={index}
                          className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
                        >
                          <span className="text-white">{log.peptide_name}</span>{" "}
                          · {log.dose_amount} {log.unit}
                          <span className="text-slate-500">
                            {" "}
                            at {formatTime(log.logged_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* schedule management */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              Your schedules
            </h2>

            {schedules.length === 0 ? (
              <p className="text-sm text-slate-500">
                No schedules yet — build a protocol in the{" "}
                <Link
                  href="/planner"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Planner
                </Link>{" "}
                and hit "Save schedule".
              </p>
            ) : (
              <ul className="space-y-3">
                {schedules.map((schedule) => {
                  const status = scheduleStatus(schedule);
                  return (
                    <li
                      key={schedule.id}
                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-white">
                            {schedule.peptide_name}{" "}
                            <span className="text-slate-400">
                              · {schedule.dose_amount} {schedule.unit}
                            </span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {describeFrequency(schedule)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatShortDate(schedule.start_date)} →{" "}
                            {formatShortDate(schedule.end_date)}
                          </p>
                        </div>
                        <span
                          className={
                            status === "active"
                              ? "text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : status === "paused"
                              ? "text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                              : "text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-500"
                          }
                        >
                          {status === "active"
                            ? "Active"
                            : status === "paused"
                            ? "Paused"
                            : "Ended"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(schedule)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                        >
                          {schedule.active ? "Pause" : "Resume"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEmail(schedule)}
                          className={
                            schedule.email_reminders
                              ? "text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                          }
                        >
                          ✉️ Email {schedule.email_reminders ? "on" : "off"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(schedule)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-xs text-slate-500 mt-4">
              Pausing hides a schedule from the calendar and (soon) stops its
              emails — nothing is deleted. The ✉️ toggle controls email
              reminders, which go live in the next chunk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}