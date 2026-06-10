"use client";

// ============================================================
// GYM PR TRACKER  —  goes in:  app/(app)/gym/page.js
// (this is a NEW page — create the folder "gym" inside
//  app/(app)/ and a new file "page.js" inside that)
//
// What this page does:
//   - Log a set for ANY exercise (you type the name; it
//     autocompletes from your own history)
//   - Two kinds of entries, picked with a toggle:
//       Lift   = weight × reps (lbs/kg) with a live
//                "estimated 1RM" using the Epley formula
//       Cardio = time (minutes:seconds) and/or distance
//                with a km / m / mi toggle
//   - PR board: one card per exercise showing your current
//     best, with a 🏆 on every entry that was a PR when you
//     logged it, an expandable full history, and a strength
//     trend chart for lifts
//
// How a "PR" is decided:
//   - Lifts: ranked by ESTIMATED 1RM, so 225 × 5 (est. 262)
//     beats 245 × 1 (245). Reps = 1 counts as your real 1RM.
//   - Cardio: best pace wins when an entry has BOTH time and
//     distance; otherwise longest distance; otherwise longest
//     time. (Tip: for runs, log both so pace counts.)
//
// Requires the gym_logs table — run the SQL from the chat
// in Supabase's SQL Editor BEFORE using this page.
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

