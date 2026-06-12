"use client";

// ============================================================
// LOG PAGE  —  goes in:  app/(app)/log/page.js
//
// Day 15: the body diagram learns your history. 🗺️
//
// What's new:
//   - SITE ROTATION MAP (right column): every injection site,
//     heat-colored from your last 90 days of doses —
//       🔴 used in the last 7 days (let it rest)
//       🟠 used 7–14 days ago
//       🟢 rested 14+ days
//       ⚪ not used in the window
//     Click any dot for its count + last-used date. Works for
//     ALL your history — dropdown-logged and diagram-logged
//     doses both light up, thanks to the new site-key
//     normalization in app/lib/sites.js.
//   - SUGGESTED NEXT SITE: the least-recently-used spot within
//     the body areas you actually inject — with a "Use this
//     site" button that pre-fills the form's diagram.
//   - "Why rotate?" — collapsible education note + disclaimer.
//   - Layout: /log is now two-column on desktop like the rest
//     of the app (form left, map + recent doses right; stacks
//     on mobile). Every form behavior is unchanged.
//
// BODY_POINTS moved to app/lib/sites.js — this page imports it.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { PEPTIDES, UNITS } from "../../lib/peptides";
import {
  INJECTION_SITE_GROUPS,
  BODY_POINTS,
  ALL_BODY_POINTS,
  normalizeSiteKey,
  groupOfKey,
} from "../../lib/sites";
import { deductFromInventory } from "../../lib/inventory-helpers";
import StackSummary from "../../components/StackSummary";

