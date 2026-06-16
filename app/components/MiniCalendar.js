"use client";

// ============================================================
// MINI CALENDAR  —  goes in:  app/components/MiniCalendar.js
//
// Day 23: a compact, read-only month grid. It's deliberately
// "dumb" — you hand it the dates to dot and it renders them, so
// the SAME component works on the dashboard (this month's
// schedule) and in the planner (the protocol you're building).
//
// Props:
//   scheduledDates : array of "YYYY-MM-DD" → emerald dot
//   loggedDates    : array of "YYYY-MM-DD" → sky dot (optional)
//   initialMonth   : a Date to open on (default: today's month)
//   weekStartsOn   : 1 = Monday (default), 0 = Sunday
//
// Layout-critical styles are INLINE on purpose (same reasoning
// as the full Calendar page — a stale Tailwind build can't break
// the grid). No outer card here: drop it inside a card in the
// parent and give it a heading there.
//
// NOTE: the colors below are hardcoded hex values (not Tailwind
// classes), so they don't pick up the central palette in
// globals.css automatically. They're set by hand to match it.
// ============================================================

import { useState } from "react";
import { toDateString } from "../lib/schedule-helpers";

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"]; // index = getDay()

const GRID_LINE = "#1F2926"; // border (matches new --color-slate-800)
const CELL_MIN_HEIGHT = "clamp(30px, 6vw, 40px)";
const TODAY_RING = "inset 0 0 0 1px #1FB089"; // accent (matches new --color-emerald-500)

function buildCells(year, month, weekStartsOn) {
  const first = new Date(year, month, 1, 12);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() - weekStartsOn + 7) % 7;
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function MiniCalendar({
  scheduledDates = [],
  loggedDates = [],
  initialMonth = null,
  weekStartsOn = 1,
}) {
  const today = new Date();
  const base = initialMonth || today;
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  const scheduledSet = new Set(scheduledDates);
  const loggedSet = new Set(loggedDates);
  const todayStr = toDateString(today);
  const showLoggedLegend = loggedDates && loggedDates.length > 0;

  const headers = [0, 1, 2, 3, 4, 5, 6].map(
    (i) => DAY_INITIALS[(weekStartsOn + i) % 7]
  );
  const cells = buildCells(viewYear, viewMonth, weekStartsOn);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" }
  );

  function changeMonth(delta) {
    const m = new Date(viewYear, viewMonth + delta, 1, 12);
    setViewYear(m.getFullYear());
    setViewMonth(m.getMonth());
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 1,
    backgroundColor: GRID_LINE,
    border: `1px solid ${GRID_LINE}`,
    borderRadius: 8,
    overflow: "hidden",
  };

  const cellBase = {
    minHeight: CELL_MIN_HEIGHT,
    backgroundColor: "#131A18", // card surface (matches new --color-slate-900)
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  };

  return (
    <div>
      {/* month nav */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{monthLabel}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700"
          >
            ▶
          </button>
        </div>
      </div>

      {/* weekday initials */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          marginBottom: 4,
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            className="text-center text-slate-500"
            style={{ fontSize: 10 }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* the grid */}
      <div style={gridStyle}>
        {cells.map((cellDate, index) => {
          if (!cellDate) {
            return (
              <div
                key={`blank-${index}`}
                style={{ ...cellBase, backgroundColor: "rgba(19,26,24,0.5)" }}
              />
            );
          }
          const key = toDateString(cellDate);
          const isToday = key === todayStr;
          const scheduled = scheduledSet.has(key);
          const logged = loggedSet.has(key);

          return (
            <div
              key={key}
              style={{
                ...cellBase,
                ...(isToday ? { boxShadow: TODAY_RING } : {}),
              }}
            >
              <span
                className={isToday ? "text-emerald-400" : "text-slate-400"}
                style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}
              >
                {cellDate.getDate()}
              </span>
              <span style={{ display: "flex", gap: 2, height: 5 }}>
                {scheduled && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "#4FD6B4", // scheduled (matches new --color-emerald-400)
                    }}
                  />
                )}
                {logged && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "#4FB6E6", // logged (calm sky)
                    }}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3 mt-2" style={{ fontSize: 10 }}>
        <span className="flex items-center gap-1 text-slate-400">
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: "#4FD6B4",
              display: "inline-block",
            }}
          />
          Scheduled
        </span>
        {showLoggedLegend && (
          <span className="flex items-center gap-1 text-slate-400">
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: "#4FB6E6",
                display: "inline-block",
              }}
            />
            Logged
          </span>
        )}
      </div>
    </div>
  );
}