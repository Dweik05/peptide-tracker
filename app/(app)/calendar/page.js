"use client";

// ============================================================
// CALENDAR (v5 — reskinned)  —  goes in:  app/(app)/calendar/page.js
// (FULL REPLACEMENT of v4.)
//
// Behavior is IDENTICAL to v4. The only changes are visual:
//   • the hardcoded inline colors (grid line, today ring, blank
//     cell, scheduled/logged chips) are retuned to the central
//     palette in globals.css — they're inline hex, so they don't
//     pick the palette up automatically and are set by hand here.
//   • the ◀ ▶ month arrows and the ✉️ email toggle became
//     cohesive line icons.
//
// As in v4, all layout-critical styles are INLINE on purpose so a
// stale Tailwind build can't break the grid. Do NOT convert them
// to Tailwind classes.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { PEPTIDES } from "../../lib/peptides";
import {
  dateFromString,
  toDateString,
  dosesDueOn,
  describeFrequency,
  doseOnDate,
} from "../../lib/schedule-helpers";
import PageTour from "../../components/PageTour";

// ---------------- icons (cohesive line set, replaces emoji) ----------------
function Icon({ name, className = "w-4 h-4" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    chevronLeft: <path d="M15 6l-6 6 6 6" />,
    chevronRight: <path d="M9 6l6 6-6 6" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// 1 = week starts Monday · 0 = week starts Sunday
const WEEK_STARTS_ON = 1;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEADER_LABELS = [0, 1, 2, 3, 4, 5, 6].map(
  (i) => DAY_LABELS[(WEEK_STARTS_ON + i) % 7]
);

// ---- inline style constants (Tailwind-independent) ----
// Colors retuned to the central palette (globals.css).
const GRID_LINE_COLOR = "#2A3431"; // slate-700 — the hairline ruling
const CELL_MIN_HEIGHT = "clamp(64px, 11vw, 96px)"; // shorter boxes on phones
const TODAY_RING = "inset 0 0 0 1px #1FB089"; // emerald-500

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 1,
  backgroundColor: GRID_LINE_COLOR,
};

const dayCellStyle = {
  minHeight: CELL_MIN_HEIGHT,
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  textAlign: "left",
};

const blankCellStyle = {
  minHeight: CELL_MIN_HEIGHT,
  backgroundColor: "rgba(19, 26, 24, 0.55)", // dimmed slate-900
};

function chipStyle(kind) {
  const base = {
    display: "block",
    width: "100%",
    fontSize: 10,
    lineHeight: 1.25,
    padding: "2px 4px",
    borderRadius: 4,
    border: "1px solid",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  if (kind === "sched") {
    return {
      ...base,
      backgroundColor: "rgba(31, 176, 137, 0.12)", // emerald-500 tint
      borderColor: "rgba(31, 176, 137, 0.25)",
      color: "#6FD9BF", // light emerald
    };
  }
  return {
    ...base,
    backgroundColor: "rgba(79, 182, 230, 0.12)", // calm sky tint
    borderColor: "rgba(79, 182, 230, 0.25)",
    color: "#8FCDEE", // light sky
  };
}

// peptide full name → short code, for compact chips ("RT · 1mg")
const SHORT_BY_NAME = {};
for (const p of PEPTIDES) SHORT_BY_NAME[p.full] = p.short;
function shortName(name) {
  return SHORT_BY_NAME[name] || name;
}

// ---------------- helpers (display only) ----------------

// Cells for one month. `null` = blank box for alignment.
function buildMonthCells(year, month) {
  const first = new Date(year, month, 1, 12);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() - WEEK_STARTS_ON + 7) % 7;

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
  // Fetched with a one-day pad on each side, then bucketed by LOCAL
  // date — so a dose logged at 11pm on the last day of the month
  // can't fall off the grid because of timezone conversion.
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

  const selectedDateObj = selectedDate ? dateFromString(selectedDate) : null;
  const selectedScheduled = selectedDateObj
    ? dosesDueOn(schedules, selectedDateObj)
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
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* ---------- guided tour of this page ---------- */}
      <PageTour
        tourKey="calendar"
        steps={[
          {
            target: '[data-tour="grid"]',
            title: "Your month at a glance",
            body: "Every day shows small chips for what's on it. Tap any day to see the full detail beside the calendar.",
          },
          {
            target: '[data-tour="legend"]',
            title: "Two kinds of chip",
            body: "Green chips are doses you're scheduled to take. Blue chips are doses you actually logged. Seeing them side by side is how you spot a missed day.",
          },
          {
            target: '[data-tour="month-nav"]',
            title: "Moving around",
            body: "Step back and forward through months to check past adherence or see what's coming. \"Today\" jumps you straight back.",
          },
          {
            target: '[data-tour="day-detail"]',
            title: "One day, in full",
            body: "The day you tapped, spelled out — what was scheduled (with the exact dose for that date if you're titrating) and what you logged, including the time.",
          },
          {
            target: '[data-tour="schedules"]',
            title: "Managing schedules",
            body: "Pause a schedule to hide it from the calendar and stop its emails without losing it, toggle email reminders per schedule, or delete one. Deleting a schedule never touches the doses you've already logged.",
          },
        ]}
      />

      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Calendar
        </h1>
        <p className="text-slate-400 mt-1">
          Your saved schedules on a month view — scheduled days vs. what you
          actually logged.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ---------- LEFT (2 cols): the month grid ---------- */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          {/* month navigation */}
          <div
            data-tour="month-nav"
            className="flex items-center justify-between mb-4"
          >
            <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 inline-flex items-center"
              >
                <Icon name="chevronLeft" className="w-4 h-4" />
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
                aria-label="Next month"
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 inline-flex items-center"
              >
                <Icon name="chevronRight" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* the wall-calendar grid — layout styles are INLINE on
              purpose (see header comment) */}
          <div
            data-tour="grid"
            className="border border-slate-700 rounded-lg"
            style={{ overflow: "hidden" }}
          >
            <div style={gridStyle}>
              {/* weekday header band */}
              {HEADER_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-slate-800 text-center text-xs font-semibold text-slate-300 py-2"
                  style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  {label}
                </div>
              ))}

              {/* day boxes */}
              {cells.map((cellDate, index) => {
                if (!cellDate) {
                  return <div key={`blank-${index}`} style={blankCellStyle} />;
                }
                const key = toDateString(cellDate);
                const scheduledHere = dosesDueOn(schedules, cellDate);
                const loggedHere = loggedMap[key] || [];
                const isToday = key === todayString;
                const isSelected = key === selectedDate;

                // chips: scheduled first (dose that applies on THIS
                // date), then logged, max 3 visible
                const chips = [
                  ...scheduledHere.map((s) => ({
                    kind: "sched",
                    text: `${shortName(s.peptide_name)} · ${doseOnDate(
                      s,
                      cellDate
                    )}${s.unit}`,
                  })),
                  ...loggedHere.map((l) => ({
                    kind: "log",
                    text: `${shortName(l.peptide_name)} · ${l.dose_amount}${l.unit}`,
                  })),
                ];
                const visibleChips = chips.slice(0, 3);
                const extraCount = chips.length - visibleChips.length;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-slate-800"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                    style={{
                      ...dayCellStyle,
                      ...(isToday ? { boxShadow: TODAY_RING } : {}),
                    }}
                  >
                    <span
                      className={`text-xs ${
                        isToday
                          ? "text-emerald-400 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {cellDate.getDate()}
                    </span>

                    {visibleChips.map((chip, chipIndex) => (
                      <span key={chipIndex} style={chipStyle(chip.kind)}>
                        {chip.text}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span
                        className="text-slate-500"
                        style={{ fontSize: 10 }}
                      >
                        +{extraCount} more
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* legend */}
          <div
            data-tour="legend"
            className="flex flex-wrap gap-4 mt-4 text-xs text-slate-400"
          >
            <span className="flex items-center gap-1.5">
              <span style={{ ...chipStyle("sched"), width: "auto" }}>Aa</span>
              Scheduled dose
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ ...chipStyle("log"), width: "auto" }}>Aa</span>
              Logged dose
            </span>
            <span className="flex items-center gap-1.5">
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  boxShadow: TODAY_RING,
                  display: "inline-block",
                }}
              />
              Today
            </span>
          </div>
        </div>

        {/* ---------- RIGHT: day detail + schedule management ---------- */}
        <div className="space-y-6">
          {/* day detail */}
          <div
            data-tour="day-detail"
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
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
                          · {doseOnDate(schedule, selectedDateObj)}{" "}
                          {schedule.unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedLogged.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "#4FB6E6" }}
                      />
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
          <div
            data-tour="schedules"
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
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
                              ? "text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 inline-flex items-center gap-1.5"
                              : "text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 inline-flex items-center gap-1.5"
                          }
                        >
                          <Icon name="mail" className="w-3.5 h-3.5" />
                          Email {schedule.email_reminders ? "on" : "off"}
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
              Pausing hides a schedule from the calendar and stops its emails —
              nothing is deleted. The email toggle controls email reminders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}