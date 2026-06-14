"use client";

// ============================================================
// DASHBOARD (v2)  —  goes in:  app/(app)/dashboard/page.js
//
// Day 23 · Chunk A: a "Schedule this month" card with the
// MiniCalendar — scheduled dose days (emerald) from your saved
// schedules, plus the doses you actually logged (sky). The
// scheduled days are titration-aware (same isDoseDay/doseOnDate
// the Calendar page uses). Peptide mode only.
//
// Everything else from Day 13 is unchanged. The only additions:
//   - import MiniCalendar + schedule helpers
//   - fetch the user's `reminders` (schedules)
//   - compute this-month's scheduled + logged date strings
//   - render the new card
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { PEPTIDES, UNITS } from "../../lib/peptides";
import { INJECTION_SITE_GROUPS } from "../../lib/sites";
import { deductFromInventory } from "../../lib/inventory-helpers";
import MiniCalendar from "../../components/MiniCalendar";
import { isDoseDay, toDateString, dateFromString, doseOnDate } from "../../lib/schedule-helpers";

const LOW_STOCK_PERCENT = 20;

// ---------------- helper functions ----------------

// "YYYY-MM-DD" key for a Date object, in YOUR timezone
function dateKeyFromDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Same, for any timestamp or date string from the database.
// Date-only strings ("2026-06-10") get a noon time so they
// don't shift a day across timezones.
function dateKeyOf(value) {
  const safe =
    typeof value === "string" && value.length === 10
      ? `${value}T12:00:00`
      : value;
  return dateKeyFromDate(new Date(safe));
}

