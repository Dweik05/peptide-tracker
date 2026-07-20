"use client";

// ============================================================
// INSIGHTS (Day 35b — adherence + cost + trends + side effects)
//   goes in:  app/(app)/insights/page.js
//   (FULL REPLACEMENT of the Day 35 version.)
//
// New in 35b: COST & SPEND (reads the inventory table) — total
// invested, monthly burn at current usage, and per-peptide cost per
// mg, cost per dose, and a RUNWAY ("how long this vial lasts").
//
// Runway is a forward simulation: we walk future dose days using
// isDoseDay + doseOnDate (titration-aware), subtracting each dose
// from the remaining amount until it hits zero. That's why a ramping
// protocol like Retatrutide gets a correct answer instead of a naive
// "remaining / current dose" estimate that ignores the ramp.
//
// Premium note: Cost & Spend is a premium-tier insight (gated later
// with Stripe). Not gated yet.
//
// Date handling stays iOS-safe (date read from text, not new Date()).
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { isDoseDay, doseOnDate } from "../../lib/schedule-helpers";
import PageTour from "../../components/PageTour";

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
    vial: (
      <>
        <path d="M9 3h6" />
        <path d="M10 3v6.2L5.6 17a2 2 0 0 0 1.8 3h9.2a2 2 0 0 0 1.8-3L14 9.2V3" />
        <path d="M7.5 14h9" />
      </>
    ),
    coin: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
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
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    rotate: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
    wave: (
      <path d="M2 12c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4 2-4 4-4" />
    ),
    plateau: (
      <>
        <path d="M3 12h18" />
        <circle cx="6" cy="12" r="1.5" />
        <circle cx="18" cy="12" r="1.5" />
      </>
    ),
    percent: (
      <>
        <path d="M19 5 5 19" />
        <circle cx="7.5" cy="7.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </>
    ),
    ratio: (
      <>
        <rect x="3" y="6" width="18" height="4" rx="1" />
        <rect x="3" y="14" width="11" height="4" rx="1" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21V4" />
        <path d="M5 4h11l-1.6 3.5L16 11H5" />
      </>
    ),
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

// ---- adherence × outcomes timeline (hand-drawn SVG, no chart lib) ----
// Plots weight over time with protocol-start markers; each weigh-in dot is
// colored by how consistent the stretch leading up to it was. Descriptive
// only — it makes no causal claim.
function OutcomeTimeline({ points, markers }) {
  if (!points || points.length < 2) return null;
  const W = 320;
  const H = 150;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 26;

  const times = points.map((p) => p.date.getTime());
  const minX = Math.min(...times);
  const maxX = Math.max(...times);
  const rangeX = maxX - minX || 1;

  const vals = points.map((p) => p.value);
  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const rangeV = maxV - minV;

  const px = (t) => padL + ((t - minX) / rangeX) * (W - padL - padR);
  const py = (v) => padT + (1 - (v - minV) / rangeV) * (H - padT - padB);

  const linePts = points
    .map((p) => `${px(p.date.getTime()).toFixed(1)},${py(p.value).toFixed(1)}`)
    .join(" ");

  function dotColor(adh) {
    if (adh == null) return "#94a3b8"; // slate-400 (nothing to score yet)
    if (adh >= 90) return "#10b981"; // emerald-500
    if (adh >= 70) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  }

  const baseY = H - padB;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-[420px] h-auto"
      aria-hidden="true"
    >
      {markers.map((m, i) => {
        const t = m.date.getTime();
        if (t < minX || t > maxX) return null;
        const x = px(t);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={padT}
              x2={x}
              y2={baseY}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={x} cy={padT} r="2" fill="#334155" />
          </g>
        );
      })}

      <line
        x1={padL}
        y1={baseY}
        x2={W - padR}
        y2={baseY}
        stroke="#1e293b"
        strokeWidth="1"
      />

      <polyline
        points={linePts}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={px(p.date.getTime())}
          cy={py(p.value)}
          r="3.5"
          fill={dotColor(p.adherence)}
        />
      ))}

      <text x="2" y={py(maxV) + 3} fontSize="9" fill="#64748b">
        {maxV.toFixed(0)}
      </text>
      <text x="2" y={py(minV) + 3} fontSize="9" fill="#64748b">
        {minV.toFixed(0)}
      </text>

      <text x={padL} y={H - 8} fontSize="9" fill="#64748b">
        {shortDate(points[0].date)}
      </text>
      <text
        x={W - padR}
        y={H - 8}
        fontSize="9"
        fill="#64748b"
        textAnchor="end"
      >
        {shortDate(points[points.length - 1].date)}
      </text>
    </svg>
  );
}

// ---------------- date helpers (local-timezone safe) ----------------

function dateKeyFromDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyOf(value) {
  // Postgres timestamps come back as "2026-06-25 15:56:00" (space, not
  // "T"). iOS Safari mis-parses that, so read the date from the text.
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return dateKeyFromDate(new Date(value));
}

function dateOf(value) {
  if (typeof value === "string" && value.length >= 10) {
    return new Date(`${value.slice(0, 10)}T12:00:00`);
  }
  return new Date(value);
}

function parseDateOnly(str) {
  return new Date(`${str}T12:00:00`);
}

function shortDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function midDate(d) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ----- weight unit conversion (lbs / kg / st) -----
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

function arrowFor(change) {
  if (change <= -0.05) return "↓";
  if (change >= 0.05) return "↑";
  return "→";
}

// ----- money formatting -----
function fmtMoney(v) {
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? `$${r}` : `$${r.toFixed(2)}`;
}
function fmtPerUnit(v) {
  // small unit costs get an extra digit so they don't round to $0.00
  return v >= 0.1 ? `$${v.toFixed(2)}` : `$${v.toFixed(3)}`;
}

// average daily usage of a schedule over its whole date range, walking
// day-by-day so titration phases are counted (e.g. Reta's 2->4->6->8 mg
// ramp). Used for both runway and monthly burn.
function scheduleDailyUsage(s) {
  const start = parseDateOnly(s.start_date);
  const end = parseDateOnly(s.end_date);
  const startNoon = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    12
  );
  const endNoon = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
  const days = Math.max(1, Math.round((endNoon - startNoon) / 86400000) + 1);
  let total = 0;
  const cur = new Date(startNoon);
  let guard = 0;
  while (cur <= endNoon && guard < 3650) {
    guard++;
    if (isDoseDay(s, cur)) total += Number(doseOnDate(s, cur)) || 0;
    cur.setDate(cur.getDate() + 1);
  }
  return days > 0 ? total / days : 0;
}

