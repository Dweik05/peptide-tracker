"use client";

// ============================================================
// PROGRESS PAGE  —  goes in:  app/(app)/progress/page.js
//
// Day 11, Step 3.5 — layout rework based on your feedback:
//
//   1. Body measurements is now OPTIONAL — collapsed into a
//      single header you click to open, so it stays out of the
//      way unless you want it
//   2. "How do I measure?" guide inside the measurements card
//      with instructions for all five spots
//   3. SIDE BY SIDE on desktop: weight section on the left,
//      measurements on the right (stacks on phones)
//   4. Weight history + Measurement history are now drop-downs —
//      click the header to open/close. They auto-open right
//      after you save an entry so you see it land.
//
// All saving/loading logic from Steps 1–3 is unchanged.
// No new packages, no new SQL — just replace the file.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const UNITS = ["lbs", "kg", "st"];
const MEASUREMENT_UNITS = ["in", "cm"];

// The four chart range buttons
const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "3m", label: "3 months" },
  { key: "all", label: "All time" },
];

// The five body measurements (key = column name in the database)
const MEASUREMENT_FIELDS = [
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "chest", label: "Chest" },
  { key: "arms", label: "Arms" },
  { key: "thighs", label: "Thighs" },
];

// Shown inside the "How do I measure?" panel
const MEASURE_GUIDE = [
  {
    label: "Waist",
    how: "Wrap the tape level with your belly button after breathing out normally. Don't suck in.",
  },
  {
    label: "Hips",
    how: "Around the widest part of your hips and glutes, with your feet together.",
  },
  {
    label: "Chest",
    how: "Around the fullest part of your chest, tape level all the way around, arms relaxed at your sides.",
  },
  {
    label: "Arms",
    how: "Around the widest part of your upper arm with the arm relaxed. Use the same arm every time.",
  },
  {
    label: "Thighs",
    how: "Around the widest part of your upper thigh. Use the same leg every time.",
  },
];

// ---------------- helper functions ----------------

// Today's date as "YYYY-MM-DD" in YOUR timezone.
// (toISOString() alone uses UTC, which in the evening in Ontario
// would already say "tomorrow" — this avoids that bug.)
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ----- weight unit conversion (lbs / kg / st) -----
function toLbs(value, unit) {
  if (unit === "kg") return value * 2.20462;
  if (unit === "st") return value * 14;
  return value; // already lbs
}

function fromLbs(value, unit) {
  if (unit === "kg") return value / 2.20462;
  if (unit === "st") return value / 14;
  return value;
}

// ----- measurement unit conversion (in / cm) -----
function toInches(value, unit) {
  if (unit === "cm") return value / 2.54;
  return value; // already inches
}

function fromInches(value, unit) {
  if (unit === "cm") return value * 2.54;
  return value;
}