const WEIGHT_UNITS = ["lbs", "kg"];
const DISTANCE_UNITS = ["km", "m", "mi"];
const ENTRY_TYPES = [
  { key: "lift", label: "Lift" },
  { key: "cardio", label: "Cardio" },
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

// ----- weight unit conversion (lbs / kg) -----
function toLbs(value, unit) {
  if (unit === "kg") return value * 2.20462;
  return value;
}

function fromLbs(value, unit) {
  if (unit === "kg") return value / 2.20462;
  return value;
}

// ----- distance conversion (everything compared in km) -----
function toKm(value, unit) {
  if (unit === "mi") return value * 1.60934;
  if (unit === "m") return value / 1000;
  return value; // already km
}

// Epley formula: estimated one-rep max from a weight × reps set.
// A true single (reps = 1) IS the 1RM, so no formula needed.
function estimateOneRm(weight, reps) {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

// Turns a database timestamp into e.g. "Jun 10, 2026"
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Shorter version for chart axes, e.g. "Jun 10"
function formatShortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// 1530 seconds → "25:30"
function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// "225.0 lbs × 5"
function describeLift(entry) {
  return `${parseFloat(entry.weight).toFixed(1)} ${entry.weight_unit} × ${
    entry.reps
  }`;
}

// "5 km in 24:30 (4:54 /km)" — or just the parts that exist
function describeCardio(entry) {
  const hasDistance =
    entry.distance !== null &&
    entry.distance !== undefined &&
    parseFloat(entry.distance) > 0;
  const hasTime =
    entry.duration_seconds !== null &&
    entry.duration_seconds !== undefined &&
    entry.duration_seconds > 0;

  const parts = [];
  if (hasDistance) {
    parts.push(`${parseFloat(entry.distance)} ${entry.distance_unit}`);
  }
  if (hasTime) {
    parts.push(formatDuration(entry.duration_seconds));
  }

  let text = parts.join(" in ");

  if (hasDistance && hasTime) {
    const paceSeconds = entry.duration_seconds / parseFloat(entry.distance);
    text =
      text +
      ` (${formatDuration(paceSeconds)} /${entry.distance_unit})`;
  }

  return text;
}

// Shared styling for inputs (matches the design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function GymPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gymLogs, setGymLogs] = useState([]); // newest first
  const [expandedExercise, setExpandedExercise] = useState(null);

  // form fields
  const [entryType, setEntryType] = useState("lift");
  const [exerciseName, setExerciseName] = useState("");
  const [gWeight, setGWeight] = useState("");
  const [gWeightUnit, setGWeightUnit] = useState("lbs");
  const [gReps, setGReps] = useState("");
  const [gMinutes, setGMinutes] = useState("");
  const [gSeconds, setGSeconds] = useState("");
  const [gDistance, setGDistance] = useState("");
  const [gDistanceUnit, setGDistanceUnit] = useState("km");
  const [gDate, setGDate] = useState(getTodayString());
  const [gNotes, setGNotes] = useState("");

  // ui feedback
  const [gSaving, setGSaving] = useState(false);
  const [gError, setGError] = useState("");
  const [gSuccess, setGSuccess] = useState("");

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
      await fetchGymLogs(session.user.id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fetch this user's gym history ----------
  async function fetchGymLogs(uid) {
    const { data, error: fetchError } = await supabase
      .from("gym_logs")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false });

    if (fetchError) {
      setGError(
        `Couldn't load gym history: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setGymLogs(data || []);
    }
  }

  // ---------- save a new set ----------
  async function handleSaveSet() {
    setGError("");
    setGSuccess("");

    const name = exerciseName.trim();
    if (!name) {
      setGError("Enter an exercise name.");
      return;
    }

    if (!gDate || gDate > today) {
      setGError("Please pick today's date or an earlier one.");
      return;
    }

    // Start building the database row
    const row = {
      user_id: userId,
      exercise_name: name,
      entry_type: entryType,
      weight: null,
      weight_unit: null,
      reps: null,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      notes: gNotes.trim() === "" ? null : gNotes.trim(),
      logged_at: new Date(`${gDate}T12:00:00`).toISOString(),
    };

    if (entryType === "lift") {
      const weightNumber = parseFloat(gWeight);
      if (!gWeight || isNaN(weightNumber) || weightNumber <= 0) {
        setGError("Enter a valid weight.");
        return;
      }

      const repsNumber = parseInt(gReps, 10);
      if (!gReps || isNaN(repsNumber) || repsNumber < 1) {
        setGError("Reps must be a whole number, 1 or more.");
        return;
      }

      row.weight = weightNumber;
      row.weight_unit = gWeightUnit;
      row.reps = repsNumber;
    } else {
      // cardio: needs a time, a distance, or both
      const minutesNumber = gMinutes === "" ? 0 : parseInt(gMinutes, 10);
      const secondsNumber = gSeconds === "" ? 0 : parseInt(gSeconds, 10);

      if (
        isNaN(minutesNumber) ||
        isNaN(secondsNumber) ||
        minutesNumber < 0 ||
        secondsNumber < 0
      ) {
        setGError("Time must be whole numbers.");
        return;
      }

      if (secondsNumber > 59) {
        setGError("Seconds must be between 0 and 59.");
        return;
      }

      const totalSeconds = minutesNumber * 60 + secondsNumber;

      const distanceNumber = gDistance === "" ? null : parseFloat(gDistance);
      if (
        distanceNumber !== null &&
        (isNaN(distanceNumber) || distanceNumber <= 0)
      ) {
        setGError("Distance must be a number above 0 (or leave it blank).");
        return;
      }

      if (totalSeconds === 0 && distanceNumber === null) {
        setGError("Enter a time, a distance, or both.");
        return;
      }

      row.duration_seconds = totalSeconds > 0 ? totalSeconds : null;
      row.distance = distanceNumber;
      row.distance_unit = distanceNumber !== null ? gDistanceUnit : null;
    }

    setGSaving(true);

    const { error: insertError } = await supabase
      .from("gym_logs")
      .insert(row);

    setGSaving(false);

    if (insertError) {
      setGError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    // Keep the exercise name + type so logging multiple sets is fast;
    // clear the numbers, reload, and open that exercise's card.
    setGSuccess("Set saved!");
    setGWeight("");
    setGReps("");
    setGMinutes("");
    setGSeconds("");
    setGDistance("");
    setGNotes("");
    setGDate(getTodayString());
    fetchGymLogs(userId);
    setExpandedExercise(name.toLowerCase());
    setTimeout(() => setGSuccess(""), 4000);
  }

  // ---------- delete a set ----------
  async function handleDeleteSet(id) {
    const sure = window.confirm("Delete this entry?");
    if (!sure) return;

    setGError("");
    const { error: deleteError } = await supabase
      .from("gym_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setGError(
        `Couldn't delete entry: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setGymLogs((previous) => previous.filter((log) => log.id !== id));
    }
  }

  // ---------- group logs by exercise + figure out the PRs ----------
  // Returns one object per exercise:
  // { key, displayName, entries (newest first, each with .isPr),
  //   bestLift, bestCardio, sessionCount, lastLoggedAt }
  function buildExerciseBoard() {
    const groups = {};

    for (const log of gymLogs) {
      const key = log.exercise_name.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          key: key,
          displayName: log.exercise_name.trim(),
          entries: [],
        };
      }
      // copy each row so we can safely tag .isPr onto it
      groups[key].entries.push({ ...log });
    }

    const board = Object.values(groups);

    for (const exercise of board) {
      // Replay history oldest → newest to spot the PRs
      const ascending = [...exercise.entries].sort((a, b) => {
        const byLogged = new Date(a.logged_at) - new Date(b.logged_at);
        if (byLogged !== 0) return byLogged;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      let bestOneRmLbs = -Infinity;
      let bestPaceSecondsPerKm = Infinity;
      let bestDistanceKm = -Infinity;
      let bestDurationSeconds = -Infinity;

      let bestLiftEntry = null;
      let bestPaceEntry = null;
      let bestDistanceEntry = null;
      let bestDurationEntry = null;

      for (const entry of ascending) {
        entry.isPr = false;

        if (
          entry.entry_type === "lift" &&
          entry.weight !== null &&
          entry.reps !== null
        ) {
          const oneRmLbs = toLbs(
            estimateOneRm(parseFloat(entry.weight), entry.reps),
            entry.weight_unit
          );
          if (oneRmLbs > bestOneRmLbs + 0.001) {
            entry.isPr = true;
            bestOneRmLbs = oneRmLbs;
            bestLiftEntry = entry;
          }
        }

        if (entry.entry_type === "cardio") {
          const hasDistance =
            entry.distance !== null && parseFloat(entry.distance) > 0;
          const hasTime =
            entry.duration_seconds !== null && entry.duration_seconds > 0;

          if (hasDistance && hasTime) {
            // pace: seconds per km — LOWER is better
            const km = toKm(parseFloat(entry.distance), entry.distance_unit);
            const pace = entry.duration_seconds / km;
            if (pace < bestPaceSecondsPerKm - 0.001) {
              entry.isPr = true;
              bestPaceSecondsPerKm = pace;
              bestPaceEntry = entry;
            }
          } else if (hasDistance) {
            const km = toKm(parseFloat(entry.distance), entry.distance_unit);
            if (km > bestDistanceKm + 0.001) {
              entry.isPr = true;
              bestDistanceKm = km;
              bestDistanceEntry = entry;
            }
          } else if (hasTime) {
            if (entry.duration_seconds > bestDurationSeconds) {
              entry.isPr = true;
              bestDurationSeconds = entry.duration_seconds;
              bestDurationEntry = entry;
            }
          }
        }
      }

      exercise.bestLift = bestLiftEntry;
      // Crown priority for cardio: pace beats distance beats time
      exercise.bestCardio =
        bestPaceEntry || bestDistanceEntry || bestDurationEntry;
      exercise.entries = ascending.slice().reverse(); // newest first
      exercise.sessionCount = exercise.entries.length;
      exercise.lastLoggedAt = exercise.entries[0].logged_at;
    }

    // Most recently trained exercise first
    board.sort(
      (a, b) => new Date(b.lastLoggedAt) - new Date(a.lastLoggedAt)
    );
    return board;
  }

  const board = buildExerciseBoard();

  // unique names for the autocomplete dropdown
  const exerciseNames = board.map((exercise) => exercise.displayName);

  // summary numbers
  const totalSessions = gymLogs.length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let recentPrCount = 0;
  for (const exercise of board) {
    for (const entry of exercise.entries) {
      if (entry.isPr && new Date(entry.logged_at) >= thirtyDaysAgo) {
        recentPrCount = recentPrCount + 1;
      }
    }
  }

  // live estimated-1RM preview in the form
  let oneRmPreview = null;
  if (entryType === "lift") {
    const weightNumber = parseFloat(gWeight);
    const repsNumber = parseInt(gReps, 10);
    if (
      !isNaN(weightNumber) &&
      weightNumber > 0 &&
      !isNaN(repsNumber) &&
      repsNumber >= 1
    ) {
      oneRmPreview = `${estimateOneRm(weightNumber, repsNumber).toFixed(
        0
      )} ${gWeightUnit}`;
    }
  }

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your PRs...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Gym PRs</h1>
        <p className="text-slate-400 mt-1">
          Track your lifts and watch your strength climb while the scale
          drops.
        </p>
      </div>

      {/* ---------- summary cards (only once there's data) ---------- */}
      {board.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Exercises tracked</p>
            <p className="text-2xl font-bold text-white mt-1">
              {board.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Total sets logged</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalSessions}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">PRs in the last 30 days</p>
            <p className="text-2xl font-bold text-white mt-1">
              🏆 {recentPrCount}
            </p>
          </div>
        </div>
      )}

      {/* ================================================
          SIDE-BY-SIDE: PR board (left) | log form (right)
          Stacks into one column on phones.
          ================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT COLUMN: PR board ---------- */}
        <div className="space-y-4">
          {board.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-500">
                No PRs yet — log your first set with the form and your
                exercises will appear here, each with its own record board.
                🏆
              </p>
            </div>
          ) : (
            board.map((exercise) => {
              const isOpen = expandedExercise === exercise.key;
              const pr = exercise.bestLift || exercise.bestCardio;

              // strength trend chart data (lifts only, oldest → newest)
              const liftEntriesAscending = exercise.entries
                .filter(
                  (entry) =>
                    entry.entry_type === "lift" &&
                    entry.weight !== null &&
                    entry.reps !== null
                )
                .slice()
                .reverse();
              const trendUnit =
                liftEntriesAscending.length > 0
                  ? liftEntriesAscending[liftEntriesAscending.length - 1]
                      .weight_unit
                  : "lbs";
              const trendData = liftEntriesAscending.map((entry) => ({
                label: formatShortDate(entry.logged_at),
                oneRm: Number(
                  fromLbs(
                    toLbs(
                      estimateOneRm(parseFloat(entry.weight), entry.reps),
                      entry.weight_unit
                    ),
                    trendUnit
                  ).toFixed(1)
                ),
              }));

              return (
                <div
                  key={exercise.key}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedExercise(isOpen ? null : exercise.key)
                    }
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between text-left gap-4"
                  >
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {exercise.displayName}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          ({exercise.sessionCount})
                        </span>
                      </h2>
                      {pr && (
                        <p className="text-sm text-slate-400 mt-0.5">
                          🏆 Best:{" "}
                          {exercise.bestLift ? (
                            <>
                              {describeLift(exercise.bestLift)}
                              <span className="text-slate-500">
                                {" "}
                                · est. 1RM{" "}
                                {estimateOneRm(
                                  parseFloat(exercise.bestLift.weight),
                                  exercise.bestLift.reps
                                ).toFixed(0)}{" "}
                                {exercise.bestLift.weight_unit} ·{" "}
                                {formatDate(exercise.bestLift.logged_at)}
                              </span>
                            </>
                          ) : (
                            <>
                              {describeCardio(exercise.bestCardio)}
                              <span className="text-slate-500">
                                {" "}
                                · {formatDate(exercise.bestCardio.logged_at)}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-400">
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-4">
                      {/* strength trend (needs at least 2 lift entries) */}
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
                                formatter={(value) => [
                                  `${value} ${trendUnit}`,
                                  "Est. 1RM",
                                ]}
                              />
                              <Line
                                type="monotone"
                                dataKey="oneRm"
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

                      {/* full history, newest first */}
                      <ul className="divide-y divide-slate-800">
                        {exercise.entries.map((entry) => (
                          <li
                            key={entry.id}
                            className="py-3 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-white font-semibold">
                                {entry.entry_type === "lift"
                                  ? describeLift(entry)
                                  : describeCardio(entry)}
                                {entry.isPr && (
                                  <span title="This was a PR when you logged it">
                                    {" "}
                                    🏆
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatDate(entry.logged_at)}
                                {entry.notes ? ` — ${entry.notes}` : ""}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSet(entry.id)}
                              className="text-slate-500 hover:text-red-400 text-sm"
                              title="Delete entry"
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

        {/* ---------- RIGHT COLUMN: log a set ---------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Log a set</h2>

          {gError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {gError}
            </div>
          )}
          {gSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
              {gSuccess}
            </div>
          )}

          {/* lift / cardio toggle */}
          <div className="flex gap-2 mb-4">
            {ENTRY_TYPES.map((typeOption) => (
              <button
                key={typeOption.key}
                type="button"
                onClick={() => setEntryType(typeOption.key)}
                className={
                  typeOption.key === entryType
                    ? "px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                    : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                }
              >
                {typeOption.label}
              </button>
            ))}
          </div>

          {/* exercise name with autocomplete from your own history */}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">
              Exercise
            </label>
            <input
              type="text"
              list="exercise-name-options"
              placeholder={
                entryType === "lift" ? "e.g. Bench press" : "e.g. 5K run"
              }
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
              className={inputClasses}
            />
            <datalist id="exercise-name-options">
              {exerciseNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {entryType === "lift" ? (
            <div>
              {/* lbs / kg toggle */}
              <div className="flex gap-2 mb-4">
                {WEIGHT_UNITS.map((unitOption) => (
                  <button
                    key={unitOption}
                    type="button"
                    onClick={() => setGWeightUnit(unitOption)}
                    className={
                      unitOption === gWeightUnit
                        ? "px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                        : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }
                  >
                    {unitOption}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Weight ({gWeightUnit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.0"
                    value={gWeight}
                    onChange={(event) => setGWeight(event.target.value)}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 5"
                    value={gReps}
                    onChange={(event) => setGReps(event.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              {oneRmPreview && (
                <p className="text-sm text-emerald-400 mt-2">
                  Estimated 1RM: {oneRmPreview}
                </p>
              )}
            </div>
          ) : (
            <div>
              {/* km / m / mi toggle */}
              <div className="flex gap-2 mb-4">
                {DISTANCE_UNITS.map((unitOption) => (
                  <button
                    key={unitOption}
                    type="button"
                    onClick={() => setGDistanceUnit(unitOption)}
                    className={
                      unitOption === gDistanceUnit
                        ? "px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                        : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }
                  >
                    {unitOption}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Time{" "}
                    <span className="text-slate-500">(min : sec)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="mm"
                      value={gMinutes}
                      onChange={(event) => setGMinutes(event.target.value)}
                      className={inputClasses}
                    />
                    <span className="text-slate-400 font-semibold">:</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="59"
                      placeholder="ss"
                      value={gSeconds}
                      onChange={(event) => setGSeconds(event.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Distance ({gDistanceUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.0"
                    value={gDistance}
                    onChange={(event) => setGDistance(event.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Fill in time, distance, or both — logging both makes your
                pace count as the PR.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Date
              </label>
              <input
                type="date"
                value={gDate}
                max={today}
                onChange={(event) => setGDate(event.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Notes <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. felt easy"
                value={gNotes}
                onChange={(event) => setGNotes(event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSet}
            disabled={gSaving}
            className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
          >
            {gSaving ? "Saving..." : "Save set"}
          </button>
        </div>
      </div>
    </div>
  );
}