export default function Insights() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [doses, setDoses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [weights, setWeights] = useState([]); // oldest first
  const [measurements, setMeasurements] = useState([]); // oldest first
  const [sideEffects, setSideEffects] = useState([]); // oldest first
  const [inventory, setInventory] = useState([]);
  const [goals, setGoals] = useState([]); // oldest first
  const [labs, setLabs] = useState([]); // oldest first

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
        fetchInventory(session.user.id),
        fetchGoals(session.user.id),
        fetchLabs(session.user.id),
      ]);

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDoses(uid) {
    const { data } = await supabase
      .from("dose_logs")
      .select("peptide_name, dose_amount, unit, injection_site, logged_at")
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

  async function fetchInventory(uid) {
    const { data } = await supabase
      .from("inventory")
      .select(
        "peptide_name, cost, quantity_total, quantity_remaining, unit, item_type"
      )
      .eq("user_id", uid);
    setInventory(data || []);
  }

  async function fetchGoals(uid) {
    const { data } = await supabase
      .from("goals")
      .select(
        "id, goal_type, title, target_value, unit, start_value, target_date, completed_at"
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    setGoals(data || []);
  }

  async function fetchLabs(uid) {
    const { data } = await supabase
      .from("lab_results")
      .select("biomarker, value, unit, tested_at, created_at")
      .eq("user_id", uid)
      .order("tested_at", { ascending: true })
      .order("created_at", { ascending: true });
    setLabs(data || []);
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

  // ========== COST & SPEND (Day 35b) ==========

  const costItems = inventory.map((item) => {
    const cost = parseFloat(item.cost);
    const qtyTotal = parseFloat(item.quantity_total);
    const remaining = parseFloat(item.quantity_remaining);
    const itemUnit = item.unit || "";
    const hasCost = !isNaN(cost) && cost > 0;
    const costPerUnit = hasCost && qtyTotal > 0 ? cost / qtyTotal : null;

    // active schedules for this peptide, in a matching unit (so the mg
    // we subtract from inventory matches the mg the schedule doses)
    const matches = activeSchedules.filter(
      (s) =>
        (s.peptide_name || "").trim() === (item.peptide_name || "").trim() &&
        (s.unit || "") === itemUnit
    );

    // current scheduled dose (titration-aware) for cost-per-dose
    let currentDose = null;
    if (matches.length > 0) {
      currentDose = Number(doseOnDate(matches[0], todayNoon)) || null;
    }
    const costPerDose =
      costPerUnit != null && currentDose ? costPerUnit * currentDose : null;

    // average daily usage across the whole schedule (titration ramps
    // included), summed if a peptide has more than one schedule.
    let dailyUsage = 0;
    for (const s of matches) dailyUsage += scheduleDailyUsage(s);

    const monthlyBurn =
      costPerUnit != null && dailyUsage > 0
        ? costPerUnit * dailyUsage * 30.44
        : null;

    // runway = how long the remaining amount lasts at that usage rate
    let runwayText = null;
    let runwayLow = false;
    if (dailyUsage > 0) {
      if (!(remaining > 0)) {
        runwayText = "Out of stock";
        runwayLow = true;
      } else {
        const days = remaining / dailyUsage;
        if (days < 60) {
          runwayText = `~${Math.round(days)} days of supply`;
          runwayLow = days < 21;
        } else if (days <= 730) {
          runwayText = `~${Math.round(days / 30.44)} months of supply`;
        } else {
          runwayText = "2+ years of supply";
        }
      }
    }

    return {
      name: item.peptide_name || "Item",
      unit: itemUnit,
      cost: hasCost ? cost : null,
      remaining,
      costPerUnit,
      costPerDose,
      monthlyBurn,
      runwayText,
      runwayLow,
    };
  });

  const totalInvested = costItems.reduce((sum, c) => sum + (c.cost || 0), 0);
  const totalMonthlyBurn = costItems.reduce(
    (sum, c) => sum + (c.monthlyBurn || 0),
    0
  );
  const hasAnyCost = costItems.some((c) => c.cost != null);

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
    const reports = effectGroups[name];
    const severities = reports.map((r) => Number(r.severity) || 0);
    const count = reports.length;
    const avgSeverity = mean(severities);
    const firstDate = dateOf(reports[0].logged_at);
    const lastDate = dateOf(reports[reports.length - 1].logged_at);

    let trend = null;
    if (count >= 2) {
      const firstHalf = severities.slice(0, Math.floor(count / 2));
      const secondHalf = severities.slice(Math.ceil(count / 2));
      const diff = mean(secondHalf) - mean(firstHalf);
      trend = diff <= -0.5 ? "easing" : diff >= 0.5 ? "worsening" : "steady";
    }

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

  // ========== GOAL PROJECTION (Day 35c) ==========
  // Weight goals project from your weigh-in history. Progress is measured
  // against the goal's own start_value; pace is measured from your logged
  // weights (needs >= 2). Direction (lose vs gain) is inferred from
  // start_value vs target_value, so both work.

  function latestWeightIn(unit) {
    if (weights.length === 0) return null;
    const w = weights[weights.length - 1];
    return fromLbs(toLbs(parseFloat(w.weight), w.unit), unit);
  }

  function weightRatePerWeek(unit) {
    if (weights.length < 2) return null;
    const first = weights[0];
    const last = weights[weights.length - 1];
    const firstVal = fromLbs(toLbs(parseFloat(first.weight), first.unit), unit);
    const lastVal = fromLbs(toLbs(parseFloat(last.weight), last.unit), unit);
    const days = Math.max(
      1,
      Math.round((dateOf(last.logged_at) - dateOf(first.logged_at)) / 86400000)
    );
    const weeks = days / 7;
    return weeks > 0 ? (lastVal - firstVal) / weeks : null;
  }

  const activeGoals = goals.filter((g) => !g.completed_at);

  const goalCards = activeGoals.map((g) => {
    const unit = g.unit || "lbs";
    const target = g.target_value != null ? parseFloat(g.target_value) : null;
    const start = g.start_value != null ? parseFloat(g.start_value) : null;
    const targetDate = g.target_date ? parseDateOnly(g.target_date) : null;

    const isWeight = (g.goal_type || "").toLowerCase() === "weight";
    const current = isWeight ? latestWeightIn(unit) : null;

    // progress vs the goal's own start -> target (can be <0 or >100)
    let progressPct = null;
    if (current != null && start != null && target != null && target !== start) {
      progressPct = ((current - start) / (target - start)) * 100;
    }
    const reached = progressPct != null && progressPct >= 100;

    // amount still to go
    let remaining = null;
    if (current != null && target != null) {
      remaining = Math.abs(target - current);
    }

    // projection from measured pace
    let projection = null;
    if (isWeight && target != null && current != null && !reached) {
      const rate = weightRatePerWeek(unit); // signed, per week
      if (rate == null) {
        projection = { type: "need-data" };
      } else {
        const needed = target - current; // signed direction we must move
        const movingToward =
          (needed < 0 && rate < 0) || (needed > 0 && rate > 0);
        if (!movingToward || rate === 0) {
          projection = { type: "wrong-way" };
        } else {
          const daysToTarget = (needed / rate) * 7; // positive
          const projDate = new Date(todayNoon);
          projDate.setDate(projDate.getDate() + Math.round(daysToTarget));
          let onTrack = null;
          let daysVsTarget = null;
          if (targetDate) {
            daysVsTarget = Math.round((projDate - targetDate) / 86400000);
            onTrack = projDate <= targetDate;
          }
          projection = {
            type: "date",
            date: projDate,
            ratePerWeek: rate,
            onTrack,
            daysVsTarget,
          };
        }
      }
    }

    let daysToDeadline = null;
    if (targetDate) {
      daysToDeadline = Math.round((targetDate - todayNoon) / 86400000);
    }

    return {
      id: g.id,
      title: g.title,
      isWeight,
      unit,
      target,
      start,
      current,
      targetDate,
      daysToDeadline,
      progressPct,
      reached,
      remaining,
      projection,
    };
  });

  const hasGoals = activeGoals.length > 0;

  // ========== ADHERENCE × OUTCOMES (Day 35d) ==========
  // The flagship — built to describe, not to claim cause. It produces a
  // timeline of weight with protocol-start markers and consistency-colored
  // dots, plus a guarded read that (1) stays silent under a minimum sample,
  // (2) stays silent without enough adherence variation to contrast, and
  // (3) never implies the protocol caused the result.

  const outcomeUnit =
    weights.length > 0 ? weights[weights.length - 1].unit || "lbs" : "lbs";

  const weighPoints = weights.map((w) => ({
    date: dateOf(w.logged_at),
    dateKey: dateKeyOf(w.logged_at),
    value: fromLbs(toLbs(parseFloat(w.weight), w.unit), outcomeUnit),
    adherence: null, // filled per interval below
  }));

  const outcomeMarkers = activeSchedules.map((s) => ({
    date: parseDateOnly(s.start_date),
    label: (s.peptide_name || "").trim() || "Protocol",
  }));

  // intervals between consecutive weigh-ins, each scored for adherence the
  // same way the headline number is (per scheduled peptide-day)
  const outcomeIntervals = [];
  for (let i = 0; i < weighPoints.length - 1; i++) {
    const a = weighPoints[i];
    const b = weighPoints[i + 1];
    const days = Math.max(1, Math.round((b.date - a.date) / 86400000));
    if (days < 2 || days > 31) continue;

    let scheduled = 0;
    let taken = 0;
    for (const s of activeSchedules) {
      const name = (s.peptide_name || "").trim();
      const cur = new Date(a.date);
      cur.setHours(12, 0, 0, 0);
      cur.setDate(cur.getDate() + 1);
      let guard = 0;
      while (cur <= b.date && guard < 400) {
        guard++;
        if (isDoseDay(s, cur)) {
          scheduled++;
          const key = dateKeyFromDate(cur);
          if (loggedByPeptide[name] && loggedByPeptide[name].has(key)) taken++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    const adherence =
      scheduled > 0 ? Math.round((taken / scheduled) * 100) : null;
    const changePerWeek = (b.value - a.value) / (days / 7);

    if (adherence != null) weighPoints[i + 1].adherence = adherence;

    outcomeIntervals.push({
      fromKey: a.dateKey,
      toKey: b.dateKey,
      days,
      scheduled,
      taken,
      adherence,
      changePerWeek,
    });
  }

  const scoredOutcome = outcomeIntervals.filter((iv) => iv.adherence != null);

  const OUTCOME_MIN_PAIRS = 5;
  let outcomeRead = null; // { type: 'few' | 'flat' | 'assoc', ... }
  if (weighPoints.length >= 2) {
    if (scoredOutcome.length < OUTCOME_MIN_PAIRS) {
      outcomeRead = {
        type: "few",
        have: scoredOutcome.length,
        need: OUTCOME_MIN_PAIRS,
      };
    } else {
      const sortedAdh = scoredOutcome
        .map((iv) => iv.adherence)
        .slice()
        .sort((x, y) => x - y);
      const medianAdh = sortedAdh[Math.floor(sortedAdh.length / 2)];
      const high = scoredOutcome.filter((iv) => iv.adherence >= medianAdh);
      const low = scoredOutcome.filter((iv) => iv.adherence < medianAdh);
      if (high.length < 2 || low.length < 2) {
        outcomeRead = { type: "flat", n: scoredOutcome.length };
      } else {
        const meanHigh = mean(high.map((iv) => iv.changePerWeek));
        const meanLow = mean(low.map((iv) => iv.changePerWeek));
        outcomeRead = {
          type: "assoc",
          meanHigh,
          meanLow,
          diff: meanHigh - meanLow,
          n: scoredOutcome.length,
          unit: outcomeUnit,
        };
      }
    }
  }

  const hasOutcomeChart = weighPoints.length >= 2;
  const hasAnyWeighForOutcome = weighPoints.length > 0;

  // ========== LAB / BIOMARKER TRENDS (Day 35e) ==========
  // Per-marker movement between tests, shown neutrally (no good/bad coloring
  // and no "out of range" judgment — the table stores no reference range and
  // hardcoding medical ranges would be unreliable). Readings arrive sorted
  // oldest -> newest (tested_at, then created_at for same-day entries).

  const labGroups = {};
  for (const r of labs) {
    const name = (r.biomarker || "").trim();
    if (!name) continue;
    if (!labGroups[name]) labGroups[name] = [];
    labGroups[name].push(r);
  }

  const labSummaries = Object.keys(labGroups).map((name) => {
    const readings = labGroups[name];
    const first = readings[0];
    const last = readings[readings.length - 1];
    const firstVal = parseFloat(first.value);
    const lastVal = parseFloat(last.value);
    const firstDate = dateOf(first.tested_at);
    const lastDate = dateOf(last.tested_at);
    const sameDate = dateKeyOf(first.tested_at) === dateKeyOf(last.tested_at);
    const series = readings.map((r) => parseFloat(r.value));
    return {
      name,
      unit: last.unit || first.unit || "",
      count: readings.length,
      latestValue: lastVal,
      firstValue: firstVal,
      change: lastVal - firstVal,
      firstDate,
      lastDate,
      sameDate,
      series,
    };
  });

  // most recently tested first
  labSummaries.sort((a, b) => b.lastDate - a.lastDate);

  const hasLabs = labSummaries.length > 0;

  // ========== INJECTION-SITE ROTATION (Day 35f) ==========
  // doses arrive newest-first. Count recent site usage and detect a run of
  // the same site at the most-recent end (a sign of not rotating).
  const sitedDoses = doses.filter((d) => (d.injection_site || "").trim());
  const recentSited = sitedDoses.slice(0, 12);
  const siteCounts = {};
  for (const d of recentSited) {
    const site = d.injection_site.trim();
    siteCounts[site] = (siteCounts[site] || 0) + 1;
  }
  const siteCountList = Object.keys(siteCounts)
    .map((s) => ({ site: s, count: siteCounts[s] }))
    .sort((a, b) => b.count - a.count);

  let consecutiveRepeat = 0;
  let repeatSite = null;
  if (sitedDoses.length > 0) {
    repeatSite = sitedDoses[0].injection_site.trim();
    for (const d of sitedDoses) {
      if (d.injection_site.trim() === repeatSite) consecutiveRepeat++;
      else break;
    }
  }
  const distinctSites = siteCountList.length;
  const hasSites = sitedDoses.length > 0;
  const rotationFlag = consecutiveRepeat >= 3;

  // ========== DOSE TIMING (Day 35f) ==========
  // hour read straight from the timestamp text (iOS-safe, no Date parsing)
  function hourOf(value) {
    if (typeof value === "string" && value.length >= 13) {
      const h = parseInt(value.slice(11, 13), 10);
      return isNaN(h) ? null : h;
    }
    return null;
  }
  function partOfDay(h) {
    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 22) return "evening";
    return "night";
  }
  const doseHours = doses
    .map((d) => hourOf(d.logged_at))
    .filter((h) => h !== null);
  const partCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const h of doseHours) partCounts[partOfDay(h)]++;

  const hasTiming = doseHours.length >= 3;
  let typicalPart = null;
  let medianHourLabel = null;
  let timingConsistent = false;
  if (hasTiming) {
    typicalPart = Object.keys(partCounts).reduce((a, b) =>
      partCounts[b] > partCounts[a] ? b : a
    );
    const sortedH = doseHours.slice().sort((a, b) => a - b);
    const medH = sortedH[Math.floor(sortedH.length / 2)];
    const ampm = medH < 12 ? "AM" : "PM";
    let h12 = medH % 12;
    if (h12 === 0) h12 = 12;
    medianHourLabel = `${h12}:00 ${ampm}`;
    timingConsistent = partCounts[typicalPart] / doseHours.length >= 0.7;
  }

  // ========== SIDE-EFFECT SEVERITY vs DOSE (Day 35f) ==========
  // Side effects aren't tagged with a peptide, so a report is only tied to a
  // dose when exactly one peptide was dosed that day. Then severity at higher
  // vs lower doses of that peptide is compared. Deliberately conservative.
  const dosesByDay = {};
  for (const d of doses) {
    const amt = parseFloat(d.dose_amount);
    if (isNaN(amt)) continue;
    const key = dateKeyOf(d.logged_at);
    if (!dosesByDay[key]) dosesByDay[key] = [];
    dosesByDay[key].push({ peptide: (d.peptide_name || "").trim(), amount: amt });
  }

  const severityDosePairs = [];
  for (const e of sideEffects) {
    const key = dateKeyOf(e.logged_at);
    const dayDoses = dosesByDay[key];
    if (!dayDoses || dayDoses.length === 0) continue;
    const peptides = [...new Set(dayDoses.map((x) => x.peptide))];
    if (peptides.length !== 1) continue; // ambiguous attribution -> skip
    const amount = Math.max(...dayDoses.map((x) => x.amount));
    severityDosePairs.push({
      peptide: peptides[0],
      amount,
      severity: Number(e.severity) || 0,
    });
  }

  const sevByPeptide = {};
  for (const p of severityDosePairs) {
    if (!sevByPeptide[p.peptide]) sevByPeptide[p.peptide] = [];
    sevByPeptide[p.peptide].push(p);
  }
  const severityDoseReads = [];
  for (const peptide of Object.keys(sevByPeptide)) {
    const arr = sevByPeptide[peptide];
    const amounts = [...new Set(arr.map((x) => x.amount))];
    if (arr.length < 4 || amounts.length < 2) continue;
    const sortedAmt = arr
      .map((x) => x.amount)
      .slice()
      .sort((a, b) => a - b);
    const medAmt = sortedAmt[Math.floor(sortedAmt.length / 2)];
    const hi = arr.filter((x) => x.amount >= medAmt);
    const lo = arr.filter((x) => x.amount < medAmt);
    if (hi.length < 2 || lo.length < 2) continue;
    severityDoseReads.push({
      peptide,
      n: arr.length,
      meanHiSeverity: mean(hi.map((x) => x.severity)),
      meanLoSeverity: mean(lo.map((x) => x.severity)),
    });
  }
  const hasSeverityDose = severityDoseReads.length > 0;
  const hasAnySideEffectsForDose = sideEffects.length > 0;

  // ========== WEEKLY-SMOOTHED WEIGHT RATE (Day 35f Pass 2) ==========
  // Bucket weigh-ins into 7-day windows from the first weigh-in, average each
  // week, then take the rate between weekly averages — this smooths out daily
  // water/food noise that the raw first→latest rate is sensitive to.
  const smoothUnit =
    weights.length > 0 ? weights[weights.length - 1].unit || "lbs" : "lbs";
  let weeklyAvgPoints = [];
  if (weights.length > 0) {
    const firstDate = dateOf(weights[0].logged_at);
    const buckets = {};
    for (const w of weights) {
      const wd = dateOf(w.logged_at);
      const weekIdx = Math.floor((wd - firstDate) / (7 * 86400000));
      if (!buckets[weekIdx]) buckets[weekIdx] = [];
      buckets[weekIdx].push(
        fromLbs(toLbs(parseFloat(w.weight), w.unit), smoothUnit)
      );
    }
    weeklyAvgPoints = Object.keys(buckets)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b)
      .map((idx) => ({ weekIndex: idx, avg: mean(buckets[idx]) }));
  }
  let smoothedRate = null;
  if (weeklyAvgPoints.length >= 2) {
    const f = weeklyAvgPoints[0];
    const l = weeklyAvgPoints[weeklyAvgPoints.length - 1];
    const weeksBetween = l.weekIndex - f.weekIndex;
    smoothedRate = weeksBetween > 0 ? (l.avg - f.avg) / weeksBetween : null;
  }
  const smoothedSeries = weeklyAvgPoints.map((p) => p.avg);
  const hasSmoothed = smoothedRate !== null;

  // ========== PLATEAU DETECTION (Day 35f Pass 2) ==========
  // Over a recent window, is weight essentially flat? Uses a % -of-bodyweight
  // threshold so it's unit-agnostic, and needs enough recent readings to judge.
  let plateau = null; // { type: 'plateau' | 'moving', ... }
  if (weights.length >= 3) {
    const latest = weights[weights.length - 1];
    const latestDate = dateOf(latest.logged_at);
    const windowStart = new Date(latestDate);
    windowStart.setDate(windowStart.getDate() - 28);
    const inWindow = weights.filter((w) => dateOf(w.logged_at) >= windowStart);
    if (inWindow.length >= 3) {
      const wf = inWindow[0];
      const wl = inWindow[inWindow.length - 1];
      const unit = wl.unit || "lbs";
      const vals = inWindow.map((w) =>
        fromLbs(toLbs(parseFloat(w.weight), w.unit), unit)
      );
      const fVal = fromLbs(toLbs(parseFloat(wf.weight), wf.unit), unit);
      const lVal = fromLbs(toLbs(parseFloat(wl.weight), wl.unit), unit);
      const days = Math.max(
        1,
        Math.round((dateOf(wl.logged_at) - dateOf(wf.logged_at)) / 86400000)
      );
      if (days >= 10 && lVal > 0) {
        const ratePerWeek = (lVal - fVal) / (days / 7);
        const pctPerWeek = (Math.abs(ratePerWeek) / lVal) * 100;
        const weeks = days / 7;
        if (pctPerWeek < 0.3) {
          plateau = {
            type: "plateau",
            weeks,
            unit,
            rangeLow: Math.min(...vals),
            rangeHigh: Math.max(...vals),
          };
        } else {
          plateau = { type: "moving", ratePerWeek, unit, weeks };
        }
      }
    }
  }
  const hasPlateauData = plateau !== null;

  // ========== BODY-FAT TREND (Day 35f Pass 2) ==========
  const bfReadings = weights.filter(
    (w) =>
      w.body_fat_percentage !== null &&
      w.body_fat_percentage !== undefined &&
      w.body_fat_percentage !== ""
  );
  let bodyFatTrend = null;
  if (bfReadings.length >= 2) {
    const f = bfReadings[0];
    const l = bfReadings[bfReadings.length - 1];
    const fVal = parseFloat(f.body_fat_percentage);
    const lVal = parseFloat(l.body_fat_percentage);
    bodyFatTrend = {
      first: fVal,
      latest: lVal,
      change: lVal - fVal,
      firstDate: dateOf(f.logged_at),
      latestDate: dateOf(l.logged_at),
      series: bfReadings.map((w) => parseFloat(w.body_fat_percentage)),
      count: bfReadings.length,
    };
  }
  const hasBodyFat = bodyFatTrend !== null;
  const hasAnyBodyFat = bfReadings.length > 0;

  // ========== WAIST-TO-HIP RATIO (Day 35f Pass 2) ==========
  // Ratio is unit-free (waist and hips share a unit). Shown neutrally with no
  // health-risk categorization — that's sex-specific medical interpretation.
  const whrReadings = measurements
    .filter(
      (m) =>
        m.waist != null &&
        m.waist !== "" &&
        m.hips != null &&
        m.hips !== "" &&
        parseFloat(m.hips) > 0
    )
    .map((m) => ({
      date: dateOf(m.logged_at),
      ratio: parseFloat(m.waist) / parseFloat(m.hips),
    }));
  let whrTrend = null;
  if (whrReadings.length >= 1) {
    const latest = whrReadings[whrReadings.length - 1];
    whrTrend = {
      latest: latest.ratio,
      latestDate: latest.date,
      count: whrReadings.length,
    };
    if (whrReadings.length >= 2) {
      const first = whrReadings[0];
      whrTrend.first = first.ratio;
      whrTrend.change = latest.ratio - first.ratio;
      whrTrend.firstDate = first.date;
      whrTrend.series = whrReadings.map((r) => r.ratio);
    }
  }
  const hasWhr = whrTrend !== null;

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
      {/* ---------- guided tour of this page ---------- */}
      <PageTour
        tourKey="insights"
        steps={[
          {
            target: '[data-tour="adherence"]',
            title: "How consistent you've been",
            body: "Compares your saved schedule against the doses you actually logged. It turns amber below 90% and red below 70%, and there's a per-protocol breakdown plus your recent misses underneath.",
          },
          {
            target: '[data-tour="rotation"]',
            title: "Are you rotating?",
            body: "Watches your recent injection sites and warns you if the last three or more doses all went to the same spot — the thing that leads to lumps and scar tissue.",
          },
          {
            target: '[data-tour="cost"]',
            title: "What it's costing you",
            body: "Total invested, monthly burn, and cost per dose. The \"supply\" estimate simulates your actual schedule forward — so if you're titrating up, it accounts for the ramp instead of assuming today's dose forever.",
          },
          {
            target: '[data-tour="plateau"]',
            title: "Stalled or still moving?",
            body: "Looks at the last four weeks and tells you whether your weight has genuinely flattened out or is still trending. A plateau isn't good or bad — it's just useful to know which one you're in.",
          },
          {
            target: '[data-tour="outcomes"]',
            title: "Consistency against results",
            body: "Your weight plotted with protocol start dates, each point colored by how consistent you were leading up to it. It compares your higher- and lower-consistency stretches — but only once there's enough data, and it never claims one caused the other.",
          },
          {
            target: '[data-tour="severity-dose"]',
            title: "Do side effects track your dose?",
            body: "Compares symptom severity on your higher- vs lower-dose days. It's deliberately strict — it only counts days where you dosed a single peptide, so overlapping protocols can't muddy the comparison.",
          },
        ]}
      />

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
          <div
            data-tour="adherence"
            className={`bg-slate-900 border rounded-xl p-6 ${headlineBorder}`}
          >
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

      {/* ========== INJECTION-SITE ROTATION ========== */}

      <div
        data-tour="rotation"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="rotate" className="w-[18px] h-[18px] text-slate-400" />
          Injection-site rotation
        </h2>

        {!hasSites && (
          <p className="text-sm text-slate-500 mt-3">
            No injection sites logged yet. When you record a site with each dose,
            this is where you&apos;ll see how well you&apos;re rotating between
            them.
          </p>
        )}

        {hasSites && (
          <>
            {rotationFlag ? (
              <div className="mt-3 flex items-start gap-2">
                <Icon
                  name="alertTriangle"
                  className="w-[18px] h-[18px] text-amber-400 shrink-0 mt-0.5"
                />
                <p className="text-sm text-slate-300">
                  Your last {consecutiveRepeat} doses all used{" "}
                  <span className="text-white font-medium">{repeatSite}</span>.
                  Rotating sites between doses helps avoid irritation, lumps, and
                  scar tissue.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-3">
                You&apos;re spreading doses across {distinctSites}{" "}
                {distinctSites === 1 ? "site" : "different sites"}.
              </p>
            )}

            <ul className="space-y-2 mt-4">
              {siteCountList.map((s) => (
                <li
                  key={s.site}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-slate-300">{s.site}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {s.count} {s.count === 1 ? "dose" : "doses"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              Based on your last {recentSited.length} logged sites.
            </p>
          </>
        )}
      </div>

      {/* ========== DOSE TIMING ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="clock" className="w-[18px] h-[18px] text-slate-400" />
          Dose timing
        </h2>

        {!hasTiming && (
          <p className="text-sm text-slate-500 mt-3">
            {doses.length > 0
              ? "A few more logged doses and your typical-time pattern will show up here."
              : "When you log doses, this shows the times of day you usually dose."}
          </p>
        )}

        {hasTiming && (
          <>
            <p className="text-sm text-slate-300 mt-3">
              Most of your doses are in the{" "}
              <span className="text-white font-medium">{typicalPart}</span>,
              typically around{" "}
              <span className="text-white font-medium">{medianHourLabel}</span>.
              {timingConsistent
                ? " Fairly consistent."
                : " Your timing varies a fair bit."}
            </p>

            <ul className="space-y-2 mt-4">
              {["morning", "afternoon", "evening", "night"]
                .filter((p) => partCounts[p] > 0)
                .map((p) => (
                  <li
                    key={p}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-slate-300 capitalize">
                      {p}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {partCounts[p]} {partCounts[p] === 1 ? "dose" : "doses"}
                    </span>
                  </li>
                ))}
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              Based on {doseHours.length} logged doses. Some peptides have timing
              guidance — this just reflects your own habit.
            </p>
          </>
        )}
      </div>

      {/* ========== COST & SPEND ========== */}

      <div
        data-tour="cost"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="coin" className="w-[18px] h-[18px] text-slate-400" />
          Cost &amp; spend
        </h2>

        {!hasAnyCost && (
          <p className="text-sm text-slate-500 mt-3">
            No costs recorded yet. Add what you paid for each item in your{" "}
            <Link
              href="/inventory"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Inventory
            </Link>{" "}
            and this is where your spend, cost per dose, and how long each vial
            will last show up.
          </p>
        )}

        {hasAnyCost && (
          <>
            <p className="text-[32px] leading-none font-semibold text-white mt-3">
              {fmtMoney(totalInvested)}
              <span className="text-base font-medium text-slate-400">
                {" "}
                invested
              </span>
            </p>
            {totalMonthlyBurn > 0 && (
              <p className="text-sm text-slate-400 mt-2">
                Using about{" "}
                <span className="text-white font-medium">
                  {fmtMoney(totalMonthlyBurn)}
                </span>
                /month at your current protocols.
              </p>
            )}

            <ul className="space-y-4 mt-5">
              {costItems.map((c, i) => (
                <li
                  key={i}
                  className="border-b border-slate-800 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white font-medium">{c.name}</p>
                    {c.runwayText && (
                      <span
                        className={`text-xs whitespace-nowrap ${
                          c.runwayLow ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        {c.runwayText}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {c.cost != null && <>{fmtMoney(c.cost)} paid</>}
                    {c.costPerDose != null && (
                      <> · {fmtMoney(c.costPerDose)}/dose</>
                    )}
                    {c.costPerUnit != null && (
                      <>
                        {" "}
                        · {fmtPerUnit(c.costPerUnit)}/{c.unit}
                      </>
                    )}
                    {c.remaining > 0 && (
                      <>
                        {" "}
                        · {c.remaining} {c.unit} left
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

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

      {/* ========== WEEKLY-SMOOTHED WEIGHT RATE ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="wave" className="w-[18px] h-[18px] text-slate-400" />
          Weekly-smoothed weight rate
        </h2>

        {!hasSmoothed && (
          <p className="text-sm text-slate-500 mt-3">
            A couple of weeks of weigh-ins and this will show your weight trend
            with day-to-day noise smoothed out — steadier than a single
            before/after number.
          </p>
        )}

        {hasSmoothed && (
          <>
            <p className="text-[32px] leading-none font-semibold text-white mt-3 flex items-baseline gap-2">
              <span>{arrowFor(smoothedRate)}</span>
              <span>{Math.abs(smoothedRate).toFixed(1)}</span>
              <span className="text-lg font-medium text-slate-400">
                {smoothUnit}/week
              </span>
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Averaged across {weeklyAvgPoints.length} weeks of weigh-ins to even
              out daily swings.
            </p>
            {smoothedSeries.length >= 3 && (
              <div className="text-slate-300 mt-4">
                <Sparkline values={smoothedSeries} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== PLATEAU CHECK ========== */}

      <div
        data-tour="plateau"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="plateau" className="w-[18px] h-[18px] text-slate-400" />
          Plateau check
        </h2>

        {!hasPlateauData && (
          <p className="text-sm text-slate-500 mt-3">
            Log at least 3 weigh-ins across a couple of weeks and this will tell
            you whether your weight has stalled or is still moving.
          </p>
        )}

        {hasPlateauData && plateau.type === "plateau" && (
          <>
            <p className="text-sm text-slate-300 mt-3">
              Your weight&apos;s been holding steady — between{" "}
              <span className="text-white font-medium">
                {plateau.rangeLow.toFixed(1)}
              </span>{" "}
              and{" "}
              <span className="text-white font-medium">
                {plateau.rangeHigh.toFixed(1)} {plateau.unit}
              </span>{" "}
              over the last ~{Math.round(plateau.weeks)} weeks. That looks like a
              plateau.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              A plateau isn&apos;t inherently good or bad — just a flat stretch.
              Plenty of things can cause one.
            </p>
          </>
        )}

        {hasPlateauData && plateau.type === "moving" && (
          <p className="text-sm text-slate-300 mt-3">
            No plateau — your weight&apos;s still moving, about{" "}
            <span className="text-white font-medium">
              {arrowFor(plateau.ratePerWeek)}{" "}
              {Math.abs(plateau.ratePerWeek).toFixed(1)} {plateau.unit}/week
            </span>{" "}
            over the last ~{Math.round(plateau.weeks)} weeks.
          </p>
        )}
      </div>

      {/* ========== BODY-FAT TREND ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="percent" className="w-[18px] h-[18px] text-slate-400" />
          Body-fat trend
        </h2>

        {!hasAnyBodyFat && (
          <p className="text-sm text-slate-500 mt-3">
            No body-fat readings yet. Add a body-fat % alongside your weigh-ins
            and its movement will show up here.
          </p>
        )}

        {hasAnyBodyFat && !hasBodyFat && (
          <p className="text-sm text-slate-500 mt-3">
            One body-fat reading so far (
            {parseFloat(bfReadings[0].body_fat_percentage).toFixed(1)}% on{" "}
            {shortDate(dateOf(bfReadings[0].logged_at))}). Log another to see the
            trend.
          </p>
        )}

        {hasBodyFat && (
          <>
            <p className="text-[32px] leading-none font-semibold text-white mt-3 flex items-baseline gap-2">
              <span>{arrowFor(bodyFatTrend.change)}</span>
              <span>{Math.abs(bodyFatTrend.change).toFixed(1)}</span>
              <span className="text-lg font-medium text-slate-400">% pts</span>
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {bodyFatTrend.first.toFixed(1)}% → {bodyFatTrend.latest.toFixed(1)}%
              from {shortDate(bodyFatTrend.firstDate)} to{" "}
              {shortDate(bodyFatTrend.latestDate)}
            </p>
            {bodyFatTrend.series.length >= 3 && (
              <div className="text-slate-300 mt-4">
                <Sparkline values={bodyFatTrend.series} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== GOAL PROJECTION ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="flag" className="w-[18px] h-[18px] text-slate-400" />
          Goal projection
        </h2>

        {!hasGoals && (
          <p className="text-sm text-slate-500 mt-3">
            No active goals yet. Set a goal — like a target weight — on the{" "}
            <Link
              href="/progress"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Progress
            </Link>{" "}
            page, and this is where you&apos;ll see your progress and a projected
            date to reach it.
          </p>
        )}

        {hasGoals && (
          <ul className="space-y-5 mt-4">
            {goalCards.map((gc) => (
              <li
                key={gc.id}
                className="border-b border-slate-800 pb-5 last:border-0 last:pb-0"
              >
                {/* title + status badge */}
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-white font-medium">{gc.title}</p>
                  {gc.reached ? (
                    <span className="text-xs text-emerald-400 whitespace-nowrap">
                      Reached
                    </span>
                  ) : gc.projection &&
                    gc.projection.type === "date" &&
                    gc.projection.onTrack === true ? (
                    <span className="text-xs text-emerald-400 whitespace-nowrap">
                      On track
                    </span>
                  ) : gc.projection &&
                    gc.projection.type === "date" &&
                    gc.projection.onTrack === false ? (
                    <span className="text-xs text-amber-400 whitespace-nowrap">
                      Behind pace
                    </span>
                  ) : null}
                </div>

                {/* target line */}
                {gc.target != null && (
                  <p className="text-xs text-slate-500 mt-1">
                    Target {gc.target} {gc.unit}
                    {gc.targetDate && <> by {midDate(gc.targetDate)}</>}
                    {!gc.reached &&
                      gc.daysToDeadline != null &&
                      gc.daysToDeadline >= 0 && (
                        <> · {gc.daysToDeadline} days left</>
                      )}
                    {!gc.reached &&
                      gc.daysToDeadline != null &&
                      gc.daysToDeadline < 0 && <> · target date passed</>}
                  </p>
                )}

                {/* progress bar (clamped 0–100) */}
                {gc.progressPct != null && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, gc.progressPct)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-slate-500">
                        {gc.start != null && (
                          <>
                            {gc.start} → {gc.target} {gc.unit}
                          </>
                        )}
                      </span>
                      <span className="text-xs text-slate-400">
                        {gc.current != null && (
                          <>
                            now {gc.current.toFixed(1)} {gc.unit}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* current + remaining when there's no start to draw a bar */}
                {gc.progressPct == null && gc.current != null && (
                  <p className="text-xs text-slate-400 mt-2">
                    Currently {gc.current.toFixed(1)} {gc.unit}
                    {gc.remaining != null && gc.target != null && (
                      <>
                        {" "}
                        · {gc.remaining.toFixed(1)} {gc.unit} to go
                      </>
                    )}
                  </p>
                )}

                {/* projection line */}
                {!gc.reached && (
                  <div className="mt-3">
                    {gc.projection && gc.projection.type === "date" && (
                      <p className="text-sm text-slate-300">
                        At your current pace (
                        {Math.abs(gc.projection.ratePerWeek).toFixed(1)} {gc.unit}
                        /week), projected to reach{" "}
                        <span className="text-white font-medium">
                          {gc.target} {gc.unit}
                        </span>{" "}
                        around{" "}
                        <span className="text-white font-medium">
                          {midDate(gc.projection.date)}
                        </span>
                        {gc.projection.daysVsTarget != null &&
                          gc.projection.daysVsTarget > 0 && (
                            <span className="text-amber-400">
                              {" "}
                              — about {gc.projection.daysVsTarget} days after your
                              target
                            </span>
                          )}
                        {gc.projection.daysVsTarget != null &&
                          gc.projection.daysVsTarget <= 0 && (
                            <span className="text-emerald-400">
                              {" "}
                              — about {Math.abs(gc.projection.daysVsTarget)} days
                              ahead of your target
                            </span>
                          )}
                        .
                      </p>
                    )}

                    {gc.projection && gc.projection.type === "need-data" && (
                      <p className="text-sm text-slate-500">
                        Log another weigh-in and a projected date will appear here
                        — a single weigh-in can&apos;t show a pace yet.
                      </p>
                    )}

                    {gc.projection && gc.projection.type === "wrong-way" && (
                      <p className="text-sm text-slate-500">
                        Your recent weigh-ins are trending away from this target,
                        so there&apos;s no projected date yet.
                      </p>
                    )}

                    {gc.isWeight && gc.current == null && (
                      <p className="text-sm text-slate-500">
                        Log a weigh-in on the Progress page to start tracking this
                        goal.
                      </p>
                    )}

                    {!gc.isWeight && (
                      <p className="text-sm text-slate-500">
                        Tracked manually — projected dates are available for
                        weight goals.
                      </p>
                    )}
                  </div>
                )}

                {gc.reached && (
                  <p className="text-sm text-emerald-400 mt-2">
                    You&apos;ve reached your target — nice work. You can mark it
                    complete on the Progress page.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ========== ADHERENCE × OUTCOMES ========== */}

      <div
        data-tour="outcomes"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="trend" className="w-[18px] h-[18px] text-slate-400" />
          Adherence &amp; outcomes
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Your weight set against your protocol timeline and how consistent you
          were.
        </p>

        {!hasAnyWeighForOutcome && (
          <p className="text-sm text-slate-500 mt-3">
            Once you log weigh-ins, your weight will appear here plotted against
            when each protocol started — each point colored by how consistent you
            were leading up to it.
          </p>
        )}

        {hasAnyWeighForOutcome && !hasOutcomeChart && (
          <p className="text-sm text-slate-500 mt-3">
            You&apos;ve logged one weigh-in. Log a few more across your protocol
            and this chart will plot your weight against your protocol starts and
            your week-to-week consistency.
          </p>
        )}

        {hasOutcomeChart && (
          <>
            <div className="mt-4">
              <OutcomeTimeline points={weighPoints} markers={outcomeMarkers} />
            </div>

            {/* color key */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#10b981" }}
                />
                90%+ logged
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#f59e0b" }}
                />
                70–89%
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#ef4444" }}
                />
                under 70%
              </span>
            </div>

            {outcomeMarkers.length > 0 && (
              <p className="text-xs text-slate-500 mt-3">
                Protocol starts (dashed):{" "}
                {outcomeMarkers
                  .map((m) => `${m.label} (${shortDate(m.date)})`)
                  .join(" · ")}
              </p>
            )}

            <p className="text-xs text-slate-500 mt-3">
              This lays your weight, your protocol changes, and your consistency
              side by side. It can&apos;t tell you what caused what — weight moves
              for many reasons — so read it as a prompt for questions, not proof.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-800">
              {outcomeRead && outcomeRead.type === "few" && (
                <p className="text-sm text-slate-500">
                  A pattern read unlocks at {outcomeRead.need} weigh-in intervals
                  — you have {outcomeRead.have} so far. Keep logging weight and
                  doses, and a comparison of your higher- vs lower-consistency
                  stretches will appear here.
                </p>
              )}

              {outcomeRead && outcomeRead.type === "flat" && (
                <p className="text-sm text-slate-500">
                  Your adherence has been consistently high across these weigh-ins,
                  so there isn&apos;t enough variation to compare high- vs
                  low-consistency stretches yet — a good problem to have.
                </p>
              )}

              {outcomeRead && outcomeRead.type === "assoc" && (
                <>
                  <p className="text-sm text-slate-300">
                    Across {outcomeRead.n} intervals, your higher-consistency
                    stretches averaged{" "}
                    <span className="text-white font-medium">
                      {outcomeRead.meanHigh >= 0 ? "+" : ""}
                      {outcomeRead.meanHigh.toFixed(1)} {outcomeRead.unit}/week
                    </span>{" "}
                    and your lower-consistency stretches{" "}
                    <span className="text-white font-medium">
                      {outcomeRead.meanLow >= 0 ? "+" : ""}
                      {outcomeRead.meanLow.toFixed(1)} {outcomeRead.unit}/week
                    </span>
                    {Math.abs(outcomeRead.diff) < 0.2 ? (
                      <> — about the same.</>
                    ) : (
                      <>
                        {" "}
                        — a difference of {Math.abs(outcomeRead.diff).toFixed(1)}{" "}
                        {outcomeRead.unit}/week.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    That&apos;s an association in your own logs over a small
                    sample — not proof the protocol caused it.
                  </p>
                </>
              )}
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

      {/* ========== WAIST-TO-HIP RATIO ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="ratio" className="w-[18px] h-[18px] text-slate-400" />
          Waist-to-hip ratio
        </h2>

        {!hasWhr && (
          <p className="text-sm text-slate-500 mt-3">
            Log both waist and hips on the{" "}
            <Link
              href="/progress"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Progress
            </Link>{" "}
            page and your waist-to-hip ratio — and how it changes — will appear
            here.
          </p>
        )}

        {hasWhr && (
          <>
            <p className="text-[32px] leading-none font-semibold text-white mt-3">
              {whrTrend.latest.toFixed(2)}
            </p>
            {whrTrend.change !== undefined ? (
              <p className="text-sm text-slate-400 mt-2">
                {whrTrend.change <= -0.005
                  ? "↓"
                  : whrTrend.change >= 0.005
                  ? "↑"
                  : "→"}{" "}
                {Math.abs(whrTrend.change).toFixed(2)} from{" "}
                {whrTrend.first.toFixed(2)} ({shortDate(whrTrend.firstDate)}) to{" "}
                {whrTrend.latest.toFixed(2)} ({shortDate(whrTrend.latestDate)})
              </p>
            ) : (
              <p className="text-sm text-slate-400 mt-2">
                From your measurement on {shortDate(whrTrend.latestDate)}. Log
                another to see the trend.
              </p>
            )}
            {whrTrend.series && whrTrend.series.length >= 3 && (
              <div className="text-slate-300 mt-4">
                <Sparkline values={whrTrend.series} />
              </div>
            )}
            <p className="text-xs text-slate-500 mt-3">
              Just the ratio of waist to hips, shown without any health judgment
              — what it means is a conversation for your provider.
            </p>
          </>
        )}
      </div>

      {/* ========== LAB / BIOMARKER TRENDS ========== */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="vial" className="w-[18px] h-[18px] text-slate-400" />
          Lab &amp; biomarker trends
        </h2>

        {!hasLabs && (
          <p className="text-sm text-slate-500 mt-3">
            No lab results logged yet. Record bloodwork on the{" "}
            <Link
              href="/labs"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Labs
            </Link>{" "}
            page and this is where each biomarker&apos;s movement between tests
            will appear.
          </p>
        )}

        {hasLabs && (
          <>
            <ul className="space-y-4 mt-4">
              {labSummaries.map((m) => (
                <li
                  key={m.name}
                  className="border-b border-slate-800 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white font-medium">{m.name}</p>
                    <p className="text-sm text-slate-300 whitespace-nowrap">
                      {m.latestValue}
                      {m.unit && (
                        <span className="text-slate-500"> {m.unit}</span>
                      )}
                    </p>
                  </div>

                  {m.count >= 2 ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {arrowFor(m.change)} {Math.abs(m.change).toFixed(1)}
                      {m.unit ? ` ${m.unit}` : ""}{" "}
                      {m.sameDate ? (
                        <>across {m.count} readings</>
                      ) : (
                        <>
                          from {shortDate(m.firstDate)} to{" "}
                          {shortDate(m.lastDate)}
                        </>
                      )}
                      {" · "}
                      {m.firstValue} → {m.latestValue}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">
                      One reading ({shortDate(m.lastDate)}) — log another to see
                      movement.
                    </p>
                  )}

                  {m.count >= 3 && (
                    <div className="text-slate-400 mt-2">
                      <Sparkline values={m.series} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-4">
              Values are shown exactly as you logged them, with no medical
              interpretation. Talk to your provider about what your results mean.
            </p>
          </>
        )}
      </div>

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

      {/* ========== SIDE-EFFECT SEVERITY vs DOSE ========== */}

      <div
        data-tour="severity-dose"
        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
      >
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Icon name="pulse" className="w-[18px] h-[18px] text-slate-400" />
          Severity vs dose
        </h2>

        {!hasAnySideEffectsForDose && (
          <p className="text-sm text-slate-500 mt-3">
            No side effects logged yet. Once you log some, this compares how
            severe they were on your higher- vs lower-dose days — clearest when a
            symptom lines up with a single protocol.
          </p>
        )}

        {hasAnySideEffectsForDose && !hasSeverityDose && (
          <p className="text-sm text-slate-500 mt-3">
            Not enough to compare yet. This needs several side-effect reports
            that fall on days you dosed a single peptide, across at least two
            dose levels, so the comparison can&apos;t be muddled by overlapping
            protocols.
          </p>
        )}

        {hasSeverityDose && (
          <>
            <ul className="space-y-4 mt-4">
              {severityDoseReads.map((r) => (
                <li
                  key={r.peptide}
                  className="border-b border-slate-800 pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-sm text-white font-medium">{r.peptide}</p>
                  <p className="text-sm text-slate-300 mt-1">
                    Higher-dose days averaged severity{" "}
                    <span className="text-white font-medium">
                      {r.meanHiSeverity.toFixed(1)}
                    </span>{" "}
                    vs{" "}
                    <span className="text-white font-medium">
                      {r.meanLoSeverity.toFixed(1)}
                    </span>{" "}
                    on lower-dose days, across {r.n} reports.
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-4">
              An association in your own logs over a small sample — not proof.
              Severity is subjective and many things affect how you feel.
            </p>
          </>
        )}
      </div>
    </div>
  );
}