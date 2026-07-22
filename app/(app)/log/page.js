"use client";

// ============================================================
// LOG PAGE (reskinned)  —  goes in:  app/(app)/log/page.js
//
// Day 15: the body diagram learns your history.
//
// What's new:
//   - SITE ROTATION MAP (right column): every injection site,
//     heat-colored from your last 90 days of doses —
//       red    — used in the last 7 days (let it rest)
//       amber  — used 7–14 days ago
//       emerald— rested 14+ days
//       grey   — not used in the window
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
// RESKIN: visuals only. The SVG body-map / heat-dot colors are
// hardcoded hex (they can't read the central palette), so they
// were retuned by hand here; the red/amber/emerald recency
// meaning is unchanged. Emoji became line icons, and the
// emerald-filled buttons use dark text. No logic changed.
//
// BODY_POINTS moved to app/lib/sites.js — this page imports it.
//
// v2.1 — added the "?" tour replay button beside the heading.
// No logic changes.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { PEPTIDES, UNITS, VIAL_SIZES } from "../../lib/peptides";
import {
  INJECTION_SITE_GROUPS,
  BODY_POINTS,
  ALL_BODY_POINTS,
  normalizeSiteKey,
  groupOfKey,
} from "../../lib/sites";
import { deductFromInventory } from "../../lib/inventory-helpers";
import StackSummary from "../../components/StackSummary";
import { hasPremiumAccess } from "../../lib/access";
import DrawCalculator from "../../components/DrawCalculator";
import PageTour from "../../components/PageTour";
import TourHelpButton from "../../components/TourHelpButton";

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
    pin: (
      <>
        <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    bulb: (
      <>
        <path d="M9.5 18h5M10.5 21h3" />
        <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.9 1 1 1.7l.1.5h5l.1-.5c.1-.7.5-1.3 1-1.7A6 6 0 0 0 12 3z" />
      </>
    ),
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    body: (
      <>
        <circle cx="12" cy="5" r="2.6" />
        <path d="M12 7.6v7.4M12 11l-4 2.6M12 11l4 2.6M8.6 20l3.4-5 3.4 5" />
      </>
    ),
    chevronDown: <path d="M6 9l6 6 6-6" />,
    chevronRight: <path d="M9 6l6 6-6 6" />,
    check: <path d="M20 6 9 17l-5-5" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

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

// Heat color for a site by how recently it was used (palette-tuned;
// recency meaning unchanged: red = rest, amber = recent, emerald = rested)
function recencyFill(lastTs) {
  const days = (Date.now() - lastTs) / 86400000;
  if (days < 7) return "#D85C54"; // red — let it rest
  if (days < 14) return "#D69A33"; // amber — recently used
  return "#1FB089"; // emerald — rested
}

// ------------------------------------------------------------
// The body outline, shared by the picker diagram and the
// rotation map (extracted so it exists exactly once).
// ------------------------------------------------------------
function BodySilhouette({ view }) {
  return (
    <g>
      <g fill="#1F2926" stroke="#586461" strokeWidth="1.5">
        <ellipse cx="200" cy="56" rx="29" ry="33" />
        <path d="M186 88 Q186 100 183 106 L217 106 Q214 100 214 88 Z" />
        <path d="M150 116 Q200 100 250 116 Q255 160 244 205 Q236 250 234 275 Q238 305 232 322 L168 322 Q162 305 166 275 Q164 250 156 205 Q145 160 150 116 Z" />
        <path d="M150 118 Q128 126 124 170 L120 250 Q119 264 128 262 Q137 261 139 250 L147 185 Q149 145 154 124 Z" />
        <path d="M250 118 Q272 126 276 170 L280 250 Q281 264 272 262 Q263 261 261 250 L253 185 Q251 145 246 124 Z" />
        <path d="M168 324 L199 324 Q201 400 194 474 Q193 482 185 481 L176 480 Q167 405 169 360 Q169 335 168 324 Z" />
        <path d="M232 324 L201 324 Q199 400 206 474 Q207 482 215 481 L224 480 Q233 405 231 360 Q231 335 232 324 Z" />
      </g>
      {view === "front" ? (
        <g fill="none" stroke="#2A3431" strokeWidth="1.2">
          <path d="M176 130 Q200 138 224 130" />
          <path d="M200 140 L200 205" />
          <path d="M186 178 L214 178" strokeWidth="1" />
          <path d="M187 195 L213 195" strokeWidth="1" />
        </g>
      ) : (
        <g fill="none" stroke="#2A3431" strokeWidth="1.2">
          <path d="M200 118 L200 320" />
          <path d="M182 150 Q190 162 185 176" strokeWidth="1" />
          <path d="M218 150 Q210 162 215 176" strokeWidth="1" />
          <path d="M200 324 L200 370" />
        </g>
      )}
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
            view === "front" ? "bg-emerald-500 text-emerald-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Front View
        </button>
        <button
          onClick={() => setView("back")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "back" ? "bg-emerald-500 text-emerald-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
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
                fill={selectedPoint === point.label ? "#1FB089" : "#1F2926"}
                stroke={selectedPoint === point.label ? "#1FB089" : "#586461"}
                strokeWidth="2"
                opacity="0.85"
              />
              <circle
                cx={point.cx}
                cy={point.cy}
                r="4"
                fill={selectedPoint === point.label ? "white" : "#788481"}
              />
            </g>
          ))}
        </svg>
      </div>

      {selectedPoint && (
        <p className="text-emerald-400 text-sm mt-2 flex items-center justify-center gap-1.5">
          <Icon name="pin" className="w-3.5 h-3.5" /> Selected: {selectedPoint}
        </p>
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
        <div
          data-tour="suggestion"
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-emerald-400">
            <Icon name="bulb" className="w-3.5 h-3.5 inline-block align-[-2px] mr-1" />
            Suggested next:{" "}
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
            className="text-sm bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-4 py-1.5 rounded-lg"
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
            view === "front" ? "bg-emerald-500 text-emerald-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Front View
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "back" ? "bg-emerald-500 text-emerald-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
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
                  fill={stat ? recencyFill(stat.lastTs) : "#1F2926"}
                  stroke={isSelected ? "#ffffff" : stat ? recencyFill(stat.lastTs) : "#586461"}
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
                    fill="#0A0E0D"
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
        className="mt-4 text-sm text-slate-400 hover:text-white inline-flex items-center gap-1.5"
      >
        <Icon name={showWhy ? "chevronDown" : "chevronRight"} className="w-3.5 h-3.5" />
        Why rotate sites?
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
  const [isPremium, setIsPremium] = useState(false);
  const [sessionDebug, setSessionDebug] = useState("");

  // rotation map data
  const [siteStats, setSiteStats] = useState({});
  const [unmappedCount, setUnmappedCount] = useState(0);

  // inventory (for surfacing in-stock peptides first in the dropdown)
  const [inventory, setInventory] = useState([]);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_end_date")
        .eq("id", session.user.id)
        .maybeSingle();
      setIsPremium(hasPremiumAccess(profile));

      await Promise.all([
        fetchRecentLogs(session.user.id),
        fetchSiteHistory(session.user.id),
        fetchInventory(session.user.id),
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

  // What's in the user's inventory (in-stock peptides surface first)
  async function fetchInventory(userId) {
    const { data } = await supabase
      .from("inventory")
      .select("peptide_name, item_type, quantity_remaining")
      .eq("user_id", userId);
    setInventory(data || []);
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
          ? `Dose logged! ${deduction.message}`
          : "Dose logged successfully!"
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
        fetchInventory(session.user.id),
      ]);
      setTimeout(() => setSuccess(""), 6000);
    }

    setSaving(false);
  }

  // Peptides currently in stock (item_type peptide, something left) —
  // these surface in their own group at the top of the dropdown.
  const inStockNames = new Set();
  for (const item of inventory) {
    if (
      (item.item_type || "peptide") === "peptide" &&
      parseFloat(item.quantity_remaining) > 0
    ) {
      inStockNames.add(item.peptide_name.trim().toLowerCase());
    }
  }
  const inStockPeptides = PEPTIDES.filter((p) =>
    inStockNames.has(p.full.trim().toLowerCase())
  );
  const otherPeptides = PEPTIDES.filter(
    (p) => !inStockNames.has(p.full.trim().toLowerCase())
  );

  const selectedGroupData = INJECTION_SITE_GROUPS.find((g) => g.group === injectionGroup);

  // suggested values for the draw calculator — both stay fully editable
  const vialPreset =
    peptideName && VIAL_SIZES[peptideName] ? VIAL_SIZES[peptideName] : null;
  const suggestedVialMg =
    vialPreset && vialPreset.unit === "mg" && vialPreset.sizes.length > 0
      ? vialPreset.sizes[0]
      : undefined;
  const suggestedDoseMg = unit === "mg" && doseAmount ? doseAmount : undefined;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8">
      {/* ---------- guided tour of this page ---------- */}
      <PageTour
        tourKey="log"
        steps={[
          {
            target: '[data-tour="peptide"]',
            title: "Anything you're stocked on comes first",
            body: "Peptides you actually have in inventory are grouped at the top of this list, so you're not scrolling past 90 others to find yours.",
          },
          {
            target: '[data-tour="dose"]',
            title: "Your dose",
            body: "Enter the amount and unit. When you save, this exact amount is subtracted from your open vial in inventory — no separate bookkeeping.",
          },
          {
            target: '[data-tour="site-mode"]',
            title: "Two ways to pick a site",
            body: "Choose from the dropdown, or tap the spot straight on a body diagram. Both record the same thing, so use whichever is faster for you.",
          },
          {
            target: '[data-tour="suggestion"]',
            title: "Where to inject next",
            body: "Suggests the site you've rested longest — only from areas you already use. Hit \"Use this site\" and it fills the form for you.",
          },
          {
            target: '[data-tour="rotation"]',
            title: "Your last 90 days, on the body",
            body: "Red means you used that spot in the last week — let it rest. Amber is 7–14 days, green is well rested. The numbers are how many doses landed there.",
          },
          {
            target: '[data-tour="draw-calc"]',
            title: "How much to draw",
            body: "Your dose carries down from the form and the vial size is a best guess — add how much water you mixed with and it tells you the units to pull on a U-100 syringe. Every box stays editable.",
          },
          {
            target: '[data-tour="recent"]',
            title: "Your recent doses",
            body: "The last ten doses, so you can double-check what you took and when before logging another.",
          },
        ]}
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Log a Dose</h1>
          <TourHelpButton />
        </div>
        <p className="text-slate-600 text-xs mb-6">{sessionDebug}</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <Icon name="check" className="w-4 h-4 shrink-0" />
            <span>{success}</span>
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

            <div data-tour="peptide" className="mb-4">
              <label className="text-slate-400 text-sm mb-1 block">Peptide</label>
              <select
                value={peptideName}
                onChange={(e) => setPeptideName(e.target.value)}
                className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a peptide...</option>
                {inStockPeptides.length > 0
                  ? [
                      <optgroup key="instock" label="In your inventory">
                        {inStockPeptides.map((p) => (
                          <option key={p.full} value={p.full}>{p.short} — {p.full}</option>
                        ))}
                      </optgroup>,
                      <optgroup key="all" label="All peptides">
                        {otherPeptides.map((p) => (
                          <option key={p.full} value={p.full}>{p.short} — {p.full}</option>
                        ))}
                      </optgroup>,
                    ]
                  : PEPTIDES.map((p) => (
                      <option key={p.full} value={p.full}>{p.short} — {p.full}</option>
                    ))}
              </select>
            </div>

            <div data-tour="dose" className="flex gap-3 mb-4">
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
              <div data-tour="site-mode" className="flex gap-2 mb-3">
                <button
                  onClick={() => setSiteMode("dropdown")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                    siteMode === "dropdown" ? "bg-emerald-500 text-emerald-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Icon name="list" className="w-4 h-4" /> Dropdown
                </button>
                <button
                  onClick={() => setSiteMode("diagram")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                    siteMode === "diagram" ? "bg-emerald-500 text-emerald-950" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  <Icon name="body" className="w-4 h-4" /> Body Diagram
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
              ) :  isPremium ? (
                <BodyDiagram selectedPoint={diagramSite} onSelectPoint={setDiagramSite} />
              ) : (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-5 text-center">
                  <p className="text-sm text-white font-medium">The body-diagram picker is a premium feature</p>
                  <p className="text-sm text-slate-400 mt-1">Upgrade to tap a body map to log your site — or switch to the dropdown, which is always free.</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <a href="/pricing" className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 text-sm font-semibold px-5 py-2 rounded-lg">See plans</a>
                    <button type="button" onClick={() => setSiteMode("dropdown")} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-5 py-2 rounded-lg border border-slate-700">Use the dropdown</button>
                  </div>
                </div>
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
              className="w-full bg-emerald-500 text-emerald-950 py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Log Dose"}
            </button>
          </div>

          {/* ============ RIGHT: stack + rotation map + recent doses ============ */}
          <div className="space-y-6">
            <StackSummary />

            <div
              data-tour="rotation"
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
            >
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

            <div data-tour="draw-calc">
              <DrawCalculator
                suggestedVialMg={suggestedVialMg}
                suggestedDoseMg={suggestedDoseMg}
              />
            </div>

            <div
              data-tour="recent"
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
            >
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