// Local date+time as "YYYY-MM-DDTHH:MM" for the quick-log picker
function getLocalDateTimeString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// "Today, 9:14 AM" / "Yesterday" / "Jun 8"
function friendlyWhen(value) {
  const safe =
    typeof value === "string" && value.length === 10
      ? `${value}T12:00:00`
      : value;
  const d = new Date(safe);
  const key = dateKeyFromDate(d);

  const now = new Date();
  const todayKey = dateKeyFromDate(now);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKeyFromDate(yesterday);

  if (key === todayKey) {
    return `Today, ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  if (key === yesterdayKey) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

// Shared input styling (design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function Dashboard() {
  const router = useRouter();

  // ---------- state ----------
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [firstName, setFirstName] = useState("there");
  const [usesPeptides, setUsesPeptides] = useState(true);
  const [weeklyEmail, setWeeklyEmail] = useState(false);

  const [doses, setDoses] = useState([]); // last 90 days, newest first
  const [recentWeights, setRecentWeights] = useState([]); // last 90 days
  const [latestWeight, setLatestWeight] = useState(null); // all-time latest
  const [startWeight, setStartWeight] = useState(null); // all-time first
  const [gymLogs, setGymLogs] = useState([]); // last 90 days
  const [measurements, setMeasurements] = useState([]); // last 90 days
  const [photos, setPhotos] = useState([]); // last 90 days
  const [labs, setLabs] = useState([]); // last 90 days
  const [inventoryItems, setInventoryItems] = useState([]);
  const [schedules, setSchedules] = useState([]); // saved reminders (schedules)

  // quick-log modal
  const [quickOpen, setQuickOpen] = useState(false);
  const [qPeptide, setQPeptide] = useState("");
  const [qAmount, setQAmount] = useState("");
  const [qUnit, setQUnit] = useState("mg");
  const [qGroup, setQGroup] = useState("");
  const [qSite, setQSite] = useState("");
  const [qCustom, setQCustom] = useState("");
  const [qWhen, setQWhen] = useState(getLocalDateTimeString());
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError] = useState("");

  // dashboard banners
  const [success, setSuccess] = useState("");
  const [stockWarning, setStockWarning] = useState("");
  const [error, setError] = useState("");

  // ---------- load everything on page open ----------
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

      const fullName = session.user.user_metadata?.full_name || "";
      setFirstName(fullName.trim().split(" ")[0] || "there");

      await Promise.all([
        fetchProfileMode(session.user.id),
        fetchDoses(session.user.id),
        fetchWeights(session.user.id),
        fetchGym(session.user.id),
        fetchMeasurements(session.user.id),
        fetchPhotos(session.user.id),
        fetchLabs(session.user.id),
        fetchInventory(session.user.id),
        fetchSchedules(session.user.id),
      ]);

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ninetyDaysAgoIso() {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString();
  }

  async function fetchProfileMode(uid) {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("uses_peptides, weekly_weighin_email")
      .eq("id", uid)
      .single();

    if (profileError) {
      // Column missing or row missing → default to peptide mode.
      console.warn("Profile mode unavailable, defaulting:", profileError.message);
      setUsesPeptides(true);
    } else {
      setUsesPeptides(data?.uses_peptides ?? true);
      setWeeklyEmail(data?.weekly_weighin_email ?? false);
    }
  }

  async function fetchDoses(uid) {
    const { data } = await supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", uid)
      .gte("logged_at", ninetyDaysAgoIso())
      .order("logged_at", { ascending: false });
    setDoses(data || []);
  }

  async function fetchWeights(uid) {
    const { data: recent } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", uid)
      .gte("logged_at", ninetyDaysAgoIso())
      .order("logged_at", { ascending: false });
    setRecentWeights(recent || []);

    const { data: latest } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: false })
      .limit(1);
    setLatestWeight(latest && latest.length > 0 ? latest[0] : null);

    const { data: first } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", uid)
      .order("logged_at", { ascending: true })
      .limit(1);
    setStartWeight(first && first.length > 0 ? first[0] : null);
  }

  async function fetchGym(uid) {
    const { data } = await supabase
      .from("gym_logs")
      .select(
        "id, exercise_name, entry_type, weight, weight_unit, reps, duration_seconds, distance, distance_unit, logged_at"
      )
      .eq("user_id", uid)
      .gte("logged_at", ninetyDaysAgoIso())
      .order("logged_at", { ascending: false });
    setGymLogs(data || []);
  }

  async function fetchMeasurements(uid) {
    const { data } = await supabase
      .from("body_measurements")
      .select("id, logged_at")
      .eq("user_id", uid)
      .gte("logged_at", ninetyDaysAgoIso())
      .order("logged_at", { ascending: false });
    setMeasurements(data || []);
  }

  async function fetchPhotos(uid) {
    const { data } = await supabase
      .from("progress_photos")
      .select("id, taken_at, caption")
      .eq("user_id", uid)
      .gte("taken_at", ninetyDaysAgoIso())
      .order("taken_at", { ascending: false });
    setPhotos(data || []);
  }

  async function fetchLabs(uid) {
    const ninety = new Date();
    ninety.setDate(ninety.getDate() - 90);
    const { data } = await supabase
      .from("lab_results")
      .select("id, biomarker, value, unit, tested_at")
      .eq("user_id", uid)
      .gte("tested_at", dateKeyFromDate(ninety))
      .order("tested_at", { ascending: false });
    setLabs(data || []);
  }

  async function fetchInventory(uid) {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", uid);
    setInventoryItems(data || []);
  }

  async function fetchSchedules(uid) {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", uid);
    setSchedules(data || []);
  }

  // ---------- quick-log save ----------
  function getQuickSite() {
    if (qGroup === "Other") return qCustom;
    if (qGroup && qSite) return `${qGroup} - ${qSite}`;
    return "";
  }

  async function handleQuickLog() {
    setQError("");
    const site = getQuickSite();

    if (!qPeptide || !qAmount || !site) {
      setQError("Please fill in peptide, dose amount, and injection site.");
      return;
    }

    const amountNumber = parseFloat(qAmount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setQError("Enter a valid dose amount.");
      return;
    }

    setQSaving(true);

    const { error: insertError } = await supabase.from("dose_logs").insert({
      user_id: userId,
      peptide_name: qPeptide,
      dose_amount: amountNumber,
      unit: qUnit,
      injection_site: site,
      logged_at: qWhen,
      notes: "",
    });

    if (insertError) {
      setQSaving(false);
      setQError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    // Same shared auto-deduct as the /log page
    const deduction = await deductFromInventory(
      userId,
      qPeptide,
      amountNumber,
      qUnit
    );

    setQSaving(false);
    setQuickOpen(false);

    setSuccess(
      deduction.message
        ? `✅ Dose logged! ${deduction.message}`
        : "✅ Dose logged successfully!"
    );
    setStockWarning(deduction.warning || "");
    setTimeout(() => setSuccess(""), 6000);

    // reset the modal form for next time
    setQPeptide("");
    setQAmount("");
    setQGroup("");
    setQSite("");
    setQCustom("");
    setQWhen(getLocalDateTimeString());

    // refresh the widgets that changed
    fetchDoses(userId);
    fetchInventory(userId);
  }

  // toggle the weekly weigh-in email preference (persists to profiles)
  async function handleToggleWeeklyEmail() {
    const next = !weeklyEmail;
    setWeeklyEmail(next); // optimistic
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ weekly_weighin_email: next })
      .eq("id", userId);
    if (updateError) {
      setWeeklyEmail(!next); // revert on failure
      setError(`Couldn't save reminder setting: ${updateError.message}`);
    }
  }

  // ---------- computed values ----------
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayKey = dateKeyFromDate(now);

  // streak: every day with ANY activity (labs excluded — usually backdated)
  const activityDays = new Set();
  for (const d of doses) activityDays.add(dateKeyOf(d.logged_at));
  for (const w of recentWeights) activityDays.add(dateKeyOf(w.logged_at));
  for (const g of gymLogs) activityDays.add(dateKeyOf(g.logged_at));
  for (const m of measurements) activityDays.add(dateKeyOf(m.logged_at));
  for (const p of photos) activityDays.add(dateKeyOf(p.taken_at));

  let streak = 0;
  {
    const cursor = new Date();
    if (!activityDays.has(dateKeyFromDate(cursor))) {
      cursor.setDate(cursor.getDate() - 1); // grace: streak alive until midnight
    }
    while (activityDays.has(dateKeyFromDate(cursor))) {
      streak = streak + 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }
  const loggedToday = activityDays.has(todayKey);

  // Streak presentation: it stays alive through today even if you
  // haven't logged yet (only a genuinely missed day drops it to 0).
  //   active  = logged today, safe
  //   warning = alive but nothing logged today yet — log to keep it
  //   none    = no streak going
  const streakState =
    streak === 0 ? "none" : loggedToday ? "active" : "warning";

  // Weekly weigh-in nudge: overdue if never weighed, or 7+ days since last
  let daysSinceWeighin = null;
  if (latestWeight) {
    const lastMidnight = new Date(
      dateKeyOf(latestWeight.logged_at) + "T00:00:00"
    );
    const todayMidnight = new Date(todayKey + "T00:00:00");
    daysSinceWeighin = Math.round(
      (todayMidnight - lastMidnight) / 86400000
    );
  }
  const weighinOverdue = daysSinceWeighin === null || daysSinceWeighin >= 7;
  const weighinMessage =
    daysSinceWeighin === null
      ? "Log your first weight to start tracking your progress."
      : daysSinceWeighin === 0
      ? "You weighed in today. Nice."
      : daysSinceWeighin >= 7
      ? `It's been ${daysSinceWeighin} days since your last weigh-in.`
      : `Last weigh-in: ${daysSinceWeighin} ${
          daysSinceWeighin === 1 ? "day" : "days"
        } ago.`;

  // today's items
  const todaysDoses = doses.filter((d) => dateKeyOf(d.logged_at) === todayKey);
  const weightToday = recentWeights.some(
    (w) => dateKeyOf(w.logged_at) === todayKey
  );
  const gymToday = gymLogs.some((g) => dateKeyOf(g.logged_at) === todayKey);

  // weight change since start (in the latest entry's unit)
  let weightChange = null;
  if (latestWeight && startWeight && latestWeight.id !== startWeight.id) {
    const diffLbs =
      toLbs(parseFloat(latestWeight.weight), latestWeight.unit) -
      toLbs(parseFloat(startWeight.weight), startWeight.unit);
    weightChange = fromLbs(diffLbs, latestWeight.unit);
  }

  // inventory summary
  const itemsWithPercent = inventoryItems.map((item) => {
    const total = parseFloat(item.quantity_total);
    const remaining = parseFloat(item.quantity_remaining);
    return {
      ...item,
      percent: total > 0 ? (remaining / total) * 100 : 0,
    };
  });
  const lowStockItems = itemsWithPercent.filter(
    (item) => item.percent <= LOW_STOCK_PERCENT
  );
  const lowestItem =
    itemsWithPercent.length > 0
      ? [...itemsWithPercent].sort((a, b) => a.percent - b.percent)[0]
      : null;

  // gym sets in the last 30 days
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const gymSets30 = gymLogs.filter(
    (g) => new Date(g.logged_at) >= thirtyAgo
  ).length;

  // last dose
  const lastDose = doses.length > 0 ? doses[0] : null;

  // ---------- mini-calendar date sets (this-month view spans wider) ----------
  // Logged dose days (sky) — from the doses we already fetched.
  const loggedDoseDates = [];
  for (const d of doses) loggedDoseDates.push(dateKeyOf(d.logged_at));

  // Scheduled dose days (emerald) — walk active schedules across a
  // window around today so the mini-calendar shows them whichever
  // month you flip to. We scan from 45 days back to 75 days ahead.
  const scheduledDoseDates = [];
  {
    const activeSchedules = schedules.filter((s) => s.active);
    if (activeSchedules.length > 0) {
      const scanStart = new Date();
      scanStart.setDate(scanStart.getDate() - 45);
      const scanEnd = new Date();
      scanEnd.setDate(scanEnd.getDate() + 75);
      const cursor = new Date(
        scanStart.getFullYear(),
        scanStart.getMonth(),
        scanStart.getDate(),
        12
      );
      while (cursor <= scanEnd) {
        for (const s of activeSchedules) {
          if (isDoseDay(s, cursor)) {
            scheduledDoseDates.push(toDateString(cursor));
            break;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }
  const hasSchedules = schedules.some((s) => s.active);

  // Upcoming scheduled dose days (today forward), with the dose that
  // applies on each day (titration-aware). Up to the next 7 dose days.
  const upcomingDoses = [];
  {
    const activeSchedules = schedules.filter((s) => s.active);
    if (activeSchedules.length > 0) {
      const cursor = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        12
      );
      const horizon = new Date(cursor);
      horizon.setDate(horizon.getDate() + 90);
      while (cursor <= horizon && upcomingDoses.length < 7) {
        const items = [];
        for (const s of activeSchedules) {
          if (isDoseDay(s, cursor)) {
            items.push({
              peptide_name: s.peptide_name,
              dose: doseOnDate(s, cursor),
              unit: s.unit,
            });
          }
        }
        if (items.length > 0) {
          upcomingDoses.push({
            date: new Date(cursor),
            key: toDateString(cursor),
            items,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  // ---------- recent activity feed (merged, newest first) ----------
  const feed = [];
  for (const d of doses) {
    feed.push({
      ts: new Date(d.logged_at).getTime(),
      icon: "💉",
      text: `${parseFloat(d.dose_amount)} ${d.unit} ${d.peptide_name}`,
      sub: d.injection_site,
      when: friendlyWhen(d.logged_at),
    });
  }
  for (const w of recentWeights) {
    feed.push({
      ts: new Date(w.logged_at).getTime(),
      icon: "⚖️",
      text: `Weight: ${parseFloat(w.weight)} ${w.unit}`,
      sub: "",
      when: friendlyWhen(w.logged_at),
    });
  }
  for (const g of gymLogs) {
    const detail =
      g.entry_type === "lift" && g.weight !== null && g.reps !== null
        ? `${parseFloat(g.weight)} ${g.weight_unit} × ${g.reps}`
        : "cardio";
    feed.push({
      ts: new Date(g.logged_at).getTime(),
      icon: "🏋️",
      text: `${g.exercise_name} — ${detail}`,
      sub: "",
      when: friendlyWhen(g.logged_at),
    });
  }
  for (const m of measurements) {
    feed.push({
      ts: new Date(m.logged_at).getTime(),
      icon: "📏",
      text: "Body measurements",
      sub: "",
      when: friendlyWhen(m.logged_at),
    });
  }
  for (const p of photos) {
    feed.push({
      ts: new Date(p.taken_at).getTime(),
      icon: "📷",
      text: "Progress photo",
      sub: p.caption || "",
      when: friendlyWhen(p.taken_at),
    });
  }
  for (const l of labs) {
    feed.push({
      ts: new Date(`${l.tested_at}T12:00:00`).getTime(),
      icon: "🧪",
      text: `${l.biomarker}: ${parseFloat(l.value)}${l.unit ? ` ${l.unit}` : ""}`,
      sub: "",
      when: friendlyWhen(l.tested_at),
    });
  }
  feed.sort((a, b) => b.ts - a.ts);
  const recentFeed = feed.slice(0, 8);

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* ---------- greeting header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {firstName}
          </h1>
          <p className="text-slate-400 mt-1">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {usesPeptides && (
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg"
          >
            ⚡ Quick log
          </button>
        )}
      </div>

      {/* ---------- banners ---------- */}
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
      {stockWarning && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg px-4 py-3 text-sm">
          {stockWarning}
        </div>
      )}

      {/* ---------- stat cards ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* streak — both modes */}
        <div
          className={`bg-slate-900 border rounded-xl p-6 ${
            streakState === "active"
              ? "border-emerald-500/40"
              : streakState === "warning"
              ? "border-amber-500/40"
              : "border-slate-800"
          }`}
        >
          <p className="text-sm text-slate-400">Streak</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              streakState === "active"
                ? "text-emerald-400"
                : streakState === "warning"
                ? "text-amber-400"
                : "text-white"
            }`}
          >
            🔥 {streak} {streak === 1 ? "day" : "days"}
          </p>
          <p
            className={`text-sm mt-1 ${
              streakState === "warning" ? "text-amber-400" : "text-slate-500"
            }`}
          >
            {streakState === "none"
              ? "Log anything to start one"
              : streakState === "active"
              ? "✓ Active — logged today"
              : `⚠️ Log today to keep your ${streak}-day streak`}
          </p>
        </div>

        {/* current weight — both modes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-sm text-slate-400">Current weight</p>
          <p className="text-2xl font-bold text-white mt-1">
            {latestWeight
              ? `${parseFloat(latestWeight.weight).toFixed(1)} ${latestWeight.unit}`
              : "—"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {weightChange === null
              ? latestWeight
                ? "First entry"
                : "No weigh-ins yet"
              : weightChange <= -0.05
              ? `↓ ${Math.abs(weightChange).toFixed(1)} ${latestWeight.unit} since start`
              : weightChange >= 0.05
              ? `↑ ${weightChange.toFixed(1)} ${latestWeight.unit} since start`
              : "No change since start"}
          </p>
        </div>

        {usesPeptides ? (
          <>
            {/* last dose — peptide mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-sm text-slate-400">Last dose</p>
              <p className="text-2xl font-bold text-white mt-1">
                {lastDose
                  ? `${parseFloat(lastDose.dose_amount)} ${lastDose.unit}`
                  : "—"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {lastDose
                  ? `${lastDose.peptide_name} · ${friendlyWhen(lastDose.logged_at)}`
                  : "No doses yet"}
              </p>
            </div>

            {/* inventory — peptide mode */}
            <div
              className={`bg-slate-900 border rounded-xl p-6 ${
                lowStockItems.length > 0
                  ? "border-red-500/40"
                  : "border-slate-800"
              }`}
            >
              <p className="text-sm text-slate-400">Inventory</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  lowStockItems.length > 0 ? "text-red-400" : "text-white"
                }`}
              >
                {inventoryItems.length === 0
                  ? "—"
                  : lowStockItems.length > 0
                  ? `⚠️ ${lowStockItems.length} low`
                  : "Stocked"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {lowestItem
                  ? `Lowest: ${lowestItem.peptide_name} at ${lowestItem.percent.toFixed(0)}%`
                  : "Nothing tracked yet"}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* gym — non-peptide mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-sm text-slate-400">Gym</p>
              <p className="text-2xl font-bold text-white mt-1">
                🏋️ {gymSets30}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                sets in the last 30 days
              </p>
            </div>

            {/* photos — non-peptide mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-sm text-slate-400">Progress photos</p>
              <p className="text-2xl font-bold text-white mt-1">
                📷 {photos.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {photos.length > 0
                  ? `Last: ${friendlyWhen(photos[0].taken_at)}`
                  : "None in the last 90 days"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ---------- today + activity ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* TODAY panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Today</h2>

          <div className="space-y-3">
            {usesPeptides && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">💉 Dose</span>
                  <span
                    className={`text-sm font-semibold ${
                      todaysDoses.length > 0
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    {todaysDoses.length > 0 ? "✓ Logged" : "Not yet"}
                  </span>
                </div>
                {todaysDoses.map((d) => (
                  <p key={d.id} className="text-sm text-slate-500 mt-1">
                    {parseFloat(d.dose_amount)} {d.unit} {d.peptide_name} ·{" "}
                    {friendlyWhen(d.logged_at)}
                  </p>
                ))}
                {todaysDoses.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setQuickOpen(true)}
                    className="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700"
                  >
                    ⚡ Quick log a dose
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">⚖️ Weight</span>
              <span
                className={`text-sm font-semibold ${
                  weightToday ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {weightToday ? "✓ Logged" : "Not yet"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">🏋️ Gym</span>
              <span
                className={`text-sm font-semibold ${
                  gymToday ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {gymToday ? "✓ Logged" : "Not yet"}
              </span>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <Link
                href="/progress"
                className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                Log weight
              </Link>
              <Link
                href="/gym"
                className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                Log a set
              </Link>
              {usesPeptides && (
                <Link
                  href="/log"
                  className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  Full dose form
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">
            Recent activity
          </h2>

          {recentFeed.length === 0 ? (
            <p className="text-slate-500">
              Nothing yet — everything you log shows up here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {recentFeed.map((item, index) => (
                <li
                  key={index}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-semibold">
                        {item.text}
                      </p>
                      {item.sub && (
                        <p className="text-sm text-slate-500">{item.sub}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 whitespace-nowrap">
                    {item.when}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- weekly weigh-in ---------- */}
      <div
        className={`bg-slate-900 border rounded-xl p-6 ${
          weighinOverdue ? "border-amber-500/40" : "border-slate-800"
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">
              ⚖️ Weekly weigh-in
            </h2>
            <p
              className={`text-sm mt-1 ${
                weighinOverdue ? "text-amber-400" : "text-slate-500"
              }`}
            >
              {weighinMessage}
            </p>
          </div>
          {weighinOverdue && (
            <Link
              href="/progress"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-lg text-sm whitespace-nowrap"
            >
              Log weight
            </Link>
          )}
        </div>

        <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={weeklyEmail}
            onChange={handleToggleWeeklyEmail}
            className="w-4 h-4 accent-emerald-500"
          />
          <span className="text-sm text-slate-300">
            📧 Email me a weekly weigh-in reminder
          </span>
        </label>
      </div>

      {/* ---------- schedule this month (peptide mode) ---------- */}
      {usesPeptides && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Schedule this month
            </h2>
            <Link
              href="/calendar"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Open calendar →
            </Link>
          </div>

          {hasSchedules ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="max-w-md">
                <MiniCalendar
                  scheduledDates={scheduledDoseDates}
                  loggedDates={loggedDoseDates}
                />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Upcoming doses</p>
                {upcomingDoses.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No upcoming scheduled doses in the next 90 days.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {upcomingDoses.map((day) => (
                      <li
                        key={day.key}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2"
                      >
                        <p className="text-xs text-slate-400">
                          {day.key === todayKey
                            ? "Today"
                            : day.date.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                        </p>
                        <p className="text-sm text-slate-300 mt-0.5">
                          {day.items.map((it, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <span className="text-white">
                                {it.peptide_name}
                              </span>{" "}
                              {it.dose} {it.unit}
                            </span>
                          ))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No active schedules yet — build a protocol in the{" "}
              <Link
                href="/planner"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Planner
              </Link>{" "}
              and save it as a schedule to see your dose days here.
            </p>
          )}
        </div>
      )}

      {/* ---------- quick-log modal ---------- */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                ⚡ Quick log a dose
              </h2>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="text-slate-500 hover:text-white"
                title="Close"
              >
                ✕
              </button>
            </div>

            {qError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                {qError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Peptide
              </label>
              <select
                value={qPeptide}
                onChange={(event) => setQPeptide(event.target.value)}
                className={inputClasses}
              >
                <option value="">Select a peptide...</option>
                {PEPTIDES.map((p) => (
                  <option key={p.full} value={p.full}>
                    {p.short} — {p.full}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Dose amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={qAmount}
                  onChange={(event) => setQAmount(event.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Unit
                </label>
                <select
                  value={qUnit}
                  onChange={(event) => setQUnit(event.target.value)}
                  className={inputClasses}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Injection site
              </label>
              <select
                value={qGroup}
                onChange={(event) => {
                  setQGroup(event.target.value);
                  setQSite("");
                }}
                className={`${inputClasses} mb-2`}
              >
                <option value="">Select body area...</option>
                {INJECTION_SITE_GROUPS.map((g) => (
                  <option key={g.group} value={g.group}>
                    {g.group}
                  </option>
                ))}
              </select>

              {qGroup && qGroup !== "Other" && (
                <select
                  value={qSite}
                  onChange={(event) => setQSite(event.target.value)}
                  className={inputClasses}
                >
                  <option value="">Select specific site...</option>
                  {INJECTION_SITE_GROUPS.find(
                    (g) => g.group === qGroup
                  )?.sites.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}

              {qGroup === "Other" && (
                <input
                  type="text"
                  placeholder="Describe exact injection location..."
                  value={qCustom}
                  onChange={(event) => setQCustom(event.target.value)}
                  className={inputClasses}
                />
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm text-slate-400 mb-1">
                Date &amp; time
              </label>
              <input
                type="datetime-local"
                value={qWhen}
                max={getLocalDateTimeString()}
                onChange={(event) => setQWhen(event.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>

            <button
              type="button"
              onClick={handleQuickLog}
              disabled={qSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {qSaving ? "Saving..." : "Log dose"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}