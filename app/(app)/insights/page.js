"use client";

// ============================================================
// INSIGHTS (Day 33 — adherence)  —  goes in:  app/(app)/insights/page.js
//
// This is the first piece of the Insights engine. It answers one
// question from your own data: of the doses your active schedules
// SAID should have happened by today, how many did you actually log?
//
// How it works (plain version):
//   • Your schedules (the "reminders" table) are the PLAN. For each
//     active schedule we walk day-by-day from its start date up to
//     today and ask the shared isDoseDay() helper "was a dose due on
//     this day?" Every "yes" is one scheduled dose.
//   • Your dose_logs are WHAT ACTUALLY HAPPENED. For each scheduled
//     day we check whether you logged that peptide on that day.
//   • Adherence = doses logged ÷ doses that should have happened.
//
// We only count days up to TODAY — future scheduled doses haven't
// happened yet, so they're neither taken nor missed.
//
// Date handling note: dose dates are read straight from the database
// text (first 10 chars = the day), NOT parsed with new Date(). This
// keeps adherence correct on iOS Safari, which mis-parses the
// space-separated timestamps Postgres returns.
//
// Scope note: this view is the same for everyone right now. The
// free/premium split (basic % free, full breakdown premium) gets
// wired in later with Stripe. Nothing here is gated yet.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { isDoseDay } from "../../lib/schedule-helpers";