// Local date+time as "YYYY-MM-DDTHH:MM" for the datetime picker.
function getLocalDateTimeString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// "today" / "yesterday" / "12 days ago"
function daysAgoText(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// Heat color for a site by how recently it was used
function recencyFill(lastTs) {
  const days = (Date.now() - lastTs) / 86400000;
  if (days < 7) return "#ef4444"; // red — let it rest
  if (days < 14) return "#f59e0b"; // amber — recently used
  return "#10b981"; // emerald — rested
}

// ------------------------------------------------------------
// The body outline, shared by the picker diagram and the
// rotation map (extracted so it exists exactly once).
// ------------------------------------------------------------
function BodySilhouette({ view }) {
  if (view === "front") {
    return (
      <g fill="none" stroke="#475569" strokeWidth="1.5">
        <ellipse cx="200" cy="60" rx="28" ry="35" fill="#1e293b" />
        <rect x="190" y="90" width="20" height="20" fill="#1e293b" />
        <path d="M155 110 L245 110 L250 300 L150 300 Z" fill="#1e293b" />
        <path d="M155 115 L130 120 L120 240 L140 245 L150 130 Z" fill="#1e293b" />
        <path d="M245 115 L270 120 L280 240 L260 245 L250 130 Z" fill="#1e293b" />
        <path d="M150 300 L165 300 L170 420 L155 420 Z" fill="#1e293b" />
        <path d="M235 300 L250 300 L245 420 L230 420 Z" fill="#1e293b" />
        <line x1="155" y1="115" x2="245" y2="115" stroke="#64748b" />
        <line x1="165" y1="185" x2="235" y2="185" stroke="#334155" />
        <line x1="158" y1="245" x2="242" y2="245" stroke="#334155" />
        <line x1="152" y1="295" x2="248" y2="295" stroke="#334155" />
      </g>
    );
  }
  return (
    <g fill="none" stroke="#475569" strokeWidth="1.5">
      <ellipse cx="200" cy="60" rx="28" ry="35" fill="#1e293b" />
      <rect x="190" y="90" width="20" height="20" fill="#1e293b" />
      <path d="M155 110 L245 110 L250 300 L150 300 Z" fill="#1e293b" />
      <path d="M155 115 L130 120 L120 240 L140 245 L150 130 Z" fill="#1e293b" />
      <path d="M245 115 L270 120 L280 240 L260 245 L250 130 Z" fill="#1e293b" />
      <path d="M150 300 L165 300 L170 420 L155 420 Z" fill="#1e293b" />
      <path d="M235 300 L250 300 L245 420 L230 420 Z" fill="#1e293b" />
      <line x1="200" y1="115" x2="200" y2="295" stroke="#334155" />
      <line x1="175" y1="140" x2="225" y2="140" stroke="#334155" />
      <line x1="170" y1="175" x2="230" y2="175" stroke="#334155" />
    </g>
  );
}

// ------------------------------------------------------------
// The site picker used by the form (unchanged behavior).
// ------------------------------------------------------------
function BodyDiagram({ selectedPoint, onSelectPoint }) {
  const [view, setView] = useState("front");
  const points = BODY_POINTS[view];

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setView("front")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "front" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Front View
        </button>
        <button
          onClick={() => setView("back")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "back" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Back View
        </button>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 400 500" className="w-full max-w-xs" style={{ background: "transparent" }}>
          <BodySilhouette view={view} />
          {points.map((point) => (
            <g key={point.id} onClick={() => onSelectPoint(point.label)} style={{ cursor: "pointer" }}>
              <circle
                cx={point.cx}
                cy={point.cy}
                r="10"
                fill={selectedPoint === point.label ? "#10b981" : "#1e293b"}
                stroke={selectedPoint === point.label ? "#10b981" : "#475569"}
                strokeWidth="2"
                opacity="0.85"
              />
              <circle
                cx={point.cx}
                cy={point.cy}
                r="4"
                fill={selectedPoint === point.label ? "white" : "#64748b"}
              />
            </g>
          ))}
        </svg>
      </div>

      {selectedPoint && (
        <p className="text-emerald-400 text-sm text-center mt-2">📍 Selected: {selectedPoint}</p>
      )}
      <p className="text-slate-500 text-xs text-center mt-1">Click a dot to mark your injection site</p>
    </div>
  );
}

// ------------------------------------------------------------
// NEW: the rotation map — your 90-day injection history
// painted onto the body, plus the suggested next site.
// ------------------------------------------------------------
function RotationMap({ stats, unmappedCount, suggestion, onUseSite }) {
  const [view, setView] = useState("front");
  const [selectedKey, setSelectedKey] = useState(null);
  const [showWhy, setShowWhy] = useState(false);

  const points = BODY_POINTS[view];
  const selectedStat = selectedKey ? stats[selectedKey] : null;
  const selectedPoint = selectedKey
    ? ALL_BODY_POINTS.find((p) => p.id === selectedKey)
    : null;

  return (
    <div>
      {/* suggestion banner */}
      {suggestion && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-emerald-400">
            💡 Suggested next:{" "}
            <span className="font-semibold">{suggestion.point.label}</span>{" "}
            <span className="text-emerald-400/70">
              {suggestion.lastTs === 0
                ? "(not used in the last 90 days)"
                : `(rested ${Math.floor(
                    (Date.now() - suggestion.lastTs) / 86400000
                  )} days)`}
            </span>
          </p>
          <button
            type="button"
            onClick={() => onUseSite(suggestion.point.label)}
            className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded-lg"
          >
            Use this site
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setView("front")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "front" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Front View
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "back" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Back View
        </button>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 400 500" className="w-full max-w-xs" style={{ background: "transparent" }}>
          <BodySilhouette view={view} />
          {points.map((point) => {
            const stat = stats[point.id];
            const isSelected = selectedKey === point.id;
            return (
              <g
                key={point.id}
                onClick={() =>
                  setSelectedKey(isSelected ? null : point.id)
                }
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r="10"
                  fill={stat ? recencyFill(stat.lastTs) : "#1e293b"}
                  stroke={isSelected ? "#ffffff" : stat ? recencyFill(stat.lastTs) : "#475569"}
                  strokeWidth={isSelected ? "2.5" : "2"}
                  opacity={stat ? 0.9 : 0.6}
                />
                {stat && (
                  <text
                    x={point.cx}
                    y={point.cy + 3.5}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="#0f172a"
                    style={{ pointerEvents: "none" }}
                  >
                    {stat.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-slate-500 text-center mt-2">
        <span className="text-red-400">●</span> last 7 days ·{" "}
        <span className="text-amber-400">●</span> 7–14 days ·{" "}
        <span className="text-emerald-400">●</span> rested 14+ ·{" "}
        <span className="text-slate-500">○</span> unused — numbers are doses
        in 90 days
      </p>

      {selectedPoint && (
        <p className="text-sm text-slate-300 text-center mt-2">
          <span className="font-semibold text-white">
            {selectedPoint.label}
          </span>{" "}
          {selectedStat
            ? `— used ${selectedStat.count}× in 90 days · last ${daysAgoText(
                selectedStat.lastTs
              )}`
            : "— not used in the last 90 days"}
        </p>
      )}

      {unmappedCount > 0 && (
        <p className="text-xs text-slate-500 text-center mt-2">
          {unmappedCount} dose{unmappedCount === 1 ? "" : "s"} with custom
          "Other" sites can't be shown on the map.
        </p>
      )}

      {/* why rotate? (collapsible) */}
      <button
        type="button"
        onClick={() => setShowWhy(!showWhy)}
        aria-expanded={showWhy}
        className="mt-4 text-sm text-slate-400 hover:text-white"
      >
        {showWhy ? "▾" : "▸"} Why rotate sites?
      </button>
      {showWhy && (
        <div className="mt-2 text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 space-y-2">
          <p>
            Injecting the same spot too often can cause lipohypertrophy —
            firm lumps under the skin that can also make absorption
            unpredictable. Common guidance: rotate between sites, keep
            injections roughly an inch (2–3 cm) apart, give each spot 1–2
            weeks of rest, and avoid skin that's bruised, scarred, or
            tender.
          </p>
          <p className="text-xs text-slate-500">
            General education, not medical advice — follow your
            prescriber's instructions.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Log() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [stockWarning, setStockWarning] = useState("");
  const [error, setError] = useState("");
  const [recentLogs, setRecentLogs] = useState([]);
  const [siteMode, setSiteMode] = useState("dropdown");
  const [sessionDebug, setSessionDebug] = useState("");

  // rotation map data
  const [siteStats, setSiteStats] = useState({});
  const [unmappedCount, setUnmappedCount] = useState(0);

  const today = getLocalDateTimeString();
  const [peptideName, setPeptideName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [unit, setUnit] = useState("mg");
  const [injectionSite, setInjectionSite] = useState("");
  const [injectionGroup, setInjectionGroup] = useState("");
  const [customSite, setCustomSite] = useState("");
  const [diagramSite, setDiagramSite] = useState("");
  const [loggedAt, setLoggedAt] = useState(getLocalDateTimeString());
  const [notes, setNotes] = useState("");

  const router = useRouter();

  useEffect(() => {
    async function initialize() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setSessionDebug(`User ID: ${session.user.id.substring(0, 8)}...`);
      await Promise.all([
        fetchRecentLogs(session.user.id),
        fetchSiteHistory(session.user.id),
      ]);
      setLoading(false);
    }
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRecentLogs(userId) {
    const { data, error } = await supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(10);
    if (data) setRecentLogs(data);
  }

  // Last 90 days of injection sites → { siteKey: { count, lastTs } }
  async function fetchSiteHistory(userId) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data } = await supabase
      .from("dose_logs")
      .select("injection_site, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", ninetyDaysAgo.toISOString());

    const stats = {};
    let unmapped = 0;

    for (const row of data || []) {
      const key = normalizeSiteKey(row.injection_site);
      if (!key) {
        unmapped = unmapped + 1;
        continue;
      }
      const ts = new Date(row.logged_at).getTime();
      if (!stats[key]) stats[key] = { count: 0, lastTs: 0 };
      stats[key].count = stats[key].count + 1;
      if (ts > stats[key].lastTs) stats[key].lastTs = ts;
    }

    setSiteStats(stats);
    setUnmappedCount(unmapped);
  }

  // Least-recently-used site WITHIN the body areas you actually
  // use (never suggests a region you've never injected).
  function computeSuggestion() {
    const usedKeys = Object.keys(siteStats);
    if (usedKeys.length === 0) return null;

    const usedGroups = new Set(usedKeys.map((key) => groupOfKey(key)));
    const candidates = ALL_BODY_POINTS.filter((point) =>
      usedGroups.has(groupOfKey(point.id))
    );

    let best = null;
    for (const point of candidates) {
      const stat = siteStats[point.id];
      const lastTs = stat ? stat.lastTs : 0; // never used = oldest
      const count = stat ? stat.count : 0;
      if (
        best === null ||
        lastTs < best.lastTs ||
        (lastTs === best.lastTs && count < best.count)
      ) {
        best = { point: point, lastTs: lastTs, count: count };
      }
    }
    return best;
  }

  const suggestion = computeSuggestion();

  // "Use this site" → pre-fill the form's diagram picker
  function handleUseSite(label) {
    setSiteMode("diagram");
    setDiagramSite(label);
  }

  function getFinalSite() {
    if (siteMode === "diagram") return diagramSite;
    if (injectionGroup === "Other") return customSite;
    if (injectionGroup && injectionSite) return `${injectionGroup} - ${injectionSite}`;
    return "";
  }

  async function handleSave() {
    const finalSite = getFinalSite();

    if (!peptideName || !doseAmount || !finalSite) {
      setError("Please fill in peptide, dose amount, and injection site.");
      return;
    }

    setSaving(true);
    setError("");
    setStockWarning("");

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setError("Session expired. Please log out and log back in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("dose_logs").insert({
      user_id: session.user.id,
      peptide_name: peptideName,
      dose_amount: parseFloat(doseAmount),
      unit: unit,
      injection_site: finalSite,
      logged_at: loggedAt,
      notes: notes,
    });

    if (error) {
      setError(`Error: ${error.message} | Code: ${error.code}`);
    } else {
      // dose saved — now auto-deduct from inventory (shared helper)
      const deduction = await deductFromInventory(
        session.user.id,
        peptideName,
        parseFloat(doseAmount),
        unit
      );

      setSuccess(
        deduction.message
          ? `✅ Dose logged! ${deduction.message}`
          : "✅ Dose logged successfully!"
      );
      if (deduction.warning) {
        setStockWarning(deduction.warning);
      }

      setPeptideName("");
      setDoseAmount("");
      setInjectionSite("");
      setInjectionGroup("");
      setCustomSite("");
      setDiagramSite("");
      setNotes("");
      setLoggedAt(getLocalDateTimeString());
      await Promise.all([
        fetchRecentLogs(session.user.id),
        fetchSiteHistory(session.user.id),
      ]);
      setTimeout(() => setSuccess(""), 6000);
    }

    setSaving(false);
  }

  const selectedGroupData = INJECTION_SITE_GROUPS.find((g) => g.group === injectionGroup);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Log a Dose</h1>
        <p className="text-slate-600 text-xs mb-6">{sessionDebug}</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        {stockWarning && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {stockWarning}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ============ LEFT: the log form (unchanged) ============ */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-1 block">Peptide</label>
              <select
                value={peptideName}
                onChange={(e) => setPeptideName(e.target.value)}
                className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a peptide...</option>
                {PEPTIDES.map((p) => (
                  <option key={p.full} value={p.full}>{p.short} — {p.full}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-slate-400 text-sm mb-1 block">Dose Amount</label>
                <input
                  type="number"
                  value={doseAmount}
                  onChange={(e) => setDoseAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="w-28">
                <label className="text-slate-400 text-sm mb-1 block">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-2 block">Injection Site</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSiteMode("dropdown")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    siteMode === "dropdown" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  📋 Dropdown
                </button>
                <button
                  onClick={() => setSiteMode("diagram")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    siteMode === "diagram" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  🧍 Body Diagram
                </button>
              </div>

              {siteMode === "dropdown" ? (
                <div>
                  <select
                    value={injectionGroup}
                    onChange={(e) => { setInjectionGroup(e.target.value); setInjectionSite(""); }}
                    className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 mb-2"
                  >
                    <option value="">Select body area...</option>
                    {INJECTION_SITE_GROUPS.map((g) => (
                      <option key={g.group} value={g.group}>{g.group}</option>
                    ))}
                  </select>

                  {injectionGroup && injectionGroup !== "Other" && selectedGroupData && (
                    <select
                      value={injectionSite}
                      onChange={(e) => setInjectionSite(e.target.value)}
                      className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select specific site...</option>
                      {selectedGroupData.sites.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}

                  {injectionGroup === "Other" && (
                    <input
                      type="text"
                      value={customSite}
                      onChange={(e) => setCustomSite(e.target.value)}
                      placeholder="Describe exact injection location..."
                      className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              ) : (
                <BodyDiagram selectedPoint={diagramSite} onSelectPoint={setDiagramSite} />
              )}
            </div>

            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-1 block">Date & Time</label>
              <input
                type="datetime-local"
                value={loggedAt}
                max={today}
                onChange={(e) => setLoggedAt(e.target.value)}
                className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="mb-6">
              <label className="text-slate-400 text-sm mb-1 block">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations or notes..."
                rows={3}
                className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Log Dose"}
            </button>
          </div>

          {/* ============ RIGHT: stack + rotation map + recent doses ============ */}
          <div className="space-y-6">
            <StackSummary />

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-white font-semibold mb-4">
                Site rotation <span className="text-sm font-normal text-slate-500">(last 90 days)</span>
              </h2>
              <RotationMap
                stats={siteStats}
                unmappedCount={unmappedCount}
                suggestion={suggestion}
                onUseSite={handleUseSite}
              />
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-white font-semibold mb-4">Recent Doses</h2>
              {recentLogs.length === 0 ? (
                <p className="text-slate-500 text-sm">No doses logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div>
                        <p className="text-white font-semibold">{log.peptide_name}</p>
                        <p className="text-slate-400 text-sm">{log.dose_amount} {log.unit} — {log.injection_site}</p>
                      </div>
                      <span className="text-slate-500 text-sm">
                        {new Date(log.logged_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}