"use client";

// ============================================================
// LAB RESULTS PAGE  —  goes in:  app/(app)/lab-results/page.js
// (NEW page — create the folder "lab-results" inside app/(app)/
//  and a new file "page.js" inside it)
//
// Day 12, Step 3: log bloodwork and watch each biomarker trend
// over your treatment.
//
//   - Prepopulated biomarker list (HbA1c, fasting glucose,
//     cholesterol panel, testosterone, IGF-1, vitamin D, and
//     more) with the right unit options for each — Canadian
//     units first, US units available. "Other" lets you type
//     any custom marker + unit.
//   - One card per biomarker: latest value, change vs your
//     previous test, expandable trend chart + full history.
//     Change arrows are NEUTRAL grey on purpose — for labs,
//     up or down isn't automatically good or bad.
//   - Charts only plot entries in the SAME unit as your latest
//     test. Medical units are never auto-converted (mmol/L ↔
//     mg/dL factors differ per marker — too risky to guess).
//     Mixed-unit history still shows in the list.
//   - Entering a whole panel is fast: after each save, the
//     date stays put (same lab report = same date) and only
//     the value clears.
//
// Requires the rebuilt lab_results table — run the SQL from
// the chat FIRST.
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

// Common biomarkers with their usual units.
// First unit = default (Canadian convention where they differ).
const BIOMARKERS = [
  { name: "HbA1c", units: ["%", "mmol/mol"] },
  { name: "Fasting Glucose", units: ["mmol/L", "mg/dL"] },
  { name: "Fasting Insulin", units: ["pmol/L", "µIU/mL"] },
  { name: "Total Cholesterol", units: ["mmol/L", "mg/dL"] },
  { name: "LDL Cholesterol", units: ["mmol/L", "mg/dL"] },
  { name: "HDL Cholesterol", units: ["mmol/L", "mg/dL"] },
  { name: "Triglycerides", units: ["mmol/L", "mg/dL"] },
  { name: "ALT", units: ["U/L"] },
  { name: "AST", units: ["U/L"] },
  { name: "Creatinine", units: ["µmol/L", "mg/dL"] },
  { name: "eGFR", units: ["mL/min/1.73m²"] },
  { name: "TSH", units: ["mIU/L"] },
  { name: "Free T4", units: ["pmol/L", "ng/dL"] },
  { name: "Testosterone (Total)", units: ["nmol/L", "ng/dL"] },
  { name: "Estradiol", units: ["pmol/L", "pg/mL"] },
  { name: "IGF-1", units: ["µg/L", "ng/mL"] },
  { name: "Vitamin D (25-OH)", units: ["nmol/L", "ng/mL"] },
  { name: "Vitamin B12", units: ["pmol/L", "pg/mL"] },
  { name: "Ferritin", units: ["µg/L", "ng/mL"] },
  { name: "CRP", units: ["mg/L"] },
  { name: "Hemoglobin", units: ["g/L", "g/dL"] },
  { name: "Other", units: [] },
];

// ---------------- helper functions ----------------

