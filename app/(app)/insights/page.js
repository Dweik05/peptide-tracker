"use client";

// ============================================================
// INSIGHTS (Day 35 — adherence + trends + side effects)
//   goes in:  app/(app)/insights/page.js
//   (FULL REPLACEMENT of the Day 34 version.)
//
// This completes Insights engine v1 — three insight types on one page:
//   • ADHERENCE (Day 33) — schedule vs logged doses.
//   • TRENDS (Day 34) — weight + body-measurement movement.
//   • SIDE EFFECTS (Day 35) — for each symptom you log: how its
//     severity is trending over time, and which protocols were
//     running when it first appeared.
//
// Honest-by-design note on side effects: we deliberately do NOT do
// naive "symptom within N days of a dose" correlation. Daily protocols
// (e.g. GHK-CU, MT2) would trivially "correlate" with every symptom,
// which is misleading. Instead we report the severity TREND (not
// confounded by dose frequency) and ONSET CONTEXT (which protocols
// were active when a symptom first appeared) — framed as observation,
// with an explicit "overlap isn't cause" caveat.
//
// Date handling: dates are read straight from the database text (first
// 10 chars = the day), NOT parsed with new Date(), so everything stays
// correct on iOS Safari.
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
    trend: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l3-3 3 3 5-6" />
      </>
    ),
    ruler: (
      <>
        <path d="M16 3 3 16l5 5L21 8z" />
        <path d="M9.5 10.5l1.5 1.5M12.5 7.5l1.5 1.5M6.5 13.5l1.5 1.5" />
      </>
    ),
    pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
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

// ---------------- tiny hand-drawn sparkline (no chart library) ----------------
function Sparkline({ values }) {
  if (!values || values.length < 2) return null;
  const width = 240;
  const height = 48;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);

  const coords = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return { x, y };
  });

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const lastPoint = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[240px] h-12"
      aria-hidden="true"
    >
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill="currentColor" />
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
  // space, not a "T"). iOS Safari mis-parses that, so we read the
  // calendar date straight from the text — first 10 chars = the day.
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return dateKeyFromDate(new Date(value));
}

// iOS-safe Date for the date portion of any timestamp (used for periods).
function dateOf(value) {
  if (typeof value === "string" && value.length >= 10) {
    return new Date(`${value.slice(0, 10)}T12:00:00`);
  }
  return new Date(value);
}

// "2026-06-01" -> a Date at local noon (timezone-safe).
function parseDateOnly(str) {
  return new Date(`${str}T12:00:00`);
}

// Pretty date like "Jun 8".
function shortDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ----- weight unit conversion (lbs / kg / st), matching the dashboard -----
function toLbs(value, unit) {
  if (unit === "kg") return value * 2.20462;
  if (unit === "st") return value * 14;
  return value;
}
function fromLbs(value, unit) {
  if (unit === "kg") return value / 2.20462;
  if (unit === "st") return value / 14;
  return value;
}

// ----- measurement unit conversion (in / cm) -----
function toInches(value, unit) {
  return unit === "cm" ? value / 2.54 : value;
}
function fromInches(value, unit) {
  return unit === "cm" ? value * 2.54 : value;
}