// Turns a database timestamp into e.g. "Jun 10, 2026"
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Shorter version for the chart's bottom axis, e.g. "Jun 10"
function formatShortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// For a chosen range, returns the earliest date to include
// (or null, which means "include everything").
function getCutoffDate(rangeKey) {
  if (rangeKey === "all") return null;
  const days = rangeKey === "7d" ? 7 : rangeKey === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

// Shared styling for every input on this page (matches the design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

// Empty state for the measurements form
const EMPTY_MEASUREMENTS = {
  waist: "",
  hips: "",
  chest: "",
  arms: "",
  thighs: "",
};

export default function ProgressPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true); // first page load
  const [logs, setLogs] = useState([]); // weight history, newest first
  const [range, setRange] = useState("30d"); // selected chart range

  // weight form fields
  const [unit, setUnit] = useState("lbs");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");

  // weight ui feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----- body measurements -----
  const [measurements, setMeasurements] = useState([]); // history, newest first
  const [mUnit, setMUnit] = useState("in");
  const [mValues, setMValues] = useState(EMPTY_MEASUREMENTS);
  const [mDate, setMDate] = useState(getTodayString());
  const [mNotes, setMNotes] = useState("");
  const [mSaving, setMSaving] = useState(false);
  const [mError, setMError] = useState("");
  const [mSuccess, setMSuccess] = useState("");

  // ----- which sections are open (new in Step 3.5) -----
  const [showMeasurementsForm, setShowMeasurementsForm] = useState(false);
  const [showMeasureGuide, setShowMeasureGuide] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [showMeasurementHistory, setShowMeasurementHistory] = useState(false);

  // ---------- load session + data when the page opens ----------
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
      await fetchLogs(session.user.id);
      await fetchMeasurements(session.user.id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fetch this user's weight history ----------
  async function fetchLogs(uid) {
    const { data, error: fetchError } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });

    if (fetchError) {
      setError(
        `Couldn't load weight history: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setLogs(data || []);
    }
  }

  // ---------- fetch this user's measurement history ----------
  async function fetchMeasurements(uid) {
    const { data, error: fetchError } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });

    if (fetchError) {
      setMError(
        `Couldn't load measurements: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setMeasurements(data || []);
    }
  }

  // ---------- save a new weight entry ----------
  async function handleSave() {
    setError("");
    setSuccess("");

    // validation
    const weightNumber = parseFloat(weight);
    if (!weight || isNaN(weightNumber) || weightNumber <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    const bodyFatNumber = bodyFat === "" ? null : parseFloat(bodyFat);
    if (
      bodyFatNumber !== null &&
      (isNaN(bodyFatNumber) || bodyFatNumber < 0 || bodyFatNumber > 100)
    ) {
      setError("Body fat % must be between 0 and 100 (or leave it blank).");
      return;
    }

    if (!date || date > today) {
      setError("Please pick today's date or an earlier one.");
      return;
    }

    setSaving(true);

    // The T12:00:00 saves the entry at noon on the chosen day,
    // which stops the date from shifting backwards/forwards a day
    // when timezones get involved.
    const { error: insertError } = await supabase.from("weight_logs").insert({
      user_id: userId,
      weight: weightNumber,
      unit: unit,
      body_fat_percentage: bodyFatNumber,
      notes: notes.trim() === "" ? null : notes.trim(),
      logged_at: new Date(`${date}T12:00:00`).toISOString(),
    });

    setSaving(false);

    if (insertError) {
      setError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    // success: clear the form, reload + open the history, brief banner
    setSuccess("Weight saved!");
    setWeight("");
    setBodyFat("");
    setNotes("");
    setDate(getTodayString());
    fetchLogs(userId);
    setShowWeightHistory(true); // so you see the new entry land
    setTimeout(() => setSuccess(""), 4000);
  }

  // ---------- save a new measurements entry ----------
  async function handleSaveMeasurements() {
    setMError("");
    setMSuccess("");

    // Build the row: filled fields become numbers, blanks become null
    const row = {};
    let filledCount = 0;

    for (const field of MEASUREMENT_FIELDS) {
      const raw = mValues[field.key];
      if (raw === "") {
        row[field.key] = null;
      } else {
        const number = parseFloat(raw);
        if (isNaN(number) || number <= 0) {
          setMError(
            `${field.label} must be a number above 0 (or leave it blank).`
          );
          return;
        }
        row[field.key] = number;
        filledCount = filledCount + 1;
      }
    }

    if (filledCount === 0) {
      setMError("Enter at least one measurement.");
      return;
    }

    if (!mDate || mDate > today) {
      setMError("Please pick today's date or an earlier one.");
      return;
    }

    setMSaving(true);

    const { error: insertError } = await supabase
      .from("body_measurements")
      .insert({
        user_id: userId,
        ...row,
        unit: mUnit,
        notes: mNotes.trim() === "" ? null : mNotes.trim(),
        logged_at: new Date(`${mDate}T12:00:00`).toISOString(),
      });

    setMSaving(false);

    if (insertError) {
      setMError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    setMSuccess("Measurements saved!");
    setMValues(EMPTY_MEASUREMENTS);
    setMNotes("");
    setMDate(getTodayString());
    fetchMeasurements(userId);
    setShowMeasurementHistory(true); // so you see the new entry land
    setTimeout(() => setMSuccess(""), 4000);
  }

  // ---------- delete a weight entry ----------
  async function handleDelete(id) {
    const sure = window.confirm("Delete this weight entry?");
    if (!sure) return;

    setError("");
    const { error: deleteError } = await supabase
      .from("weight_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(
        `Couldn't delete entry: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setLogs((previous) => previous.filter((log) => log.id !== id));
    }
  }

  // ---------- delete a measurements entry ----------
  async function handleDeleteMeasurement(id) {
    const sure = window.confirm("Delete this measurements entry?");
    if (!sure) return;

    setMError("");
    const { error: deleteError } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setMError(
        `Couldn't delete entry: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setMeasurements((previous) =>
        previous.filter((entry) => entry.id !== id)
      );
    }
  }

  // ---------- handle typing in the measurement inputs ----------
  function handleMeasurementChange(key, value) {
    setMValues((previous) => ({ ...previous, [key]: value }));
  }

  // ---------- summary numbers (computed from logs) ----------
  const newest = logs.length > 0 ? logs[0] : null;
  const oldest = logs.length > 0 ? logs[logs.length - 1] : null;

  // Total change since the first entry, shown in the newest entry's unit.
  let totalChange = null;
  if (logs.length > 1) {
    const differenceInLbs =
      toLbs(parseFloat(newest.weight), newest.unit) -
      toLbs(parseFloat(oldest.weight), oldest.unit);
    totalChange = fromLbs(differenceInLbs, newest.unit);
  }

  // Change vs. the previous entry, for the little arrow on each row.
  function deltaForRow(index) {
    const current = logs[index];
    const previous = logs[index + 1]; // list is newest-first
    if (!previous) return null;
    const differenceInLbs =
      toLbs(parseFloat(current.weight), current.unit) -
      toLbs(parseFloat(previous.weight), previous.unit);
    return fromLbs(differenceInLbs, current.unit);
  }

  // Trend for one measurement: compares against the most recent OLDER
  // entry that actually has that measurement filled in (entries can
  // have blanks, so "the previous entry" isn't always enough).
  function measurementDeltaForRow(index, fieldKey) {
    const current = measurements[index];
    const currentValue = current[fieldKey];
    if (currentValue === null || currentValue === undefined) return null;

    for (let i = index + 1; i < measurements.length; i++) {
      const older = measurements[i];
      const olderValue = older[fieldKey];
      if (olderValue !== null && olderValue !== undefined) {
        const differenceInInches =
          toInches(parseFloat(currentValue), current.unit) -
          toInches(parseFloat(olderValue), older.unit);
        return fromInches(differenceInInches, current.unit);
      }
    }
    return null; // nothing older to compare against
  }

  // ---------- chart data ----------
  // The chart shows everything in ONE unit (the newest entry's unit),
  // so entries logged in different units still draw one smooth line.
  const chartUnit = newest ? newest.unit : "lbs";
  const hasMixedUnits = logs.some((log) => log.unit !== chartUnit);

  const cutoff = getCutoffDate(range);
  const chartData = logs
    .filter((log) => cutoff === null || new Date(log.logged_at) >= cutoff)
    .reverse() // oldest first, so the line reads left → right
    .map((log) => ({
      label: formatShortDate(log.logged_at),
      weight: Number(
        fromLbs(toLbs(parseFloat(log.weight), log.unit), chartUnit).toFixed(1)
      ),
    }));

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your progress...</p>
      </div>
    );
  }

  return (
    // If this page looks "double padded" compared to your dashboard,
    // your layout.js already adds padding — change p-8 below to p-0.
    <div className="p-8 max-w-6xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-slate-400 mt-1">
          Log your weight and watch the trend over time.
        </p>
      </div>

      {/* ---------- summary cards (only once there's data) ---------- */}
      {newest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Current weight</p>
            <p className="text-2xl font-bold text-white mt-1">
              {parseFloat(newest.weight).toFixed(1)} {newest.unit}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(newest.logged_at)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Starting weight</p>
            <p className="text-2xl font-bold text-white mt-1">
              {parseFloat(oldest.weight).toFixed(1)} {oldest.unit}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(oldest.logged_at)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Change</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalChange === null
                ? "—"
                : totalChange <= -0.05
                ? `↓ ${Math.abs(totalChange).toFixed(1)} ${newest.unit}`
                : totalChange >= 0.05
                ? `↑ ${totalChange.toFixed(1)} ${newest.unit}`
                : `0.0 ${newest.unit}`}
            </p>
            <p className="text-sm text-slate-500 mt-1">since first entry</p>
          </div>
        </div>
      )}

      {/* ---------- weight-over-time chart ---------- */}
      {newest && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white">
              Weight over time
            </h2>

            {/* range filter buttons */}
            <div className="flex flex-wrap gap-2">
              {RANGES.map((rangeOption) => (
                <button
                  key={rangeOption.key}
                  type="button"
                  onClick={() => setRange(rangeOption.key)}
                  className={
                    rangeOption.key === range
                      ? "px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
                      : "px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
                  }
                >
                  {rangeOption.label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-slate-500">
              No entries in this range yet — try "All time".
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#34d399" }}
                    formatter={(value) => [`${value} ${chartUnit}`, "Weight"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {hasMixedUnits && (
            <p className="text-sm text-slate-500 mt-3">
              Shown in {chartUnit} — entries logged in other units are
              converted automatically.
            </p>
          )}
        </div>
      )}

      {/* ================================================
          SIDE-BY-SIDE: weight (left) | measurements (right)
          Stacks into one column on phones.
          ================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT COLUMN: weight ---------- */}
        <div className="space-y-6">
          {/* log weight form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Log weight
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
                {success}
              </div>
            )}

            {/* unit toggle */}
            <div className="flex gap-2 mb-4">
              {UNITS.map((unitOption) => (
                <button
                  key={unitOption}
                  type="button"
                  onClick={() => setUnit(unitOption)}
                  className={
                    unitOption === unit
                      ? "px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                      : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }
                >
                  {unitOption}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Weight ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Body fat %{" "}
                  <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 24.5"
                  value={bodyFat}
                  onChange={(event) => setBodyFat(event.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  className={`${inputClasses} [color-scheme:dark]`}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Notes <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. morning weigh-in"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save entry"}
            </button>
          </div>

          {/* weight history — drop-down */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <button
              type="button"
              onClick={() => setShowWeightHistory((previous) => !previous)}
              aria-expanded={showWeightHistory}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-white">
                Weight history{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({logs.length})
                </span>
              </h2>
              <span className="text-slate-400">
                {showWeightHistory ? "▾" : "▸"}
              </span>
            </button>

            {showWeightHistory && (
              <div className="mt-4">
                {logs.length === 0 ? (
                  <p className="text-slate-500">
                    No entries yet — log your first weight and it will show up
                    here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {logs.map((log, index) => {
                      const delta = deltaForRow(index);
                      return (
                        <li
                          key={log.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-white font-semibold">
                              {parseFloat(log.weight).toFixed(1)} {log.unit}
                              {log.body_fat_percentage !== null &&
                                log.body_fat_percentage !== undefined && (
                                  <span className="text-slate-400 font-normal text-sm">
                                    {" "}
                                    ·{" "}
                                    {parseFloat(
                                      log.body_fat_percentage
                                    ).toFixed(1)}
                                    % body fat
                                  </span>
                                )}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatDate(log.logged_at)}
                              {log.notes ? ` — ${log.notes}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            {delta !== null && (
                              <span
                                className={
                                  delta <= -0.05
                                    ? "text-emerald-400 text-sm font-medium"
                                    : delta >= 0.05
                                    ? "text-slate-400 text-sm font-medium"
                                    : "text-slate-500 text-sm"
                                }
                              >
                                {delta <= -0.05
                                  ? `↓ ${Math.abs(delta).toFixed(1)}`
                                  : delta >= 0.05
                                  ? `↑ ${delta.toFixed(1)}`
                                  : "—"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(log.id)}
                              className="text-slate-500 hover:text-red-400 text-sm"
                              title="Delete entry"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- RIGHT COLUMN: body measurements ---------- */}
        <div className="space-y-6">
          {/* measurements form — optional, opens on click */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <button
              type="button"
              onClick={() => setShowMeasurementsForm((previous) => !previous)}
              aria-expanded={showMeasurementsForm}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Body measurements
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Optional — waist, hips, chest, arms, thighs
                </p>
              </div>
              <span className="text-slate-400">
                {showMeasurementsForm ? "▾" : "▸"}
              </span>
            </button>

            {/* banners sit outside the fold so errors are never hidden */}
            {mError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mt-4">
                {mError}
              </div>
            )}
            {mSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mt-4">
                {mSuccess}
              </div>
            )}

            {showMeasurementsForm && (
              <div className="mt-4">
                {/* how-to-measure guide */}
                <button
                  type="button"
                  onClick={() => setShowMeasureGuide((previous) => !previous)}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  {showMeasureGuide
                    ? "▾ How do I measure?"
                    : "▸ How do I measure?"}
                </button>

                {showMeasureGuide && (
                  <div className="bg-slate-800/50 rounded-lg p-4 mt-3 space-y-2">
                    {MEASURE_GUIDE.map((item) => (
                      <p key={item.label} className="text-sm">
                        <span className="text-white font-medium">
                          {item.label}:
                        </span>{" "}
                        <span className="text-slate-400">{item.how}</span>
                      </p>
                    ))}
                    <p className="text-sm text-slate-500 pt-1">
                      Tips: use a soft tape measure on bare skin, keep it snug
                      but not digging in, and measure at the same time of day
                      (mornings are most consistent). Consistency matters more
                      than precision.
                    </p>
                  </div>
                )}

                {/* in / cm toggle */}
                <div className="flex gap-2 mt-4 mb-4">
                  {MEASUREMENT_UNITS.map((unitOption) => (
                    <button
                      key={unitOption}
                      type="button"
                      onClick={() => setMUnit(unitOption)}
                      className={
                        unitOption === mUnit
                          ? "px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                          : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }
                    >
                      {unitOption}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-slate-400 mb-1">
                        {field.label} ({mUnit})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={mValues[field.key]}
                        onChange={(event) =>
                          handleMeasurementChange(
                            field.key,
                            event.target.value
                          )
                        }
                        className={inputClasses}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={mDate}
                      max={today}
                      onChange={(event) => setMDate(event.target.value)}
                      className={`${inputClasses} [color-scheme:dark]`}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-slate-400 mb-1">
                    Notes <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. measured after workout"
                    value={mNotes}
                    onChange={(event) => setMNotes(event.target.value)}
                    className={inputClasses}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveMeasurements}
                  disabled={mSaving}
                  className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
                >
                  {mSaving ? "Saving..." : "Save measurements"}
                </button>
              </div>
            )}
          </div>

          {/* measurement history — drop-down */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <button
              type="button"
              onClick={() =>
                setShowMeasurementHistory((previous) => !previous)
              }
              aria-expanded={showMeasurementHistory}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-white">
                Measurement history{" "}
                <span className="text-sm font-normal text-slate-500">
                  ({measurements.length})
                </span>
              </h2>
              <span className="text-slate-400">
                {showMeasurementHistory ? "▾" : "▸"}
              </span>
            </button>

            {showMeasurementHistory && (
              <div className="mt-4">
                {measurements.length === 0 ? (
                  <p className="text-slate-500">
                    No measurements yet — log your first set and it will show
                    up here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {measurements.map((entry, index) => (
                      <li key={entry.id} className="py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-500">
                              {formatDate(entry.logged_at)}
                              {entry.notes ? ` — ${entry.notes}` : ""}
                            </p>

                            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
                              {MEASUREMENT_FIELDS.map((field) => {
                                const value = entry[field.key];
                                if (value === null || value === undefined) {
                                  return null;
                                }
                                const delta = measurementDeltaForRow(
                                  index,
                                  field.key
                                );
                                return (
                                  <span key={field.key} className="text-sm">
                                    <span className="text-slate-500">
                                      {field.label}{" "}
                                    </span>
                                    <span className="text-white font-semibold">
                                      {parseFloat(value).toFixed(1)}{" "}
                                      {entry.unit}
                                    </span>
                                    {delta !== null && delta <= -0.05 && (
                                      <span className="text-emerald-400 font-medium">
                                        {" "}
                                        ↓{Math.abs(delta).toFixed(1)}
                                      </span>
                                    )}
                                    {delta !== null && delta >= 0.05 && (
                                      <span className="text-slate-400 font-medium">
                                        {" "}
                                        ↑{delta.toFixed(1)}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMeasurement(entry.id)}
                            className="text-slate-500 hover:text-red-400 text-sm"
                            title="Delete entry"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}