// Today's date as "YYYY-MM-DD" in YOUR timezone.
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Formats a date-only value like "2026-06-10" safely (without
// the UTC midnight problem) into e.g. "Jun 10, 2026"
function formatDate(dateValue) {
  const safe =
    typeof dateValue === "string" && dateValue.length === 10
      ? `${dateValue}T12:00:00`
      : dateValue;
  return new Date(safe).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Shorter version for chart axes, e.g. "Jun 10"
function formatShortDate(dateValue) {
  const safe =
    typeof dateValue === "string" && dateValue.length === 10
      ? `${dateValue}T12:00:00`
      : dateValue;
  return new Date(safe).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// 5.70000001 → "5.7"
function trimValue(value) {
  return parseFloat(parseFloat(value).toFixed(2)).toString();
}

// Shared styling for inputs (matches the design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function LabResultsPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [expandedBiomarker, setExpandedBiomarker] = useState(null);

  // form fields
  const [biomarker, setBiomarker] = useState("");
  const [customName, setCustomName] = useState("");
  const [labUnit, setLabUnit] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [value, setValue] = useState("");
  const [testDate, setTestDate] = useState(getTodayString());
  const [lNotes, setLNotes] = useState("");

  // ui feedback
  const [lSaving, setLSaving] = useState(false);
  const [lError, setLError] = useState("");
  const [lSuccess, setLSuccess] = useState("");

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
      await fetchResults(session.user.id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fetch this user's lab results ----------
  async function fetchResults(uid) {
    const { data, error: fetchError } = await supabase
      .from("lab_results")
      .select("*")
      .eq("user_id", uid)
      .order("tested_at", { ascending: false });

    if (fetchError) {
      setLError(
        `Couldn't load lab results: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setResults(data || []);
    }
  }

  // ---------- when the biomarker changes, set its default unit ----------
  function handleBiomarkerChange(name) {
    setBiomarker(name);
    const found = BIOMARKERS.find((b) => b.name === name);
    if (found && found.units.length > 0) {
      setLabUnit(found.units[0]);
    } else {
      setLabUnit("");
    }
  }

  // ---------- save a result ----------
  async function handleSaveResult() {
    setLError("");
    setLSuccess("");

    const name =
      biomarker === "Other" ? customName.trim() : biomarker;
    if (!name) {
      setLError(
        biomarker === "Other"
          ? "Type the biomarker's name."
          : "Select a biomarker."
      );
      return;
    }

    const valueNumber = parseFloat(value);
    if (value === "" || isNaN(valueNumber) || valueNumber < 0) {
      setLError("Enter a valid result value.");
      return;
    }

    if (!testDate || testDate > today) {
      setLError("Please pick today's date or an earlier one.");
      return;
    }

    const unitToSave =
      biomarker === "Other"
        ? customUnit.trim() === ""
          ? null
          : customUnit.trim()
        : labUnit;

    setLSaving(true);

    const { error: insertError } = await supabase
      .from("lab_results")
      .insert({
        user_id: userId,
        biomarker: name,
        value: valueNumber,
        unit: unitToSave,
        tested_at: testDate, // date column — the string saves cleanly
        notes: lNotes.trim() === "" ? null : lNotes.trim(),
      });

    setLSaving(false);

    if (insertError) {
      setLError(
        `${insertError.message} | Code: ${insertError.code || "?"}`
      );
      return;
    }

    // Keep biomarker + date (same lab report = same date),
    // clear just the value and notes for fast panel entry.
    setLSuccess(`${name} saved!`);
    setValue("");
    setLNotes("");
    fetchResults(userId);
    setExpandedBiomarker(name.toLowerCase());
    setTimeout(() => setLSuccess(""), 4000);
  }

  // ---------- delete a result ----------
  async function handleDeleteResult(id) {
    const sure = window.confirm("Delete this lab result?");
    if (!sure) return;

    setLError("");
    const { error: deleteError } = await supabase
      .from("lab_results")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setLError(
        `Couldn't delete: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setResults((previous) =>
        previous.filter((row) => row.id !== id)
      );
    }
  }

  // ---------- group results by biomarker ----------
  // One object per biomarker: { key, displayName, entries
  // (newest first), latest, delta (vs previous same-unit test),
  // hasMixedUnits }
  function buildBoard() {
    const groups = {};

    for (const row of results) {
      const key = row.biomarker.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          key: key,
          displayName: row.biomarker.trim(),
          entries: [],
        };
      }
      groups[key].entries.push({ ...row });
    }

    const board = Object.values(groups);

    for (const marker of board) {
      marker.entries.sort((a, b) => {
        const byDate =
          new Date(`${b.tested_at}T12:00:00`) -
          new Date(`${a.tested_at}T12:00:00`);
        if (byDate !== 0) return byDate;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      marker.latest = marker.entries[0];

      // change vs the previous test IN THE SAME UNIT
      marker.delta = null;
      const previousSameUnit = marker.entries
        .slice(1)
        .find((e) => (e.unit || "") === (marker.latest.unit || ""));
      if (previousSameUnit) {
        marker.delta =
          parseFloat(marker.latest.value) -
          parseFloat(previousSameUnit.value);
      }

      marker.hasMixedUnits = marker.entries.some(
        (e) => (e.unit || "") !== (marker.latest.unit || "")
      );
    }

    board.sort(
      (a, b) =>
        new Date(`${b.latest.tested_at}T12:00:00`) -
        new Date(`${a.latest.tested_at}T12:00:00`)
    );
    return board;
  }

  const board = buildBoard();

  const lastTestDate = results.length > 0 ? board[0].latest.tested_at : null;

  const selectedBiomarkerData = BIOMARKERS.find(
    (b) => b.name === biomarker
  );

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your lab results...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Lab Results</h1>
        <p className="text-slate-400 mt-1">
          Watch your health markers move over the course of treatment.
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Tracking only, not medical advice — review your results with your
          doctor.
        </p>
      </div>

      {/* ---------- summary cards ---------- */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Biomarkers tracked</p>
            <p className="text-2xl font-bold text-white mt-1">
              {board.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Results logged</p>
            <p className="text-2xl font-bold text-white mt-1">
              {results.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Last test</p>
            <p className="text-2xl font-bold text-white mt-1">
              {lastTestDate ? formatDate(lastTestDate) : "—"}
            </p>
          </div>
        </div>
      )}

      {/* ================================================
          SIDE-BY-SIDE: biomarker board (left) | form (right)
          ================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT COLUMN: biomarker cards ---------- */}
        <div className="space-y-4">
          {board.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-500">
                No results yet — log your first lab value with the form and
                each biomarker will get its own trend card here.
              </p>
            </div>
          ) : (
            board.map((marker) => {
              const isOpen = expandedBiomarker === marker.key;

              // trend chart: same-unit entries only, oldest → newest
              const sameUnitAscending = marker.entries
                .filter(
                  (e) => (e.unit || "") === (marker.latest.unit || "")
                )
                .slice()
                .reverse();
              const trendData = sameUnitAscending.map((e) => ({
                label: formatShortDate(e.tested_at),
                value: parseFloat(e.value),
              }));

              return (
                <div
                  key={marker.key}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBiomarker(isOpen ? null : marker.key)
                    }
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between text-left gap-4"
                  >
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {marker.displayName}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          ({marker.entries.length})
                        </span>
                      </h2>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Latest:{" "}
                        <span className="text-white font-semibold">
                          {trimValue(marker.latest.value)}
                          {marker.latest.unit
                            ? ` ${marker.latest.unit}`
                            : ""}
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · {formatDate(marker.latest.tested_at)}
                        </span>
                        {marker.delta !== null &&
                          Math.abs(marker.delta) >= 0.005 && (
                            <span
                              className="text-slate-300 font-medium"
                              title="Change vs your previous test"
                            >
                              {" "}
                              {marker.delta > 0 ? "↑" : "↓"}{" "}
                              {trimValue(Math.abs(marker.delta))}
                            </span>
                          )}
                      </p>
                    </div>
                    <span className="text-slate-400">
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-4">
                      {trendData.length >= 2 && (
                        <div className="h-40 w-full mb-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={trendData}
                              margin={{
                                top: 5,
                                right: 10,
                                left: 0,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid
                                stroke="#1e293b"
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="label"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                                minTickGap={24}
                              />
                              <YAxis
                                domain={["auto", "auto"]}
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                                width={45}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#0f172a",
                                  border: "1px solid #334155",
                                  borderRadius: "8px",
                                }}
                                labelStyle={{ color: "#94a3b8" }}
                                itemStyle={{ color: "#34d399" }}
                                formatter={(v) => [
                                  `${v}${
                                    marker.latest.unit
                                      ? ` ${marker.latest.unit}`
                                      : ""
                                  }`,
                                  marker.displayName,
                                ]}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{
                                  r: 3,
                                  fill: "#10b981",
                                  strokeWidth: 0,
                                }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {marker.hasMixedUnits && (
                        <p className="text-xs text-slate-500 mb-3">
                          Chart shows tests in {marker.latest.unit || "the latest unit"} only — entries in other units appear in the
                          list below but aren't charted (medical units
                          aren't auto-converted).
                        </p>
                      )}

                      <ul className="divide-y divide-slate-800">
                        {marker.entries.map((entry) => (
                          <li
                            key={entry.id}
                            className="py-3 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-white font-semibold">
                                {trimValue(entry.value)}
                                {entry.unit ? ` ${entry.unit}` : ""}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatDate(entry.tested_at)}
                                {entry.notes ? ` — ${entry.notes}` : ""}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteResult(entry.id)}
                              className="text-slate-500 hover:text-red-400 text-sm"
                              title="Delete result"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ---------- RIGHT COLUMN: log form ---------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Log a result
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Entering a whole panel? The date stays put between saves —
            just change the biomarker and value.
          </p>

          {lError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {lError}
            </div>
          )}
          {lSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
              {lSuccess}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">
              Biomarker
            </label>
            <select
              value={biomarker}
              onChange={(event) => handleBiomarkerChange(event.target.value)}
              className={inputClasses}
            >
              <option value="">Select a biomarker...</option>
              {BIOMARKERS.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {biomarker === "Other" && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Marker name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lipase"
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Unit <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. U/L"
                  value={customUnit}
                  onChange={(event) => setCustomUnit(event.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Value
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.0"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={inputClasses}
              />
            </div>

            {biomarker !== "Other" && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Unit
                </label>
                <select
                  value={labUnit}
                  onChange={(event) => setLabUnit(event.target.value)}
                  disabled={
                    !selectedBiomarkerData ||
                    selectedBiomarkerData.units.length === 0
                  }
                  className={`${inputClasses} disabled:opacity-50`}
                >
                  {selectedBiomarkerData &&
                    selectedBiomarkerData.units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Test date
              </label>
              <input
                type="date"
                value={testDate}
                max={today}
                onChange={(event) => setTestDate(event.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Notes <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. fasted, 9am draw"
                value={lNotes}
                onChange={(event) => setLNotes(event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveResult}
            disabled={lSaving}
            className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
          >
            {lSaving ? "Saving..." : "Save result"}
          </button>
        </div>
      </div>
    </div>
  );
}