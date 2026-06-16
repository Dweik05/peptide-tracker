"use client";

// ============================================================
// DASHBOARD (v3 — reskinned)  —  goes in:  app/(app)/dashboard/page.js
//
// This is the SAME dashboard as before, with the new visual
// language applied: refined stat cards, more breathing room, and
// a cohesive line-icon set in place of the emoji. Every piece of
// logic (data fetching, streak math, inventory, the titration-
// aware schedule, the quick-log save, peptide/non-peptide modes)
// is unchanged. Only the markup changed.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { PEPTIDES, UNITS } from "../../lib/peptides";
import { INJECTION_SITE_GROUPS } from "../../lib/sites";
import { deductFromInventory } from "../../lib/inventory-helpers";
import MiniCalendar from "../../components/MiniCalendar";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import { isDoseDay, toDateString, dateFromString, doseOnDate } from "../../lib/schedule-helpers";

const LOW_STOCK_PERCENT = 20;

// ---------------- icons (cohesive line set, replaces emoji) ----------------
function Icon({ name, className = "w-4 h-4" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    zap: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
    flame: (
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alertTriangle: (
      <>
        <path d="M10.3 4.3 2.6 17.5A1.5 1.5 0 0 0 3.9 20h16.2a1.5 1.5 0 0 0 1.3-2.5L13.7 4.3a1.5 1.5 0 0 0-2.6 0z" />
        <path d="M12 9.5v4" />
        <path d="M12 17h.01" />
      </>
    ),
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
    chevron: <path d="M6 9l6 6 6-6" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    calendar: (
      <>
        <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      </>
    ),
    arrowRight: <path d="M5 12h13M12 6l6 6-6 6" />,
    dose: <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />,
    weight: (
      <>
        <path d="M5 8h14l1.4 12a1 1 0 0 1-1 1.1H4.6a1 1 0 0 1-1-1.1L5 8z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </>
    ),
    gym: <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />,
    measure: (
      <>
        <path d="M16 3 3 16l5 5L21 8z" />
        <path d="M9.5 10.5l1.5 1.5M12.5 7.5l1.5 1.5M6.5 13.5l1.5 1.5" />
      </>
    ),
    photo: (
      <>
        <rect x="3" y="6.5" width="18" height="13.5" rx="2" />
        <circle cx="12" cy="13.5" r="3.3" />
        <path d="M8.5 6.5 10 4h4l1.5 2.5" />
      </>
    ),
    lab: (
      <>
        <path d="M9.5 3h5M10.5 3v6l-5 8.5A1.4 1.4 0 0 0 6.7 20h10.6a1.4 1.4 0 0 0 1.2-2.1L13.5 9V3" />
        <path d="M8 14.5h8" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

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

// "today" / "yesterday" / "Jun 8" — date only (no time), for the weigh-in date
function weighInDate(value) {
  const safe =
    typeof value === "string" && value.length === 10
      ? `${value}T12:00:00`
      : value;
  const d = new Date(safe);
  const key = dateKeyFromDate(d);
  const now = new Date();
  const todayK = dateKeyFromDate(now);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yK = dateKeyFromDate(y);
  if (key === todayK) return "today";
  if (key === yK) return "yesterday";
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

  // recent-activity collapse toggle
  const [activityOpen, setActivityOpen] = useState(true);

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
      .select("uses_peptides")
      .eq("id", uid)
      .single();

    if (profileError) {
      // Column missing or row missing → default to peptide mode.
      console.warn("Profile mode unavailable, defaulting:", profileError.message);
      setUsesPeptides(true);
    } else {
      setUsesPeptides(data?.uses_peptides ?? true);
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
        ? `Dose logged! ${deduction.message}`
        : "Dose logged successfully!"
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
      type: "dose",
      text: `${parseFloat(d.dose_amount)} ${d.unit} ${d.peptide_name}`,
      sub: d.injection_site,
      when: friendlyWhen(d.logged_at),
    });
  }
  for (const w of recentWeights) {
    feed.push({
      ts: new Date(w.logged_at).getTime(),
      type: "weight",
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
      type: "gym",
      text: `${g.exercise_name} — ${detail}`,
      sub: "",
      when: friendlyWhen(g.logged_at),
    });
  }
  for (const m of measurements) {
    feed.push({
      ts: new Date(m.logged_at).getTime(),
      type: "measure",
      text: "Body measurements",
      sub: "",
      when: friendlyWhen(m.logged_at),
    });
  }
  for (const p of photos) {
    feed.push({
      ts: new Date(p.taken_at).getTime(),
      type: "photo",
      text: "Progress photo",
      sub: p.caption || "",
      when: friendlyWhen(p.taken_at),
    });
  }
  for (const l of labs) {
    feed.push({
      ts: new Date(`${l.tested_at}T12:00:00`).getTime(),
      type: "lab",
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
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* ---------- greeting header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {todaysDoses.length > 0 && (
              <span className="text-slate-500">
                {" "}
                · {todaysDoses.length} logged today
              </span>
            )}
          </p>
        </div>

        {usesPeptides && (
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold text-sm px-4 h-10 rounded-lg transition-colors"
          >
            <Icon name="zap" className="w-4 h-4" />
            Quick log
          </button>
        )}
      </div>

      {/* ---------- onboarding checklist (new users only) ---------- */}
      <OnboardingChecklist />

      {/* ---------- banners ---------- */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <Icon name="alertCircle" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm">
          <Icon name="check" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {stockWarning && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg px-4 py-3 text-sm">
          <Icon name="alertTriangle" className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{stockWarning}</span>
        </div>
      )}

      {/* ---------- stat cards ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* streak — both modes */}
        <div
          className={`bg-slate-900 border rounded-xl p-5 ${
            streakState === "active"
              ? "border-emerald-500/40"
              : streakState === "warning"
              ? "border-amber-500/40"
              : "border-slate-800"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Streak
          </p>
          <p
            className={`text-[26px] leading-none font-semibold mt-3 flex items-center gap-2 ${
              streakState === "active"
                ? "text-emerald-400"
                : streakState === "warning"
                ? "text-amber-400"
                : "text-white"
            }`}
          >
            <Icon name="flame" className="w-5 h-5" />
            {streak}
            <span className="text-base font-medium text-slate-400">
              {streak === 1 ? "day" : "days"}
            </span>
          </p>
          <p
            className={`text-xs mt-2.5 ${
              streakState === "warning" ? "text-amber-400" : "text-slate-500"
            }`}
          >
            {streakState === "none"
              ? "Log anything to start one"
              : streakState === "active"
              ? "Active — logged today"
              : `Log today to keep your ${streak}-day streak`}
          </p>
        </div>

        {/* current weight — both modes (links to Progress) */}
        <Link
          href="/progress"
          className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Current weight
          </p>
          <p className="text-[26px] leading-none font-semibold text-white mt-3">
            {latestWeight ? (
              <>
                {parseFloat(latestWeight.weight).toFixed(1)}
                <span className="text-base font-medium text-slate-400">
                  {" "}
                  {latestWeight.unit}
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="text-xs text-slate-500 mt-2.5">
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
          {latestWeight && (
            <p className="text-[11px] text-slate-600 mt-1">
              Weighed {weighInDate(latestWeight.logged_at)}
            </p>
          )}
        </Link>

        {usesPeptides ? (
          <>
            {/* last dose — peptide mode (links to Log) */}
            <Link
              href="/log"
              className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Last dose
              </p>
              <p className="text-[26px] leading-none font-semibold text-white mt-3">
                {lastDose ? (
                  <>
                    {parseFloat(lastDose.dose_amount)}
                    <span className="text-base font-medium text-slate-400">
                      {" "}
                      {lastDose.unit}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="text-xs text-slate-500 mt-2.5">
                {lastDose
                  ? `${lastDose.peptide_name} · ${friendlyWhen(lastDose.logged_at)}`
                  : "No doses yet"}
              </p>
            </Link>

            {/* inventory — peptide mode (links to Inventory) */}
            <Link
              href="/inventory"
              className={`block bg-slate-900 border rounded-xl p-5 hover:border-slate-700 transition-colors ${
                lowStockItems.length > 0
                  ? "border-red-500/40"
                  : "border-slate-800"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Inventory
              </p>
              <p
                className={`text-[26px] leading-none font-semibold mt-3 flex items-center gap-2 ${
                  lowStockItems.length > 0 ? "text-red-400" : "text-white"
                }`}
              >
                {inventoryItems.length === 0 ? (
                  "—"
                ) : lowStockItems.length > 0 ? (
                  <>
                    <Icon name="alertTriangle" className="w-5 h-5" />
                    {lowStockItems.length} low
                  </>
                ) : (
                  "Stocked"
                )}
              </p>
              <p className="text-xs text-slate-500 mt-2.5">
                {lowestItem
                  ? `Lowest: ${lowestItem.peptide_name} at ${lowestItem.percent.toFixed(0)}%`
                  : "Nothing tracked yet"}
              </p>
            </Link>
          </>
        ) : (
          <>
            {/* gym — non-peptide mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Gym
              </p>
              <p className="text-[26px] leading-none font-semibold text-white mt-3">
                {gymSets30}
              </p>
              <p className="text-xs text-slate-500 mt-2.5">
                sets in the last 30 days
              </p>
            </div>

            {/* photos — non-peptide mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Progress photos
              </p>
              <p className="text-[26px] leading-none font-semibold text-white mt-3">
                {photos.length}
              </p>
              <p className="text-xs text-slate-500 mt-2.5">
                {photos.length > 0
                  ? `Last: ${friendlyWhen(photos[0].taken_at)}`
                  : "None in the last 90 days"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ---------- schedule this month (peptide mode) ---------- */}
      {usesPeptides && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Icon name="calendar" className="w-[18px] h-[18px] text-slate-400" />
              Schedule this month
            </h2>
            <Link
              href="/calendar"
              className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
            >
              Open calendar <Icon name="arrowRight" className="w-3.5 h-3.5" />
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
                        className="bg-slate-800/40 border border-slate-800 rounded-lg px-3 py-2"
                      >
                        <p className="text-xs text-slate-500">
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

      {/* ---------- recent activity (collapsible) ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <button
          type="button"
          onClick={() => setActivityOpen((open) => !open)}
          aria-expanded={activityOpen}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-base font-semibold text-white">Recent activity</h2>
          <Icon
            name="chevron"
            className={`w-4 h-4 text-slate-400 transition-transform ${
              activityOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {activityOpen &&
          (recentFeed.length === 0 ? (
            <p className="text-slate-500 mt-4 text-sm">
              Nothing yet — everything you log shows up here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800 mt-4">
              {recentFeed.map((item, index) => (
                <li
                  key={index}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <Icon name={item.type} className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {item.text}
                      </p>
                      {item.sub && (
                        <p className="text-xs text-slate-500">{item.sub}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {item.when}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </div>

      {/* ---------- quick-log modal ---------- */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Icon name="zap" className="w-[18px] h-[18px] text-emerald-400" />
                Quick log a dose
              </h2>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="text-slate-500 hover:text-white"
                aria-label="Close"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {qError && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                <Icon name="alertCircle" className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{qError}</span>
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
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              {qSaving ? "Saving..." : "Log dose"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}