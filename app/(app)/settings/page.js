"use client";

// ============================================================
// SETTINGS PAGE  —  goes in:  app/(app)/settings/page.js
//
// Day 25A — the first real Settings page. Two cards:
//
//   1. ACCOUNT
//      - Display name (editable). Your name lives in Supabase
//        Auth (user_metadata.full_name), set when you signed up,
//        so we save it with supabase.auth.updateUser(...) — NOT
//        a profiles update. The dashboard greeting reads the same
//        field, so it updates there too after a refresh.
//      - Email (read-only). Changing a login email needs a
//        re-verification flow we haven't built, so it's shown
//        but not editable here.
//
//   2. TIMEZONE
//      - A dropdown saved to profiles.timezone. This is what the
//        daily email job will use to decide when "today" starts
//        for you (right now the email route assumes Toronto for
//        everyone — wiring this in is the next chunk, 25B).
//      - A "Use my current timezone" button that reads it from
//        your browser, and a live clock so you can confirm the
//        zone is right.
//
// Needs one SQL migration first (see the chat) to add the
// timezone column. Nothing else on the app depends on this page.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// A curated list of common timezones (IANA names). Not every zone
// on earth — just the ones our users are realistically in, grouped
// roughly by region. If someone's saved/detected zone isn't in here,
// we add it to the top of the list at runtime so it still shows.
const TIMEZONES = [
  // North America
  { value: "America/St_Johns", label: "Newfoundland — St. John's" },
  { value: "America/Halifax", label: "Atlantic — Halifax" },
  { value: "America/Toronto", label: "Eastern — Toronto / New York" },
  { value: "America/Chicago", label: "Central — Chicago / Winnipeg" },
  { value: "America/Denver", label: "Mountain — Denver / Edmonton" },
  { value: "America/Phoenix", label: "Mountain (no DST) — Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles / Vancouver" },
  { value: "America/Anchorage", label: "Alaska — Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  // Europe / Africa
  { value: "Europe/London", label: "UK / Ireland — London" },
  { value: "Europe/Lisbon", label: "Portugal — Lisbon" },
  { value: "Europe/Paris", label: "Central Europe — Paris / Berlin / Madrid" },
  { value: "Europe/Athens", label: "Eastern Europe — Athens / Helsinki" },
  { value: "Africa/Johannesburg", label: "South Africa — Johannesburg" },
  // Middle East / Asia / Pacific
  { value: "Asia/Dubai", label: "Gulf — Dubai" },
  { value: "Asia/Kolkata", label: "India — Kolkata / Mumbai" },
  { value: "Asia/Singapore", label: "Singapore / Hong Kong" },
  { value: "Asia/Tokyo", label: "Japan / Korea — Tokyo" },
  { value: "Australia/Sydney", label: "Eastern Australia — Sydney" },
  { value: "Pacific/Auckland", label: "New Zealand — Auckland" },
  // Fallback
  { value: "UTC", label: "UTC" },
];

const DEFAULT_TZ = "America/Toronto";

// The browser's best guess at the user's timezone, e.g. "America/Toronto".
function detectBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch (e) {
    return DEFAULT_TZ;
  }
}

// "3:45 PM" in a given timezone, for the live confirmation clock.
function timeInZone(tz) {
  try {
    return new Date().toLocaleTimeString(undefined, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return "—";
  }
}

const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function SettingsPage() {
  const router = useRouter();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // account
  const [email, setEmail] = useState(""); // read-only
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  // timezone
  const [timezone, setTimezone] = useState(DEFAULT_TZ);
  const [savingTz, setSavingTz] = useState(false);
  const [tzError, setTzError] = useState("");
  const [tzSuccess, setTzSuccess] = useState("");

  // a ticking clock so the "time there" preview stays live
  const [, setClockTick] = useState(0);

  // ---------- load session + profile on open ----------
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
      setEmail(session.user.email || "");
      setName(session.user.user_metadata?.full_name || "");

      // load the saved timezone (falls back to the browser's guess)
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", session.user.id)
        .single();

      if (data && data.timezone) {
        setTimezone(data.timezone);
      } else {
        setTimezone(detectBrowserTimezone());
      }

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tick the clock once a minute so "time there" doesn't go stale
  useEffect(() => {
    const id = setInterval(() => setClockTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // ---------- save the display name (Auth, not profiles) ----------
  async function handleSaveName() {
    setNameError("");
    setNameSuccess("");

    const trimmed = name.trim();
    if (trimmed === "") {
      setNameError("Please enter a name.");
      return;
    }

    setSavingName(true);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    setSavingName(false);

    if (updateError) {
      setNameError(`Couldn't save your name: ${updateError.message}`);
      return;
    }

    setName(trimmed);
    setNameSuccess("Name saved! Your dashboard greeting updates on refresh.");
    setTimeout(() => setNameSuccess(""), 4000);
  }

  // ---------- save the timezone (profiles) ----------
  async function handleSaveTimezone() {
    setTzError("");
    setTzSuccess("");

    if (!userId) return;

    setSavingTz(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ timezone: timezone })
      .eq("id", userId);
    setSavingTz(false);

    if (updateError) {
      setTzError(`Couldn't save timezone: ${updateError.message}`);
      return;
    }

    setTzSuccess("Timezone saved.");
    setTimeout(() => setTzSuccess(""), 4000);
  }

  // ---------- use the browser's timezone ----------
  function handleDetectTimezone() {
    setTzError("");
    setTzSuccess("");
    setTimezone(detectBrowserTimezone());
  }

  // Build the dropdown options: the curated list, plus the current
  // value pinned to the top if it isn't already one of them.
  const options = TIMEZONES.some((tz) => tz.value === timezone)
    ? TIMEZONES
    : [{ value: timezone, label: timezone }, ...TIMEZONES];

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your settings...</p>
      </div>
    );
  }

  return (
    // If this looks double-padded vs your other pages, your layout.js
    // already adds padding — change p-8 below to p-0.
    <div className="p-8 max-w-2xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Your account and how Peptide Tracker works for you.
        </p>
      </div>

      {/* ---------- account ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>

        {nameError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {nameError}
          </div>
        )}
        {nameSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
            {nameSuccess}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Display name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClasses}
            />
            <p className="text-sm text-slate-500 mt-1">
              This is the name used in your dashboard greeting.
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClasses} opacity-60 cursor-not-allowed`}
            />
            <p className="text-sm text-slate-500 mt-1">
              This is your login email — it can't be changed here yet.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveName}
            disabled={savingName}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
          >
            {savingName ? "Saving..." : "Save name"}
          </button>
        </div>
      </div>

      {/* ---------- timezone ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Timezone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Used to decide when your day starts for reminder emails. Pick the
          zone you live in.
        </p>

        {tzError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {tzError}
          </div>
        )}
        {tzSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
            {tzSuccess}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Your timezone
            </label>
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className={inputClasses}
            >
              {options.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 mt-1">
              Right now it's{" "}
              <span className="text-slate-300 font-medium">
                {timeInZone(timezone)}
              </span>{" "}
              there.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveTimezone}
              disabled={savingTz}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
            >
              {savingTz ? "Saving..." : "Save timezone"}
            </button>
            <button
              type="button"
              onClick={handleDetectTimezone}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-6 py-3 rounded-lg border border-slate-700"
            >
              Use my current timezone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}