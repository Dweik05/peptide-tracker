"use client";

// ============================================================
// GOALS & STREAKS (v2)  —  goes in:  app/(app)/goals/page.js
// (FULL REPLACEMENT of the Chunk A file.)
//
// Day 21 · Chunk B: the Goals section goes live.
//
//   WEIGHT GOAL — pick a target weight (+ optional date). Your
//   starting point is captured from your latest weigh-in, and
//   the progress bar updates ITSELF from new weigh-ins on the
//   Progress page. Works for loss or gain. Units convert
//   automatically (lbs / kg / st).
//
//   CUSTOM GOAL — any goal in your own words (+ optional date),
//   marked complete by hand.
//
// Completing is always manual (even when a weight target is
// reached) — the app suggests, you decide. Deleting a goal
// never touches your weigh-ins or any other data.
//
// Streaks + achievements from Chunk A are unchanged.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { normalizeSiteKey } from "../../lib/sites";
import { toDateString, dateFromString } from "../../lib/schedule-helpers";
import {
  computeAdherenceStreaks,
  computeLoggingStreaks,
  evaluateAchievements,
} from "../../lib/streaks";

const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

const WEIGHT_UNITS = ["lbs", "kg", "st"];

function convertWeight(value, from, to) {
  if (from === to) return value;
  const inLbs =
    from === "lbs" ? value : from === "kg" ? value * 2.20462 : value * 14;
  if (to === "lbs") return inLbs;
  if (to === "kg") return inLbs / 2.20462;
  return inLbs / 14;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

// progress of a weight goal given the latest weigh-in.
// Direction-aware: works for losing AND gaining.
function weightGoalProgress(goal, latestWeight) {
  if (!latestWeight) return null;
  const current = convertWeight(
    parseFloat(latestWeight.weight),
    latestWeight.unit,
    goal.unit
  );
  const start = parseFloat(goal.start_value);
  const target = parseFloat(goal.target_value);
  const span = target - start;
  if (span === 0) {
    return { current: round1(current), start, target, pct: 100, reached: true };
  }
  let pct = Math.round(((current - start) / span) * 100);
  pct = Math.max(0, Math.min(100, pct));
  const reached = span > 0 ? current >= target : current <= target;
  return { current: round1(current), start, target, pct, reached };
}

function daysUntil(dateString, todayString) {
  return Math.round(
    (dateFromString(dateString).getTime() -
      dateFromString(todayString).getTime()) /
      86400000
  );
}

function formatShortDate(dateString) {
  return dateFromString(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GoalsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [adherence, setAdherence] = useState(null);
  const [logging, setLogging] = useState(null);
  const [badges, setBadges] = useState([]);
  const [doseCount, setDoseCount] = useState(0);

  // goals
  const [goals, setGoals] = useState([]);
  const [latestWeight, setLatestWeight] = useState(null); // {weight, unit, logged_at}
  const [showForm, setShowForm] = useState(null); // null | "weight" | "custom"
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");

  // weight-goal form
  const [weightTarget, setWeightTarget] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightTargetDate, setWeightTargetDate] = useState("");

  // custom-goal form
  const [customTitle, setCustomTitle] = useState("");
  const [customTargetDate, setCustomTargetDate] = useState("");

  const todayString = toDateString(new Date());

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      // everything in parallel
      const [doseRes, schedRes, weightRes, photoRes, labRes, invRes, goalsRes] =
        await Promise.all([
          supabase
            .from("dose_logs")
            .select("peptide_name, injection_site, logged_at")
            .eq("user_id", uid),
          supabase.from("reminders").select("*").eq("user_id", uid),
          supabase
            .from("weight_logs")
            .select("weight, unit, logged_at")
            .eq("user_id", uid)
            .order("logged_at", { ascending: false }),
          supabase
            .from("progress_photos")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),
          supabase
            .from("lab_results")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),
          supabase
            .from("inventory")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),
          supabase
            .from("goals")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false }),
        ]);

      const doseLogs = doseRes.data || [];
      const schedules = schedRes.data || [];
      const weights = weightRes.data || [];

      const siteSet = new Set();
      for (const log of doseLogs) {
        const key = normalizeSiteKey(log.injection_site);
        if (key) siteSet.add(key);
      }

      const adherenceResult = computeAdherenceStreaks(
        schedules,
        doseLogs,
        todayString
      );
      const loggingResult = computeLoggingStreaks(doseLogs, todayString);

      setAdherence(adherenceResult);
      setLogging(loggingResult);
      setDoseCount(doseLogs.length);
      setLatestWeight(weights.length > 0 ? weights[0] : null);
      if (weights.length > 0) setWeightUnit(weights[0].unit);
      setGoals(goalsRes.data || []);
      setBadges(
        evaluateAchievements({
          doseCount: doseLogs.length,
          weightCount: weights.length,
          photoCount: photoRes.count || 0,
          labCount: labRes.count || 0,
          inventoryCount: invRes.count || 0,
          scheduleCount: schedules.length,
          distinctSites: siteSet.size,
          adherence: adherenceResult,
          logging: loggingResult,
        })
      );
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- goal actions ----------------
  async function handleCreateWeightGoal() {
    const target = parseFloat(weightTarget);
    if (isNaN(target) || target <= 0 || !latestWeight || savingGoal) return;
    setSavingGoal(true);
    setGoalError("");

    const startInGoalUnit = round1(
      convertWeight(parseFloat(latestWeight.weight), latestWeight.unit, weightUnit)
    );
    const row = {
      user_id: userId,
      goal_type: "weight",
      title: `Reach ${target} ${weightUnit}`,
      target_value: target,
      unit: weightUnit,
      start_value: startInGoalUnit,
      target_date: weightTargetDate || null,
    };

    const { data, error } = await supabase
      .from("goals")
      .insert(row)
      .select()
      .single();
    setSavingGoal(false);
    if (error) {
      setGoalError(error.message);
      return;
    }
    setGoals((current) => [data, ...current]);
    setWeightTarget("");
    setWeightTargetDate("");
    setShowForm(null);
  }

  async function handleCreateCustomGoal() {
    const title = customTitle.trim();
    if (!title || savingGoal) return;
    setSavingGoal(true);
    setGoalError("");

    const row = {
      user_id: userId,
      goal_type: "custom",
      title: title,
      target_date: customTargetDate || null,
    };

    const { data, error } = await supabase
      .from("goals")
      .insert(row)
      .select()
      .single();
    setSavingGoal(false);
    if (error) {
      setGoalError(error.message);
      return;
    }
    setGoals((current) => [data, ...current]);
    setCustomTitle("");
    setCustomTargetDate("");
    setShowForm(null);
  }

  async function handleComplete(goal) {
    const stamp = new Date().toISOString();
    const { error } = await supabase
      .from("goals")
      .update({ completed_at: stamp })
      .eq("id", goal.id);
    if (!error) {
      setGoals((current) =>
        current.map((g) => (g.id === goal.id ? { ...g, completed_at: stamp } : g))
      );
    }
  }

  async function handleDeleteGoal(goal) {
    const sure = window.confirm(
      `Delete the goal "${goal.title}"? This can't be undone. ` +
        `Your weigh-ins and other data are NOT affected.`
    );
    if (!sure) return;
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (!error) {
      setGoals((current) => current.filter((g) => g.id !== goal.id));
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your streaks...</p>
      </div>
    );
  }

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const activeGoals = goals.filter((g) => !g.completed_at);
  const completedGoals = goals.filter((g) => g.completed_at);

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Goals & Streaks</h1>
        <p className="text-slate-400 mt-1">
          Consistency, computed live from your real history — nothing here can
          go stale.
        </p>
      </div>

      {/* today's dose still open? */}
      {adherence.todayPending && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-sm">
          📌 Today is a scheduled dose day ({adherence.todayDue.join(", ")})
          and it isn't logged yet. Logging it keeps your streak alive — an
          unlogged today never breaks the streak until the day is over.
        </div>
      )}

      {/* streak stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current adherence streak"
          value={adherence.hasSchedules ? `${adherence.current}` : "—"}
          sub={
            adherence.hasSchedules
              ? "scheduled days in a row"
              : "needs a saved schedule"
          }
          highlight={adherence.hasSchedules && adherence.current > 0}
        />
        <StatCard
          label="Best adherence streak"
          value={adherence.hasSchedules ? `${adherence.best}` : "—"}
          sub={
            adherence.hasSchedules ? "your record" : "needs a saved schedule"
          }
        />
        <StatCard
          label="Adherence"
          value={
            adherence.adherencePct !== null
              ? `${adherence.adherencePct}%`
              : "—"
          }
          sub={
            adherence.adherencePct !== null
              ? `${adherence.hitDays} of ${adherence.scheduledDays} scheduled days`
              : adherence.hasSchedules
              ? "no scheduled days completed yet"
              : "needs a saved schedule"
          }
        />
        <StatCard
          label="Logging streak"
          value={`${logging.current}`}
          sub={`days in a row · best ${logging.best} · ${doseCount} doses total`}
        />
      </div>

      {!adherence.hasSchedules && (
        <p className="text-sm text-slate-500">
          Adherence streaks unlock once you save a schedule in the{" "}
          <Link
            href="/planner"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Planner
          </Link>
          . Your logging streak works either way.
        </p>
      )}

      {/* ---------------- goals ---------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-white">Goals</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(showForm === "weight" ? null : "weight");
                setGoalError("");
              }}
              className={
                showForm === "weight"
                  ? "text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold"
                  : "text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
              }
            >
              ＋ Weight goal
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(showForm === "custom" ? null : "custom");
                setGoalError("");
              }}
              className={
                showForm === "custom"
                  ? "text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold"
                  : "text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
              }
            >
              ＋ Custom goal
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Weight goals track themselves from your weigh-ins. Custom goals are
          yours to define and complete.
        </p>

        {/* weight goal form */}
        {showForm === "weight" &&
          (latestWeight ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
              <p className="text-sm text-slate-300">
                Starting from:{" "}
                <span className="text-white font-semibold">
                  {round1(
                    convertWeight(
                      parseFloat(latestWeight.weight),
                      latestWeight.unit,
                      weightUnit
                    )
                  )}{" "}
                  {weightUnit}
                </span>{" "}
                <span className="text-slate-500">(your latest weigh-in)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Target weight
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={weightTarget}
                      onChange={(e) => setWeightTarget(e.target.value)}
                      className={inputClasses}
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value)}
                      className="bg-slate-800 text-white px-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
                    >
                      {WEIGHT_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Target date{" "}
                    <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="date"
                    min={todayString}
                    value={weightTargetDate}
                    onChange={(e) => setWeightTargetDate(e.target.value)}
                    className={`${inputClasses} [color-scheme:dark]`}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateWeightGoal}
                disabled={savingGoal}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {savingGoal ? "Saving..." : "Save weight goal"}
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-400">
                Log your first weigh-in on the{" "}
                <Link
                  href="/progress"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Progress
                </Link>{" "}
                page — it becomes the starting point for a weight goal.
              </p>
            </div>
          ))}

        {/* custom goal form */}
        {showForm === "custom" && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Goal
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Finish the 12-week protocol"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Target date <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="date"
                  min={todayString}
                  value={customTargetDate}
                  onChange={(e) => setCustomTargetDate(e.target.value)}
                  className={`${inputClasses} [color-scheme:dark]`}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateCustomGoal}
              disabled={savingGoal || !customTitle.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {savingGoal ? "Saving..." : "Save custom goal"}
            </button>
          </div>
        )}

        {goalError && (
          <p className="text-sm text-red-400 mb-4">Couldn't save: {goalError}</p>
        )}

        {/* active goals */}
        {activeGoals.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active goals yet — set a weight target or a custom goal above.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeGoals.map((goal) => {
              const progress =
                goal.goal_type === "weight"
                  ? weightGoalProgress(goal, latestWeight)
                  : null;
              const daysLeft = goal.target_date
                ? daysUntil(goal.target_date, todayString)
                : null;
              return (
                <li
                  key={goal.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {goal.title}
                    </p>
                    {daysLeft !== null && (
                      <span
                        className={
                          daysLeft < 0
                            ? "text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300"
                            : "text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                        }
                      >
                        {daysLeft < 0
                          ? `${Math.abs(daysLeft)} days past target date`
                          : daysLeft === 0
                          ? "target date is today"
                          : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>

                  {progress && (
                    <div className="mt-3">
                      <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {progress.start} {goal.unit} →{" "}
                        <span className="text-white font-semibold">
                          {progress.current} {goal.unit}
                        </span>{" "}
                        → {progress.target} {goal.unit}
                        <span className="text-slate-500">
                          {" "}
                          · {progress.pct}% there
                        </span>
                      </p>
                      {progress.reached && (
                        <p className="text-xs text-emerald-400 mt-1">
                          🎉 Target reached — mark it complete when you're
                          ready.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleComplete(goal)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                    >
                      ✓ Mark complete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* completed goals */}
        {completedGoals.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2">Completed</p>
            <ul className="space-y-2">
              {completedGoals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex items-center justify-between gap-2 bg-slate-800/30 border border-slate-800 rounded-lg px-3 py-2"
                >
                  <p className="text-sm text-slate-400">
                    <span className="text-emerald-400">✓</span> {goal.title}
                    <span className="text-slate-500">
                      {" "}
                      · {formatShortDate(goal.completed_at.slice(0, 10))}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(goal)}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* achievements */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Achievements</h2>
          <span className="text-sm text-slate-400">
            {unlockedCount} / {badges.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={
                badge.unlocked
                  ? "bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4"
                  : "bg-slate-800/30 border border-slate-800 rounded-xl p-4 opacity-60"
              }
            >
              <div className="text-2xl mb-2">
                {badge.unlocked ? badge.icon : "🔒"}
              </div>
              <p
                className={
                  badge.unlocked
                    ? "text-sm font-semibold text-white"
                    : "text-sm font-semibold text-slate-500"
                }
              >
                {badge.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {badge.description}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Badges reward tracking and consistency — they're computed from your
          history, so they unlock the moment the data says so.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div
      className={
        highlight
          ? "bg-slate-900 border border-emerald-500/30 rounded-xl p-5"
          : "bg-slate-900 border border-slate-800 rounded-xl p-5"
      }
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={
          highlight
            ? "text-3xl font-bold text-emerald-400 mt-1"
            : "text-3xl font-bold text-white mt-1"
        }
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}