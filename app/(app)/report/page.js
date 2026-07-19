"use client";

// ============================================================
// DOCTOR REPORT (Day 36) ...
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { isDoseDay } from "../../lib/schedule-helpers";
import ShareManager from "../../components/ShareManager";
import PageTour from "../../components/PageTour";
// ---------------- date helpers (local-timezone safe) ----------------
function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateKeyOf(value) {
  if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
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
function fmtDate(d) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function shortDate(d) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------- unit conversion ----------------
function toLbs(v, unit) {
  if (unit === "kg") return v * 2.20462;
  if (unit === "st") return v * 14;
  return v;
}
function fromLbs(v, unit) {
  if (unit === "kg") return v / 2.20462;
  if (unit === "st") return v / 14;
  return v;
}
function mean(nums) {
  if (!nums || nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function arrowFor(c) {
  if (c <= -0.05) return "\u2193";
  if (c >= 0.05) return "\u2191";
  return "\u2192";
}

// ---------------- schedule description ----------------
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function describeDose(s) {
  const unit = s.unit || "";
  if (Array.isArray(s.dose_phases) && s.dose_phases.length > 0) {
    const steps = s.dose_phases.map((p) => p.dose).join(" \u2192 ");
    return `${steps} ${unit} (titrating)`;
  }
  return `${s.dose_amount} ${unit}`;
}
function describeSchedule(s) {
  if (Array.isArray(s.days_of_week) && s.days_of_week.length > 0) {
    if (s.days_of_week.length === 7) return "Daily";
    const days = s.days_of_week.map((d) => DOW[d] || "?").join(", ");
    return `Weekly (${days})`;
  }
  const n = s.interval_days;
  if (n === 1) return "Daily";
  if (n === 7) return "Weekly";
  if (n) return `Every ${n} days`;
  return "\u2014";
}

// ---------------- small presentational components ----------------
function Section({ title, children, tour }) {
  return (
    <section className="mt-6 break-inside-avoid" data-tour={tour}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-slate-400 italic">{children}</p>;
}

// print-friendly line chart (dark line on white, light axes/labels)
function ReportChart({ points, caption, formatVal }) {
  if (!points || points.length < 2) return null;
  const W = 760;
  const H = 200;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 30;

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
  const line = points
    .map((p) => `${px(p.date.getTime()).toFixed(1)},${py(p.value).toFixed(1)}`)
    .join(" ");
  const baseY = H - padB;
  const fmt = formatVal || ((v) => v.toFixed(1));

  return (
    <figure className="mt-4 break-inside-avoid">
      {caption && (
        <figcaption className="text-xs font-medium text-slate-500 mb-1">
          {caption}
        </figcaption>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={baseY}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <line
          x1={padL}
          y1={baseY}
          x2={W - padR}
          y2={baseY}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <text
          x={padL - 6}
          y={py(maxV) + 4}
          fontSize="11"
          fill="#64748b"
          textAnchor="end"
        >
          {fmt(maxV)}
        </text>
        <text
          x={padL - 6}
          y={py(minV) + 4}
          fontSize="11"
          fill="#64748b"
          textAnchor="end"
        >
          {fmt(minV)}
        </text>
        <polyline
          points={line}
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={px(p.date.getTime())}
            cy={py(p.value)}
            r="3"
            fill="#0f172a"
          />
        ))}
        <text x={padL} y={H - 8} fontSize="11" fill="#64748b">
          {shortDate(points[0].date)}
        </text>
        <text
          x={W - padR}
          y={H - 8}
          fontSize="11"
          fill="#64748b"
          textAnchor="end"
        >
          {shortDate(points[points.length - 1].date)}
        </text>
      </svg>
    </figure>
  );
}

export default function Report() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [doses, setDoses] = useState([]);
  const [weights, setWeights] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [labs, setLabs] = useState([]);
  const [sideEffects, setSideEffects] = useState([]);
  const [includeCharts, setIncludeCharts] = useState(true);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setEmail(session.user.email || "");
      await Promise.all([
        fetchProfile(session.user.id),
        fetchSchedules(session.user.id),
        fetchDoses(session.user.id),
        fetchWeights(session.user.id),
        fetchMeasurements(session.user.id),
        fetchLabs(session.user.id),
        fetchSideEffects(session.user.id),
      ]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(uid) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", uid)
      .single();
    setProfile(data || null);
  }
  async function fetchSchedules(uid) {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", uid);
    setSchedules(data || []);
  }
  async function fetchDoses(uid) {
    const { data } = await supabase
      .from("dose_logs")
      .select("peptide_name, logged_at")
      .eq("user_id", uid);
    setDoses(data || []);
  }
  async function fetchWeights(uid) {
    const { data } = await supabase
      .from("weight_logs")
      .select("weight, unit, body_fat_percentage, logged_at")
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
  async function fetchLabs(uid) {
    const { data } = await supabase
      .from("lab_results")
      .select("biomarker, value, unit, tested_at, created_at")
      .eq("user_id", uid)
      .order("tested_at", { ascending: true })
      .order("created_at", { ascending: true });
    setLabs(data || []);
  }
  async function fetchSideEffects(uid) {
    const { data } = await supabase
      .from("side_effect_logs")
      .select("effect_name, severity, logged_at")
      .eq("user_id", uid)
      .order("logged_at", { ascending: true });
    setSideEffects(data || []);
  }

  // ---------------- computations ----------------
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const activeSchedules = schedules.filter((s) => s.active);

  // adherence
  const loggedByPeptide = {};
  for (const d of doses) {
    const name = (d.peptide_name || "").trim();
    if (!name) continue;
    if (!loggedByPeptide[name]) loggedByPeptide[name] = new Set();
    loggedByPeptide[name].add(dateKeyOf(d.logged_at));
  }
  let totalSched = 0;
  let totalTaken = 0;
  const protocolAdh = [];
  for (const s of activeSchedules) {
    const name = (s.peptide_name || "").trim();
    const start = parseDateOnly(s.start_date);
    const endRaw = parseDateOnly(s.end_date);
    const end = endRaw < today ? endRaw : today;
    let sched = 0;
    let taken = 0;
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
    let guard = 0;
    while (cur <= end && guard < 3650) {
      guard++;
      if (isDoseDay(s, cur)) {
        sched++;
        const k = dateKeyFromDate(cur);
        if (loggedByPeptide[name] && loggedByPeptide[name].has(k)) taken++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    totalSched += sched;
    totalTaken += taken;
    protocolAdh.push({
      name: name || "\u2014",
      dose: describeDose(s),
      schedule: describeSchedule(s),
      start,
      end: endRaw,
      sched,
      taken,
      pct: sched > 0 ? Math.round((taken / sched) * 100) : null,
    });
  }
  const overallPct =
    totalSched > 0 ? Math.round((totalTaken / totalSched) * 100) : null;

  // weight
  const wUnit = weights.length ? weights[weights.length - 1].unit || "lbs" : "lbs";
  let weightSummary = null;
  if (weights.length >= 1) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const firstLbs = toLbs(parseFloat(first.weight), first.unit);
    const lastLbs = toLbs(parseFloat(last.weight), last.unit);
    weightSummary = {
      current: fromLbs(lastLbs, wUnit),
      start: fromLbs(firstLbs, wUnit),
      change: fromLbs(lastLbs - firstLbs, wUnit),
      unit: wUnit,
      firstDate: dateOf(first.logged_at),
      lastDate: dateOf(last.logged_at),
      count: weights.length,
    };
  }

  // body fat
  const bf = weights.filter(
    (w) => w.body_fat_percentage !== null && w.body_fat_percentage !== ""
  );
  let bfSummary = null;
  if (bf.length >= 1) {
    const f = bf[0];
    const l = bf[bf.length - 1];
    bfSummary = {
      current: parseFloat(l.body_fat_percentage),
      start: parseFloat(f.body_fat_percentage),
      change:
        parseFloat(l.body_fat_percentage) - parseFloat(f.body_fat_percentage),
      count: bf.length,
      lastDate: dateOf(l.logged_at),
    };
  }

  // chart series (oldest -> newest), used when "Include charts" is on
  const weightChartPoints = weights.map((w) => ({
    date: dateOf(w.logged_at),
    value: fromLbs(toLbs(parseFloat(w.weight), w.unit), wUnit),
  }));
  const bfChartPoints = bf.map((w) => ({
    date: dateOf(w.logged_at),
    value: parseFloat(w.body_fat_percentage),
  }));

  // measurements (latest) + WHR
  const mUnit = measurements.length
    ? measurements[measurements.length - 1].unit || "in"
    : "in";
  const latestMeas = measurements.length
    ? measurements[measurements.length - 1]
    : null;
  const measFields = [
    ["waist", "Waist"],
    ["hips", "Hips"],
    ["chest", "Chest"],
    ["arms", "Arms"],
    ["thighs", "Thighs"],
  ];
  const latestMeasRows = latestMeas
    ? measFields
        .filter(
          ([k]) =>
            latestMeas[k] !== null &&
            latestMeas[k] !== undefined &&
            latestMeas[k] !== ""
        )
        .map(([k, label]) => ({
          label,
          value: parseFloat(latestMeas[k]),
        }))
    : [];
  let whr = null;
  const whrR = measurements.filter(
    (m) => m.waist && m.hips && parseFloat(m.hips) > 0
  );
  if (whrR.length) {
    const l = whrR[whrR.length - 1];
    whr = parseFloat(l.waist) / parseFloat(l.hips);
  }

  // labs
  const labGroups = {};
  for (const r of labs) {
    const n = (r.biomarker || "").trim();
    if (!n) continue;
    if (!labGroups[n]) labGroups[n] = [];
    labGroups[n].push(r);
  }
  const labRows = Object.keys(labGroups).map((n) => {
    const arr = labGroups[n];
    const f = arr[0];
    const l = arr[arr.length - 1];
    return {
      name: n,
      latest: parseFloat(l.value),
      unit: l.unit || f.unit || "",
      first: parseFloat(f.value),
      change: parseFloat(l.value) - parseFloat(f.value),
      count: arr.length,
      firstDate: dateOf(f.tested_at),
      lastDate: dateOf(l.tested_at),
      sameDate: dateKeyOf(f.tested_at) === dateKeyOf(l.tested_at),
    };
  });

  // side effects
  const seGroups = {};
  for (const e of sideEffects) {
    const n = (e.effect_name || "").trim();
    if (!n) continue;
    if (!seGroups[n]) seGroups[n] = [];
    seGroups[n].push(e);
  }
  const seRows = Object.keys(seGroups).map((n) => {
    const arr = seGroups[n];
    const sev = arr.map((x) => Number(x.severity) || 0);
    return {
      name: n,
      count: arr.length,
      avg: mean(sev),
      last: dateOf(arr[arr.length - 1].logged_at),
    };
  });

  // reporting period start
  const allDates = [];
  for (const d of doses) allDates.push(dateOf(d.logged_at));
  for (const w of weights) allDates.push(dateOf(w.logged_at));
  for (const m of measurements) allDates.push(dateOf(m.logged_at));
  for (const r of labs) allDates.push(dateOf(r.tested_at));
  for (const e of sideEffects) allDates.push(dateOf(e.logged_at));
  for (const s of activeSchedules) allDates.push(parseDateOnly(s.start_date));
  const periodStart = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : null;

  const patientName =
    (profile && (profile.full_name || profile.email)) || email || "\u2014";

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Preparing your report…</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* ---------- guided tour of this page ---------- */}
      <PageTour
        tourKey="report"
        steps={[
          {
            target: "#print-area",
            title: "A summary built for your doctor",
            body: "Everything you've tracked, pulled into one clean document: your current protocols, adherence, weight and body composition, lab results, and any side effects you've logged.",
          },
          {
            target: '[data-tour="adherence"]',
            title: "The number they'll care about",
            body: "How many of your scheduled doses you actually logged, overall and per peptide. A dose counts as taken if you logged a matching one that day.",
          },
          {
            target: '[data-tour="actions"]',
            title: "Saving it as a PDF",
            body: "Hit Print, then choose \"Save as PDF\" as the destination — only the white document prints, none of the app around it. Untick \"Include charts\" if you'd rather keep it to one page.",
          },
          {
            target: '[data-tour="share"]',
            title: "Or send a link instead",
            body: "Create a private, read-only link your provider can open in a browser — no account needed on their end. You can revoke it whenever you want.",
          },
        ]}
      />

      {/* print isolation: hide everything except the document sheet */}
      <style>{`
        @media print {
          @page { margin: 1.4cm; }
          html, body {
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0 !important; padding: 0 !important;
            box-shadow: none !important; border-radius: 0 !important;
          }
        }
      `}</style>

      {/* action bar — hidden when printing */}
      <div
        data-tour="actions"
        className="max-w-[820px] mx-auto mb-5 flex items-start justify-between gap-4 print:hidden"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Doctor report
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            A printable summary of your protocol history. Click the button, then
            choose &ldquo;Save as PDF&rdquo; as the destination.
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2.5">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="w-4 h-4 accent-emerald-500"
            />
            Include charts
          </label>
          <button
            onClick={() => window.print()}
            className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-sm font-semibold rounded-lg px-4 py-2.5"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* share manager — hidden when printing */}
      <div data-tour="share">
        <ShareManager />
      </div>

      {/* the document */}
      <div
        id="print-area"
        className="max-w-[820px] mx-auto bg-white text-slate-900 rounded-xl p-10 shadow-xl"
      >
        {/* header */}
        <div className="border-b-2 border-slate-800 pb-4">
          <h2 className="text-2xl font-bold tracking-tight">
            Peptide Protocol Summary
          </h2>
          <div className="mt-2 text-sm text-slate-600 space-y-0.5">
            <p>
              Prepared for:{" "}
              <span className="text-slate-900 font-medium">{patientName}</span>
            </p>
            <p>Generated: {fmtDate(today)}</p>
            {periodStart && (
              <p>
                Reporting period: {fmtDate(periodStart)} &ndash; {fmtDate(today)}
              </p>
            )}
          </div>
        </div>

        {/* disclaimer */}
        <div className="mt-5 border border-slate-300 rounded-md p-3 text-xs leading-relaxed text-slate-600">
          This summary was generated from self-reported data the patient entered
          in Peptide Tracker. It is not medical advice, a diagnosis, or a
          substitute for professional clinical judgment, and the values have not
          been independently verified. It is provided to support discussion with
          a qualified healthcare provider.
        </div>

        {/* current protocols */}
        <Section title="Current protocols">
          {protocolAdh.length === 0 ? (
            <Empty>No active protocols on record.</Empty>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-3 font-medium">Peptide</th>
                  <th className="py-1.5 px-3 font-medium">Dose</th>
                  <th className="py-1.5 px-3 font-medium">Schedule</th>
                  <th className="py-1.5 pl-3 font-medium">Dates</th>
                </tr>
              </thead>
              <tbody>
                {protocolAdh.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100 align-top">
                    <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-1.5 px-3">{p.dose}</td>
                    <td className="py-1.5 px-3">{p.schedule}</td>
                    <td className="py-1.5 pl-3 text-slate-600 whitespace-nowrap">
                      {shortDate(p.start)} &ndash; {shortDate(p.end)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* adherence */}
        <Section title="Protocol adherence" tour="adherence">
          {overallPct === null ? (
            <Empty>
              No scheduled doses have come due yet, so adherence isn&rsquo;t
              available.
            </Empty>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Overall:{" "}
                <span className="font-semibold text-slate-900">
                  {overallPct}%
                </span>{" "}
                &mdash; {totalTaken} of {totalSched} scheduled doses logged.
              </p>
              <table className="w-full text-sm border-collapse mt-3">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-1.5 pr-3 font-medium">Peptide</th>
                    <th className="py-1.5 px-3 font-medium">Logged</th>
                    <th className="py-1.5 px-3 font-medium">Scheduled</th>
                    <th className="py-1.5 pl-3 font-medium">Adherence</th>
                  </tr>
                </thead>
                <tbody>
                  {protocolAdh
                    .filter((p) => p.sched > 0)
                    .map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                        <td className="py-1.5 px-3">{p.taken}</td>
                        <td className="py-1.5 px-3">{p.sched}</td>
                        <td className="py-1.5 pl-3">{p.pct}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">
                A scheduled dose counts as taken if a matching dose was logged on
                that day.
              </p>
            </>
          )}
        </Section>

        {/* weight & body composition */}
        <Section title="Weight &amp; body composition">
          {!weightSummary && latestMeasRows.length === 0 && !bfSummary ? (
            <Empty>No weight or body-composition data on record.</Empty>
          ) : (
            <div className="space-y-3">
              {weightSummary && (
                <div className="text-sm text-slate-700">
                  {weightSummary.count === 1 ? (
                    <p>
                      Weight:{" "}
                      <span className="font-semibold text-slate-900">
                        {weightSummary.current.toFixed(1)} {weightSummary.unit}
                      </span>{" "}
                      (single weigh-in, {shortDate(weightSummary.lastDate)}).
                    </p>
                  ) : (
                    <p>
                      Weight:{" "}
                      <span className="font-semibold text-slate-900">
                        {weightSummary.current.toFixed(1)} {weightSummary.unit}
                      </span>{" "}
                      currently &mdash; {arrowFor(weightSummary.change)}{" "}
                      {Math.abs(weightSummary.change).toFixed(1)}{" "}
                      {weightSummary.unit} from{" "}
                      {weightSummary.start.toFixed(1)} {weightSummary.unit} (
                      {shortDate(weightSummary.firstDate)} &rarr;{" "}
                      {shortDate(weightSummary.lastDate)}, {weightSummary.count}{" "}
                      weigh-ins).
                    </p>
                  )}
                </div>
              )}

              <div className="text-sm text-slate-700">
                <p>
                  Body fat:{" "}
                  {bfSummary ? (
                    <>
                      <span className="font-semibold text-slate-900">
                        {bfSummary.current.toFixed(1)}%
                      </span>
                      {bfSummary.count > 1 && (
                        <>
                          {" "}
                          ({arrowFor(bfSummary.change)}{" "}
                          {Math.abs(bfSummary.change).toFixed(1)} pts over{" "}
                          {bfSummary.count} readings)
                        </>
                      )}{" "}
                      <span className="text-slate-500">
                        as of {shortDate(bfSummary.lastDate)}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">not recorded</span>
                  )}
                </p>
              </div>

              <div className="text-sm text-slate-700">
                <p className="mb-1">
                  Latest measurements
                  {latestMeas && (
                    <span className="text-slate-500">
                      {" "}
                      ({shortDate(dateOf(latestMeas.logged_at))})
                    </span>
                  )}
                  :
                </p>
                {latestMeasRows.length === 0 ? (
                  <span className="text-slate-400 italic">not recorded</span>
                ) : (
                  <ul className="flex flex-wrap gap-x-6 gap-y-1">
                    {latestMeasRows.map((m) => (
                      <li key={m.label}>
                        {m.label}:{" "}
                        <span className="font-medium">
                          {m.value} {mUnit}
                        </span>
                      </li>
                    ))}
                    {whr !== null && (
                      <li>
                        Waist-to-hip ratio:{" "}
                        <span className="font-medium">{whr.toFixed(2)}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {includeCharts && weightChartPoints.length >= 2 && (
                <ReportChart
                  points={weightChartPoints}
                  caption={`Weight (${wUnit})`}
                />
              )}
              {includeCharts && bfChartPoints.length >= 2 && (
                <ReportChart points={bfChartPoints} caption="Body fat (%)" />
              )}
            </div>
          )}
        </Section>

        {/* lab results */}
        <Section title="Lab results">
          {labRows.length === 0 ? (
            <Empty>No lab results on record.</Empty>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-3 font-medium">Biomarker</th>
                  <th className="py-1.5 px-3 font-medium">Latest</th>
                  <th className="py-1.5 px-3 font-medium">Change</th>
                  <th className="py-1.5 pl-3 font-medium">Tested</th>
                </tr>
              </thead>
              <tbody>
                {labRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                    <td className="py-1.5 px-3">
                      {r.latest} {r.unit}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {r.count < 2
                        ? "\u2014"
                        : `${arrowFor(r.change)} ${Math.abs(r.change).toFixed(
                            1
                          )} ${r.unit}`}
                    </td>
                    <td className="py-1.5 pl-3 text-slate-600 whitespace-nowrap">
                      {r.sameDate
                        ? shortDate(r.lastDate)
                        : `${shortDate(r.firstDate)} \u2192 ${shortDate(
                            r.lastDate
                          )}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Values are patient-entered and shown without reference ranges or
            interpretation.
          </p>
        </Section>

        {/* side effects */}
        <Section title="Reported side effects">
          {seRows.length === 0 ? (
            <Empty>No side effects reported.</Empty>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-3 font-medium">Symptom</th>
                  <th className="py-1.5 px-3 font-medium">Reports</th>
                  <th className="py-1.5 px-3 font-medium">Avg severity</th>
                  <th className="py-1.5 pl-3 font-medium">Last</th>
                </tr>
              </thead>
              <tbody>
                {seRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                    <td className="py-1.5 px-3">{r.count}</td>
                    <td className="py-1.5 px-3">{r.avg.toFixed(1)}</td>
                    <td className="py-1.5 pl-3 text-slate-600 whitespace-nowrap">
                      {shortDate(r.last)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* footer */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-xs text-slate-400">
          Generated by Peptide Tracker on {fmtDate(today)}. Self-reported data —
          not a medical record.
        </div>
      </div>
    </div>
  );
}