"use client";

// ============================================================
// SIDE EFFECTS PAGE  —  goes in:  app/(app)/side-effects/page.js
// (replaces the "coming soon" placeholder — paste over it all)
//
// Day 14: symptom tracking + the correlation timeline.
//
//   - Tap a symptom chip (22 common ones + Other), pick a
//     1–10 severity (color-coded: 1–3 green, 4–6 amber,
//     7–10 red), set when it happened, save.
//   - Effect board: one card per symptom — latest severity,
//     when, expandable severity-trend chart + full history.
//   - THE CORRELATION TIMELINE: doses (▲ on the baseline) and
//     side effects (● placed by severity) on one shared time
//     axis, filterable by effect, peptide, and 30/90 days —
//     plus a computed insight: how many of your logs landed
//     within 24h of a dose, which peptide most often preceded
//     them, and the typical gap. Patterns, not proof — but
//     exactly the thing worth showing a doctor.
//
// Requires the rebuilt side_effect_logs table — run the SQL
// from the chat FIRST.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

// Common side effects for peptide / GLP-1 users — shown as
// tappable chips. "Other" reveals a free-text field.
const COMMON_EFFECTS = [
  "Nausea",
  "Vomiting",
  "Diarrhea",
  "Constipation",
  "Fatigue",
  "Headache",
  "Dizziness",
  "Loss of appetite",
  "Heartburn / reflux",
  "Bloating",
  "Stomach pain",
  "Injection site redness",
  "Injection site itching",
  "Injection site bruising",
  "Insomnia",
  "Anxiety",
  "Heart palpitations",
  "Flushing",
  "Joint pain",
  "Hair shedding",
  "Low blood sugar feeling",
  "Other",
];

// ---------------- helper functions ----------------