// ---------------- icons (same line set as the rest of the app) ----------------
function Icon({ name, className = "w-4 h-4" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alertTriangle: (
      <>
        <path d="M10.3 4.3 2.6 17.5A1.5 1.5 0 0 0 3.9 20h16.2a1.5 1.5 0 0 0 1.3-2.5L13.7 4.3a1.5 1.5 0 0 0-2.6 0z" />
        <path d="M12 9.5v4" />
        <path d="M12 17h.01" />
      </>
    ),
    arrowRight: <path d="M5 12h13M12 6l6 6-6 6" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ---------------- date helpers (local-timezone safe) ----------------

// "YYYY-MM-DD" for a Date, in the browser's local timezone.
function dateKeyFromDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyOf(value) {
  // Postgres returns timestamps like "2026-06-25 15:56:00" (note the
  // space, not a "T"). Browsers disagree on how to parse that format —
  // iOS Safari returns "Invalid Date" — so instead of building a Date
  // and risking a wrong or invalid result, we read the calendar date
  // straight from the text. The first 10 characters are always
  // "YYYY-MM-DD", which is exactly the day the dose was logged.
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return dateKeyFromDate(new Date(value));
}

// "2026-06-01" -> a Date at local noon (timezone-safe).
function parseDateOnly(str) {
  return new Date(`${str}T12:00:00`);
}

// Pretty date like "Jun 8" for the missed list.
function shortDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Insights() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [doses, setDoses] = useState([]);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      await Promise.all([
        fetchDoses(session.user.id),
        fetchSchedules(session.user.id),
      ]);

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All dose logs for this user. Schedules can run longer than 90 days,
  // so unlike the dashboard we don't date-limit here — we need the full
  // history to score every scheduled day fairly.
  async function fetchDoses(uid) {
    const { data } = await supabase
      .from("dose_logs")
      .select("peptide_name, logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });
    setDoses(data || []);
  }

  async function fetchSchedules(uid) {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", uid);
    setSchedules(data || []);
  }

  // ---------- adherence computation ----------

  // peptide name -> Set of local date keys it was logged on
  const loggedByPeptide = {};
  for (const d of doses) {
    const name = (d.peptide_name || "").trim();
    if (!name) continue;
    if (!loggedByPeptide[name]) loggedByPeptide[name] = new Set();
    loggedByPeptide[name].add(dateKeyOf(d.logged_at));
  }

  const todayNoon = new Date();
  todayNoon.setHours(12, 0, 0, 0);

  const activeSchedules = schedules.filter((s) => s.active);

  const perSchedule = [];
  const missedList = [];
  let totalScheduled = 0;
  let totalTaken = 0;
  let earliestStart = null;

  for (const s of activeSchedules) {
    const name = (s.peptide_name || "").trim();
    const start = parseDateOnly(s.start_date);
    const endRaw = parseDateOnly(s.end_date);
    const end = endRaw < todayNoon ? endRaw : todayNoon;

    if (!earliestStart || start < earliestStart) earliestStart = start;

    let scheduled = 0;
    let taken = 0;

    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      12
    );

    // The cursor <= end bound terminates the loop on its own; the guard
    // is just belt-and-suspenders against a malformed date.
    let guard = 0;
    while (cursor <= end && guard < 3650) {
      guard++;
      if (isDoseDay(s, cursor)) {
        const key = dateKeyFromDate(cursor);
        scheduled++;
        if (loggedByPeptide[name] && loggedByPeptide[name].has(key)) {
          taken++;
        } else {
          missedList.push({ peptide: name || "Unnamed", date: new Date(cursor) });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    totalScheduled += scheduled;
    totalTaken += taken;
    perSchedule.push({
      id: s.id,
      peptide: name || "Unnamed",
      scheduled,
      taken,
      pct: scheduled > 0 ? Math.round((taken / scheduled) * 100) : null,
    });
  }

  missedList.sort((a, b) => b.date - a.date);
  const recentMissed = missedList.slice(0, 5);

  const scoredSchedules = perSchedule.filter((r) => r.scheduled > 0);

  const overallPct =
    totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : null;

  // colour helpers — full class strings so Tailwind keeps them
  function textClassFor(pct) {
    if (pct === null) return "text-white";
    if (pct >= 90) return "text-emerald-400";
    if (pct >= 70) return "text-amber-400";
    return "text-red-400";
  }
  function barClassFor(pct) {
    if (pct === null) return "bg-slate-600";
    if (pct >= 90) return "bg-emerald-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-red-500";
  }
  const headlineBorder =
    overallPct === null
      ? "border-slate-800"
      : overallPct >= 90
      ? "border-emerald-500/40"
      : overallPct >= 70
      ? "border-amber-500/40"
      : "border-red-500/40";

  // ---------- render ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your insights...</p>
      </div>
    );
  }

  const hasActive = activeSchedules.length > 0;
  const hasScored = totalScheduled > 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Insights
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Patterns pulled from your own logs. These are observations, not
          medical advice.
        </p>
      </div>

      {/* no active schedules */}
      {!hasActive && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Icon name="target" className="w-[18px] h-[18px] text-slate-400" />
            Protocol adherence
          </h2>
          <p className="text-sm text-slate-500 mt-3">
            Adherence compares your saved schedule against the doses you log.
            You don&apos;t have an active schedule yet — build a protocol in the{" "}
            <Link
              href="/planner"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Planner
            </Link>{" "}
            and save it as a schedule, then your adherence will show up here.
          </p>
        </div>
      )}

      {/* schedules exist but nothing due yet */}
      {hasActive && !hasScored && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Icon name="target" className="w-[18px] h-[18px] text-slate-400" />
            Protocol adherence
          </h2>
          <p className="text-sm text-slate-500 mt-3">
            Your schedule is set, but no scheduled doses have come due yet. Once
            your first dose date passes, your adherence will appear here.
          </p>
        </div>
      )}

      {/* the real thing */}
      {hasActive && hasScored && (
        <>
          {/* headline adherence card */}
          <div className={`bg-slate-900 border rounded-xl p-6 ${headlineBorder}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Icon
                  name="target"
                  className="w-[18px] h-[18px] text-slate-400"
                />
                Protocol adherence
              </h2>
              <Link
                href="/calendar"
                className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                Open calendar <Icon name="arrowRight" className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p
              className={`text-[44px] leading-none font-semibold mt-4 ${textClassFor(
                overallPct
              )}`}
            >
              {overallPct}
              <span className="text-2xl font-medium text-slate-400">%</span>
            </p>

            <p className="text-sm text-slate-400 mt-3">
              You&apos;ve logged{" "}
              <span className="text-white font-medium">{totalTaken}</span> of{" "}
              <span className="text-white font-medium">{totalScheduled}</span>{" "}
              scheduled doses
              {earliestStart && <> since {shortDate(earliestStart)}</>}.
            </p>

            {totalScheduled < 4 && (
              <p className="text-xs text-slate-500 mt-2">
                Still early — this number gets more meaningful as more scheduled
                doses go by.
              </p>
            )}
          </div>

          {/* per-protocol breakdown */}
          {scoredSchedules.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white mb-4">
                By protocol
              </h2>
              <ul className="space-y-4">
                {scoredSchedules.map((row) => (
                  <li key={row.id}>
                    <div className="flex items-center justify-between gap-4 mb-1.5">
                      <p className="text-sm text-white font-medium">
                        {row.peptide}
                      </p>
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        {row.taken}/{row.scheduled} doses
                        {row.pct !== null && (
                          <span
                            className={`ml-2 font-medium ${textClassFor(row.pct)}`}
                          >
                            {row.pct}%
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barClassFor(row.pct)}`}
                        style={{ width: `${row.pct || 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* recently missed */}
          {recentMissed.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Icon
                  name="alertTriangle"
                  className="w-[18px] h-[18px] text-amber-400"
                />
                Recently missed
              </h2>
              <ul className="divide-y divide-slate-800">
                {recentMissed.map((m, i) => (
                  <li
                    key={i}
                    className="py-2.5 flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-slate-300">{m.peptide}</span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {shortDate(m.date)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-3">
                A scheduled dose counts as missed if nothing for that peptide was
                logged on that day.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}