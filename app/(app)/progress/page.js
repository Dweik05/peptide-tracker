"use client";

// ============================================================
// PROGRESS PAGE  —  goes in:  app/(app)/progress/page.js
//
// Day 11, Step 2: adds the WEIGHT-OVER-TIME LINE CHART
// (Recharts) with date-range filters: 7 days / 30 days /
// 3 months / all time.
//
// Everything from Step 1 is still here, unchanged:
//   - weight logging saved to Supabase (weight_logs)
//   - lbs / kg / st toggle, "0.0" placeholders, max={today}
//   - summary cards, per-entry change arrows, delete button
//
// Requires the recharts package:  npm install recharts
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

// The four chart range buttons
const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "3m", label: "3 months" },
  { key: "all", label: "All time" },
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

// Convert any weight into lbs so entries can be compared
// even if one was logged in kg and another in lbs or st.
function toLbs(value, unit) {
  if (unit === "kg") return value * 2.20462;
  if (unit === "st") return value * 14;
  return value; // already lbs
}

// Convert a lbs value back into whichever unit we're displaying.
function fromLbs(value, unit) {
  if (unit === "kg") return value / 2.20462;
  if (unit === "st") return value / 14;
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

export default function ProgressPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true); // first page load
  const [logs, setLogs] = useState([]); // weight history, newest first
  const [range, setRange] = useState("30d"); // selected chart range

  // form fields
  const [unit, setUnit] = useState("lbs");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");

  // ui feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------- load session + history when the page opens ----------
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

  // ---------- save a new entry ----------
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

    // success: clear the form, reload history, show a banner briefly
    setSuccess("Weight saved!");
    setWeight("");
    setBodyFat("");
    setNotes("");
    setDate(getTodayString());
    fetchLogs(userId);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ---------- delete an entry ----------
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
    <div className="p-8 max-w-5xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-slate-400 mt-1">
          Log your weight and watch the trend over time.
        </p>
      </div>

      {/* ---------- error / success banners ---------- */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

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

      {/* ---------- weight-over-time chart (new in Step 2) ---------- */}
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

      {/* ---------- log form ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Log weight</h2>

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
              Body fat % <span className="text-slate-500">(optional)</span>
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
            <label className="block text-sm text-slate-400 mb-1">Date</label>
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

      {/* ---------- weight history ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Weight history
        </h2>

        {logs.length === 0 ? (
          <p className="text-slate-500">
            No entries yet — log your first weight above and it will show up
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
                            · {parseFloat(log.body_fat_percentage).toFixed(1)}%
                            body fat
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
    </div>
  );
}