// Local date+time as "YYYY-MM-DDTHH:MM" for the picker
function getLocalDateTimeString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// "Jun 9, 3:12 PM"
function formatDateTime(value) {
  const d = new Date(value);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

// "Jun 9" — for chart axes
function formatShortDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Severity bands: 1–3 mild, 4–6 moderate, 7–10 severe
function severityHex(severity) {
  if (severity <= 3) return "#10b981"; // emerald
  if (severity <= 6) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function severityClasses(severity) {
  if (severity <= 3)
    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  if (severity <= 6)
    return "bg-amber-500/10 border-amber-500/20 text-amber-400";
  return "bg-red-500/10 border-red-500/20 text-red-400";
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Shared input styling (design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

// Custom tooltip for the correlation timeline — shows different
// content for dose markers vs side-effect dots.
function TimelineTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm">
      {point.kind === "dose" ? (
        <>
          <p className="text-emerald-400 font-semibold">💉 {point.label}</p>
          <p className="text-slate-400">{formatDateTime(point.ts)}</p>
        </>
      ) : (
        <>
          <p className="text-white font-semibold">
            {point.name} — severity {point.severity}
          </p>
          <p className="text-slate-400">{formatDateTime(point.ts)}</p>
        </>
      )}
    </div>
  );
}

export default function SideEffectsPage() {
  const router = useRouter();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [effects, setEffects] = useState([]); // side_effect_logs rows
  const [doses, setDoses] = useState([]); // last 90 days of dose_logs
  const [expandedEffect, setExpandedEffect] = useState(null);

  // timeline filters
  const [rangeDays, setRangeDays] = useState(30);
  const [effectFilter, setEffectFilter] = useState("all");
  const [peptideFilter, setPeptideFilter] = useState("all");

  // form fields
  const [chosenEffect, setChosenEffect] = useState("");
  const [customEffect, setCustomEffect] = useState("");
  const [severity, setSeverity] = useState(null);
  const [happenedAt, setHappenedAt] = useState(getLocalDateTimeString());
  const [seNotes, setSeNotes] = useState("");

  // ui feedback
  const [seSaving, setSeSaving] = useState(false);
  const [seError, setSeError] = useState("");
  const [seSuccess, setSeSuccess] = useState("");

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
      await Promise.all([
        fetchEffects(session.user.id),
        fetchDoses(session.user.id),
      ]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEffects(uid) {
    const { data, error: fetchError } = await supabase
      .from("side_effect_logs")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });

    if (fetchError) {
      setSeError(
        `Couldn't load side effects: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setEffects(data || []);
    }
  }

  async function fetchDoses(uid) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data } = await supabase
      .from("dose_logs")
      .select("id, peptide_name, dose_amount, unit, logged_at")
      .eq("user_id", uid)
      .gte("logged_at", ninetyDaysAgo.toISOString())
      .order("logged_at", { ascending: false });
    setDoses(data || []);
  }

  // ---------- save a side effect ----------
  async function handleSaveEffect() {
    setSeError("");
    setSeSuccess("");

    const name =
      chosenEffect === "Other" ? customEffect.trim() : chosenEffect;
    if (!name) {
      setSeError(
        chosenEffect === "Other"
          ? "Type the symptom's name."
          : "Tap a symptom chip first."
      );
      return;
    }

    if (!severity) {
      setSeError("Pick a severity from 1 to 10.");
      return;
    }

    if (!happenedAt || happenedAt > getLocalDateTimeString()) {
      setSeError("Time can't be in the future.");
      return;
    }

    setSeSaving(true);

    const { error: insertError } = await supabase
      .from("side_effect_logs")
      .insert({
        user_id: userId,
        effect_name: name,
        severity: severity,
        logged_at: happenedAt,
        notes: seNotes.trim() === "" ? null : seNotes.trim(),
      });

    setSeSaving(false);

    if (insertError) {
      setSeError(
        `${insertError.message} | Code: ${insertError.code || "?"}`
      );
      return;
    }

    setSeSuccess(
      severity >= 8
        ? `${name} logged. That's a high severity — if it's intense or getting worse, please check in with your doctor.`
        : `${name} logged.`
    );
    setChosenEffect("");
    setCustomEffect("");
    setSeverity(null);
    setSeNotes("");
    setHappenedAt(getLocalDateTimeString());
    fetchEffects(userId);
    setExpandedEffect(name.toLowerCase());
    setTimeout(() => setSeSuccess(""), 6000);
  }

  // ---------- delete a side effect ----------
  async function handleDeleteEffect(id) {
    const sure = window.confirm("Delete this side effect log?");
    if (!sure) return;

    setSeError("");
    const { error: deleteError } = await supabase
      .from("side_effect_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setSeError(
        `Couldn't delete: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setEffects((previous) => previous.filter((row) => row.id !== id));
    }
  }

  // ---------- effect board (grouped by symptom) ----------
  function buildBoard() {
    const groups = {};

    for (const row of effects) {
      const key = row.effect_name.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          key: key,
          displayName: row.effect_name.trim(),
          entries: [],
        };
      }
      groups[key].entries.push({ ...row });
    }

    const board = Object.values(groups);

    for (const symptom of board) {
      symptom.entries.sort(
        (a, b) => new Date(b.logged_at) - new Date(a.logged_at)
      );
      symptom.latest = symptom.entries[0];
    }

    board.sort(
      (a, b) => new Date(b.latest.logged_at) - new Date(a.latest.logged_at)
    );
    return board;
  }

  const board = buildBoard();

  // most frequent symptom (for the summary card)
  const mostFrequent =
    board.length > 0
      ? [...board].sort((a, b) => b.entries.length - a.entries.length)[0]
      : null;

  // ---------- correlation timeline data ----------
  const rangeEnd = Date.now();
  const rangeStart = rangeEnd - rangeDays * 24 * 60 * 60 * 1000;

  const dosedPeptides = [
    ...new Set(doses.map((d) => d.peptide_name.trim())),
  ].sort();

  const effectPoints = effects
    .filter((e) => {
      const ts = new Date(e.logged_at).getTime();
      if (ts < rangeStart || ts > rangeEnd) return false;
      if (
        effectFilter !== "all" &&
        e.effect_name.trim().toLowerCase() !== effectFilter
      )
        return false;
      return true;
    })
    .map((e) => ({
      ts: new Date(e.logged_at).getTime(),
      y: e.severity,
      severity: e.severity,
      name: e.effect_name.trim(),
      kind: "effect",
    }));

  const dosePoints = doses
    .filter((d) => {
      const ts = new Date(d.logged_at).getTime();
      if (ts < rangeStart || ts > rangeEnd) return false;
      if (peptideFilter !== "all" && d.peptide_name.trim() !== peptideFilter)
        return false;
      return true;
    })
    .map((d) => ({
      ts: new Date(d.logged_at).getTime(),
      y: 0,
      label: `${parseFloat(d.dose_amount)} ${d.unit} ${d.peptide_name}`,
      peptideName: d.peptide_name.trim(),
      kind: "dose",
    }));

  // ---------- the correlation insight ----------
  // For each side effect in view, find the nearest dose BEFORE
  // it (within 48h). Count how many fell within 24h, which
  // peptide most often preceded, and the typical (median) gap.
  let insight = null;
  if (effectPoints.length > 0 && dosePoints.length > 0) {
    const gaps = [];
    let within24 = 0;
    const peptideCounts = {};

    for (const e of effectPoints) {
      let best = null;
      for (const d of dosePoints) {
        const gapHours = (e.ts - d.ts) / 3600000;
        if (gapHours >= 0 && gapHours <= 48) {
          if (best === null || gapHours < best.gapHours) {
            best = { gapHours, peptideName: d.peptideName };
          }
        }
      }
      if (best) {
        gaps.push(best.gapHours);
        if (best.gapHours <= 24) within24 = within24 + 1;
        peptideCounts[best.peptideName] =
          (peptideCounts[best.peptideName] || 0) + 1;
      }
    }

    if (gaps.length > 0) {
      const topPeptide = Object.entries(peptideCounts).sort(
        (a, b) => b[1] - a[1]
      )[0];
      insight = {
        within24: within24,
        total: effectPoints.length,
        topPeptideName: topPeptide[0],
        topPeptideCount: topPeptide[1],
        medianGap: Math.round(median(gaps)),
      };
    }
  }

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your side effects...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Side Effects</h1>
        <p className="text-slate-400 mt-1">
          Track symptoms and see how they line up with your doses.
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Tracking only, not medical advice — severe or persistent symptoms
          deserve a call to your doctor.
        </p>
      </div>

      {/* ---------- summary cards ---------- */}
      {effects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Symptoms tracked</p>
            <p className="text-2xl font-bold text-white mt-1">
              {board.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Total logs</p>
            <p className="text-2xl font-bold text-white mt-1">
              {effects.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Most frequent</p>
            <p className="text-2xl font-bold text-white mt-1">
              {mostFrequent ? mostFrequent.displayName : "—"}
            </p>
            {mostFrequent && (
              <p className="text-sm text-slate-500 mt-1">
                {mostFrequent.entries.length}{" "}
                {mostFrequent.entries.length === 1 ? "log" : "logs"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================================================
          CORRELATION TIMELINE (full width)
          ================================================ */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">
            Correlation timeline
          </h2>

          <div className="flex flex-wrap gap-2">
            {/* effect filter */}
            <select
              value={effectFilter}
              onChange={(event) => setEffectFilter(event.target.value)}
              className="bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All symptoms</option>
              {board.map((symptom) => (
                <option key={symptom.key} value={symptom.key}>
                  {symptom.displayName}
                </option>
              ))}
            </select>

            {/* peptide filter */}
            <select
              value={peptideFilter}
              onChange={(event) => setPeptideFilter(event.target.value)}
              className="bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All peptides</option>
              {dosedPeptides.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* range toggle */}
            {[30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={
                  rangeDays === days
                    ? "px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
                    : "px-3 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
                }
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {effectPoints.length === 0 && dosePoints.length === 0 ? (
          <p className="text-slate-500">
            Nothing in this window yet — log doses and symptoms and they'll
            appear here together.
          </p>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    domain={[rangeStart, rangeEnd]}
                    tickFormatter={formatShortDate}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    width={30}
                    label={{
                      value: "Severity",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <ZAxis range={[70, 70]} />
                  <Tooltip
                    content={<TimelineTooltip />}
                    cursor={{ stroke: "#334155", strokeDasharray: "3 3" }}
                  />

                  {/* doses sit on the baseline as triangles */}
                  <Scatter
                    data={dosePoints}
                    shape="triangle"
                    fill="#34d399"
                    opacity={0.9}
                  />

                  {/* side effects placed by severity, colored by band */}
                  <Scatter data={effectPoints} shape="circle">
                    {effectPoints.map((point, index) => (
                      <Cell key={index} fill={severityHex(point.severity)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              ▲ dose (baseline) · ● side effect — green 1–3, amber 4–6,
              red 7–10
            </p>

            {insight && (
              <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm text-white">
                  <span className="font-semibold">
                    {insight.within24} of {insight.total}
                  </span>{" "}
                  logged{" "}
                  {effectFilter === "all"
                    ? "symptoms"
                    : `"${board.find((s) => s.key === effectFilter)?.displayName}" logs`}{" "}
                  came within 24 hours of a dose
                  {insight.medianGap !== null
                    ? ` — typical gap ~${insight.medianGap}h`
                    : ""}
                  .
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Most often after:{" "}
                  <span className="text-white font-semibold">
                    {insight.topPeptideName}
                  </span>{" "}
                  ({insight.topPeptideCount}×). Patterns, not proof — worth
                  bringing to your doctor.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================
          SIDE-BY-SIDE: effect board (left) | form (right)
          ================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT COLUMN: effect cards ---------- */}
        <div className="space-y-4">
          {board.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-500">
                Nothing logged yet — tap a symptom chip in the form and each
                symptom will get its own trend card here.
              </p>
            </div>
          ) : (
            board.map((symptom) => {
              const isOpen = expandedEffect === symptom.key;

              const trendData = symptom.entries
                .slice()
                .reverse()
                .map((entry) => ({
                  label: formatShortDate(entry.logged_at),
                  value: entry.severity,
                }));

              return (
                <div
                  key={symptom.key}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedEffect(isOpen ? null : symptom.key)
                    }
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between text-left gap-4"
                  >
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {symptom.displayName}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          ({symptom.entries.length})
                        </span>
                      </h2>
                      <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold border rounded-md px-2 py-0.5 ${severityClasses(
                            symptom.latest.severity
                          )}`}
                        >
                          {symptom.latest.severity}/10
                        </span>
                        <span className="text-slate-500">
                          {formatDateTime(symptom.latest.logged_at)}
                        </span>
                      </p>
                    </div>
                    <span className="text-slate-400">
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-4">
                      {trendData.length >= 2 && (
                        <div className="h-36 w-full mb-4">
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
                                domain={[0, 10]}
                                ticks={[0, 2, 4, 6, 8, 10]}
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: "#334155" }}
                                width={30}
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
                                  `${v}/10`,
                                  "Severity",
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

                      <ul className="divide-y divide-slate-800">
                        {symptom.entries.map((entry) => (
                          <li
                            key={entry.id}
                            className="py-3 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-white font-semibold flex items-center gap-2">
                                <span
                                  className={`text-xs font-semibold border rounded-md px-2 py-0.5 ${severityClasses(
                                    entry.severity
                                  )}`}
                                >
                                  {entry.severity}/10
                                </span>
                                <span className="text-sm text-slate-400 font-normal">
                                  {formatDateTime(entry.logged_at)}
                                </span>
                              </p>
                              {entry.notes && (
                                <p className="text-sm text-slate-500 mt-1">
                                  {entry.notes}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteEffect(entry.id)}
                              className="text-slate-500 hover:text-red-400 text-sm"
                              title="Delete log"
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
            Log a side effect
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Tap a symptom, rate it, done.
          </p>

          {seError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {seError}
            </div>
          )}
          {seSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
              {seSuccess}
            </div>
          )}

          {/* symptom chips */}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">
              Symptom
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_EFFECTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setChosenEffect(name)}
                  className={
                    chosenEffect === name
                      ? "px-3 py-1.5 rounded-full bg-emerald-500 text-white text-sm font-semibold"
                      : "px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {chosenEffect === "Other" && (
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Describe the symptom
              </label>
              <input
                type="text"
                placeholder="e.g. Metallic taste"
                value={customEffect}
                onChange={(event) => setCustomEffect(event.target.value)}
                className={inputClasses}
              />
            </div>
          )}

          {/* severity 1–10 */}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">
              Severity
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                const selected = severity === level;
                let selectedClasses = "bg-emerald-500 text-white";
                if (level > 3 && level <= 6)
                  selectedClasses = "bg-amber-500 text-white";
                if (level > 6) selectedClasses = "bg-red-500 text-white";

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold ${
                      selected
                        ? selectedClasses
                        : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              1 = barely noticeable · 10 = unbearable
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                When it happened
              </label>
              <input
                type="datetime-local"
                value={happenedAt}
                max={getLocalDateTimeString()}
                onChange={(event) => setHappenedAt(event.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Notes <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. eased after eating"
                value={seNotes}
                onChange={(event) => setSeNotes(event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveEffect}
            disabled={seSaving}
            className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
          >
            {seSaving ? "Saving..." : "Log side effect"}
          </button>
        </div>
      </div>
    </div>
  );
}