function mean(nums) {
  if (!nums || nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// arrow for a change (no good/bad colour)
function arrowFor(change) {
  if (change <= -0.05) return "↓";
  if (change >= 0.05) return "↑";
  return "→";
}

export default function Insights() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [doses, setDoses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [weights, setWeights] = useState([]); // oldest first
  const [measurements, setMeasurements] = useState([]); // oldest first
  const [sideEffects, setSideEffects] = useState([]); // oldest first

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
        fetchWeights(session.user.id),
        fetchMeasurements(session.user.id),
        fetchSideEffects(session.user.id),
      ]);

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function fetchWeights(uid) {
    const { data } = await supabase
      .from("weight_logs")
      .select("weight, unit, logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: true });
    setWeights(data || []);
  }

  async function fetchMeasurements(uid) {
    const { data } = await supabase
      .from("body_measurements")
      .select("waist, hips, chest, arms, thighs, unit, logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: true });
    setMeasurements(data || []);
  }

  async function fetchSideEffects(uid) {
    const { data } = await supabase
      .from("side_effect_logs")
      .select("effect_name, severity, logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: true });
    setSideEffects(data || []);
  }

  // ========== ADHERENCE (Day 33) ==========

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

  const hasActive = activeSchedules.length > 0;
  const hasScored = totalScheduled > 0;

  // ========== TRENDS (Day 34) ==========

  let weightTrend = null;
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const displayUnit = last.unit || "lbs";

    const firstLbs = toLbs(parseFloat(first.weight), first.unit);
    const lastLbs = toLbs(parseFloat(last.weight), last.unit);
    const change = fromLbs(lastLbs - firstLbs, displayUnit);

    const days = Math.max(
      1,
      Math.round((dateOf(last.logged_at) - dateOf(first.logged_at)) / 86400000)
    );
    const weeks = days / 7;
    const ratePerWeek = weeks > 0 ? change / weeks : 0;

    const series = weights.map((w) =>
      fromLbs(toLbs(parseFloat(w.weight), w.unit), displayUnit)
    );

    weightTrend = {
      displayUnit,
      change,
      firstValue: fromLbs(firstLbs, displayUnit),
      lastValue: fromLbs(lastLbs, displayUnit),
      days,
      weeks,
      ratePerWeek,
      series,
    };
  }

  const measureFields = [
    { key: "waist", label: "Waist" },
    { key: "hips", label: "Hips" },
    { key: "chest", label: "Chest" },
    { key: "arms", label: "Arms" },
    { key: "thighs", label: "Thighs" },
  ];

  const measureTrends = [];
  for (const f of measureFields) {
    const points = measurements.filter(
      (m) => m[f.key] !== null && m[f.key] !== undefined && m[f.key] !== ""
    );
    if (points.length >= 2) {
      const first = points[0];
      const last = points[points.length - 1];
      const displayUnit = last.unit || "in";
      const firstIn = toInches(parseFloat(first[f.key]), first.unit);
      const lastIn = toInches(parseFloat(last[f.key]), last.unit);
      measureTrends.push({
        label: f.label,
        unit: displayUnit,
        firstValue: fromInches(firstIn, displayUnit),
        lastValue: fromInches(lastIn, displayUnit),
        change: fromInches(lastIn - firstIn, displayUnit),
      });
    }
  }

  // ========== SIDE EFFECTS (Day 35) ==========

  const effectGroups = {};
  for (const e of sideEffects) {
    const name = (e.effect_name || "").trim();
    if (!name) continue;
    if (!effectGroups[name]) effectGroups[name] = [];
    effectGroups[name].push(e);
  }

  const effectSummaries = Object.keys(effectGroups).map((name) => {
    const reports = effectGroups[name]; // ascending
    const severities = reports.map((r) => Number(r.severity) || 0);
    const count = reports.length;
    const avgSeverity = mean(severities);
    const firstDate = dateOf(reports[0].logged_at);
    const lastDate = dateOf(reports[reports.length - 1].logged_at);

    // severity trend: compare the earlier reports vs the later ones.
    // (For an odd count the middle report is skipped.) Not confounded
    // by how often a peptide is dosed.
    let trend = null;
    if (count >= 2) {
      const firstHalf = severities.slice(0, Math.floor(count / 2));
      const secondHalf = severities.slice(Math.ceil(count / 2));
      const diff = mean(secondHalf) - mean(firstHalf);
      trend = diff <= -0.5 ? "easing" : diff >= 0.5 ? "worsening" : "steady";
    }

    // protocols active on the day this symptom was FIRST logged —
    // neutral timing context, not a causal claim.
    const activeAtOnset = [];
    for (const s of activeSchedules) {
      const start = parseDateOnly(s.start_date);
      const end = parseDateOnly(s.end_date);
      if (start <= firstDate && firstDate <= end) {
        const pn = (s.peptide_name || "").trim();
        if (pn && !activeAtOnset.includes(pn)) activeAtOnset.push(pn);
      }
    }

    return { name, count, avgSeverity, firstDate, lastDate, trend, activeAtOnset };
  });

  effectSummaries.sort((a, b) => b.lastDate - a.lastDate);

  // ---------- render ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your insights...</p>
      </div>
    );
  }

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

      {/* ========== ADHERENCE ========== */}

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

      {hasActive && hasScored && (
        <>
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

      {/* ========== TRENDS ========== */}

      {/* weight trend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="trend" className="w-[18px] h-[18px] text-slate-400" />
          Weight trend
        </h2>

        {weights.length === 0 && (
          <p className="text-sm text-slate-500 mt-3">
            No weigh-ins yet. Log your weight on the{" "}
            <Link
              href="/progress"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Progress
            </Link>{" "}
            page to start tracking how it moves.
          </p>
        )}

        {weights.length === 1 && (
          <p className="text-sm text-slate-500 mt-3">
            You&apos;ve logged one weigh-in (
            <span className="text-slate-300">
              {parseFloat(weights[0].weight)} {weights[0].unit}
            </span>
            ). Log another and your weight trend will appear here — a single
            point can&apos;t show a direction yet.
          </p>
        )}

        {weightTrend && (
          <>
            <p className="text-[32px] leading-none font-semibold text-white mt-3 flex items-baseline gap-2">
              <span>{arrowFor(weightTrend.change)}</span>
              <span>{Math.abs(weightTrend.change).toFixed(1)}</span>
              <span className="text-lg font-medium text-slate-400">
                {weightTrend.displayUnit}
              </span>
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {weightTrend.firstValue.toFixed(1)} →{" "}
              {weightTrend.lastValue.toFixed(1)} {weightTrend.displayUnit} over{" "}
              {weightTrend.days} {weightTrend.days === 1 ? "day" : "days"}
              {weightTrend.weeks >= 1 && (
                <>
                  {" "}
                  · ~{Math.abs(weightTrend.ratePerWeek).toFixed(1)}{" "}
                  {weightTrend.displayUnit}/week
                </>
              )}
            </p>
            <div className="text-slate-300 mt-4">
              <Sparkline values={weightTrend.series} />
            </div>
          </>
        )}
      </div>

      {/* body measurements */}
      {measureTrends.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <Icon name="ruler" className="w-[18px] h-[18px] text-slate-400" />
            Body measurements
          </h2>
          <ul className="space-y-3">
            {measureTrends.map((m) => (
              <li
                key={m.label}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm text-white font-medium">{m.label}</span>
                <span className="text-sm text-slate-400 whitespace-nowrap">
                  {m.firstValue.toFixed(1)} → {m.lastValue.toFixed(1)} {m.unit}
                  <span className="text-slate-300 ml-2">
                    ({arrowFor(m.change)} {Math.abs(m.change).toFixed(1)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ========== SIDE EFFECTS ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="pulse" className="w-[18px] h-[18px] text-slate-400" />
          Side effects
        </h2>

        {effectSummaries.length === 0 && (
          <p className="text-sm text-slate-500 mt-3">
            No side effects logged yet. When you record symptoms on the{" "}
            <Link
              href="/side-effects"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Side Effects
            </Link>{" "}
            page, this is where you&apos;ll see how each one trends over time and
            which protocols were running when it first appeared.
          </p>
        )}

        {effectSummaries.length > 0 && (
          <>
            <ul className="space-y-4 mt-4">
              {effectSummaries.map((e) => (
                <li
                  key={e.name}
                  className="border-b border-slate-800 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white font-medium">{e.name}</p>
                    {e.trend && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {e.trend === "easing"
                          ? "↓ easing"
                          : e.trend === "worsening"
                          ? "↑ worsening"
                          : "→ steady"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {e.count} {e.count === 1 ? "report" : "reports"} · avg
                    severity {e.avgSeverity.toFixed(1)} · last{" "}
                    {shortDate(e.lastDate)}
                  </p>
                  {e.activeAtOnset.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Active when first logged:{" "}
                      <span className="text-slate-400">
                        {e.activeAtOnset.join(", ")}
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-4">
              These summarize what you&apos;ve logged. A protocol running when a
              symptom appeared isn&apos;t proof it caused it — many things affect
              how you feel.
            </p>
          </>
        )}
      </div>
    </div>
  );
}