"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const PEPTIDES = [
  { short: "ACE", full: "ACE-031" },
  { short: "AOD", full: "AOD9604" },
  { short: "AHK", full: "AHK-CU" },
  { short: "5AM", full: "5-Amino-1MQ" },
  { short: "BPC", full: "BPC-157" },
  { short: "BB", full: "BPC-157 + TB-500 Blend" },
  { short: "BBG", full: "BPC-157 + GHK-CU + TB-500 Blend" },
  { short: "CJC-nDAC", full: "CJC-1295 without DAC" },
  { short: "CJC-DAC", full: "CJC-1295 with DAC" },
  { short: "CGL", full: "Cagrilintide" },
  { short: "CS", full: "Cagrilintide + Semaglutide Blend" },
  { short: "CBL", full: "Cerebrolysin" },
  { short: "DSIP", full: "DSIP" },
  { short: "ET", full: "Epithalon" },
  { short: "NET", full: "N-Acetyl Epitalon Amidate" },
  { short: "F4", full: "FOXO4" },
  { short: "GHK", full: "GHK-CU" },
  { short: "GTT", full: "Glutathione" },
  { short: "GND", full: "Gonadorelin Acetate" },
  { short: "HCG", full: "HCG" },
  { short: "HX", full: "Hexarelin Acetate" },
  { short: "FRG", full: "HGH Fragment 176-191" },
  { short: "HMG", full: "HMG" },
  { short: "HU", full: "Humanin" },
  { short: "HA", full: "Hyaluronic Acid" },
  { short: "IGF", full: "IGF-1 LR3" },
  { short: "IPA", full: "Ipamorelin" },
  { short: "KPV", full: "KPV" },
  { short: "KP", full: "KisspePtin-10" },
  { short: "LB", full: "Lemon Bottle" },
  { short: "LC", full: "L-Carnitine" },
  { short: "LR", full: "Liraglutide" },
  { short: "MX", full: "Matrixyl" },
  { short: "MT1", full: "Melanotan 1" },
  { short: "MT2", full: "Melanotan 2" },
  { short: "MT", full: "Melatonin" },
  { short: "MGF", full: "MGF" },
  { short: "MOTS", full: "MOTS-c" },
  { short: "NAD", full: "NAD+" },
  { short: "NSK", full: "NA Selank Amidate" },
  { short: "OT", full: "Oxytocin Acetate" },
  { short: "P21", full: "P21" },
  { short: "PEG", full: "PEG MGF" },
  { short: "PIN", full: "Pinealon" },
  { short: "PNC", full: "PNC-27" },
  { short: "PT141", full: "PT-141 (Bremelanotide)" },
  { short: "RC", full: "Retatrutide + Cagrilintide Blend" },
  { short: "RT", full: "Retatrutide" },
  { short: "SK", full: "Selank" },
  { short: "SM", full: "Semaglutide" },
  { short: "SRM", full: "Sermorelin" },
  { short: "XS", full: "Semax + Selank Blend" },
  { short: "2S", full: "Semax" },
  { short: "SS", full: "SS-31" },
  { short: "SUR", full: "Survodutide" },
  { short: "BT", full: "TB-500" },
  { short: "TER", full: "Teriparatide" },
  { short: "TSM", full: "Tesamorelin" },
  { short: "TY", full: "Thymalin" },
  { short: "TA", full: "Thymosin Alpha-1" },
  { short: "VIP", full: "VIP" },
  { short: "OTHER", full: "Other" },
].sort((a, b) => a.full.localeCompare(b.full));

const INJECTION_SITE_GROUPS = [
  {
    group: "Abdomen",
    sites: ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Navel Left", "Navel Right"],
  },
  {
    group: "Thigh",
    sites: ["Upper Left", "Upper Right", "Middle Left", "Middle Right", "Outer Left", "Outer Right"],
  },
  {
    group: "Glute",
    sites: ["Upper Left", "Upper Right", "Lower Left", "Lower Right"],
  },
  {
    group: "Arm",
    sites: ["Upper Left (Deltoid)", "Upper Right (Deltoid)", "Lower Left", "Lower Right"],
  },
  {
    group: "Back",
    sites: ["Lower Left", "Lower Right", "Upper Left", "Upper Right"],
  },
  {
    group: "Chest",
    sites: ["Left Pectoral", "Right Pectoral"],
  },
  {
    group: "Other",
    sites: ["Specify below"],
  },
];

const UNITS = ["mg", "mcg", "IU", "ml"];

const BODY_POINTS = {
  front: [
    { id: "abd-upper-left", label: "Abdomen Upper Left", cx: 185, cy: 230 },
    { id: "abd-upper-right", label: "Abdomen Upper Right", cx: 215, cy: 230 },
    { id: "abd-lower-left", label: "Abdomen Lower Left", cx: 185, cy: 260 },
    { id: "abd-lower-right", label: "Abdomen Lower Right", cx: 215, cy: 260 },
    { id: "abd-navel-left", label: "Abdomen Navel Left", cx: 185, cy: 245 },
    { id: "abd-navel-right", label: "Abdomen Navel Right", cx: 215, cy: 245 },
    { id: "thigh-upper-left", label: "Thigh Upper Left", cx: 175, cy: 330 },
    { id: "thigh-upper-right", label: "Thigh Upper Right", cx: 225, cy: 330 },
    { id: "thigh-mid-left", label: "Thigh Middle Left", cx: 175, cy: 360 },
    { id: "thigh-mid-right", label: "Thigh Middle Right", cx: 225, cy: 360 },
    { id: "arm-upper-left", label: "Arm Upper Left (Deltoid)", cx: 145, cy: 185 },
    { id: "arm-upper-right", label: "Arm Upper Right (Deltoid)", cx: 255, cy: 185 },
    { id: "chest-left", label: "Chest Left Pectoral", cx: 180, cy: 185 },
    { id: "chest-right", label: "Chest Right Pectoral", cx: 220, cy: 185 },
  ],
  back: [
    { id: "glute-upper-left", label: "Glute Upper Left", cx: 185, cy: 265 },
    { id: "glute-upper-right", label: "Glute Upper Right", cx: 215, cy: 265 },
    { id: "glute-lower-left", label: "Glute Lower Left", cx: 185, cy: 290 },
    { id: "glute-lower-right", label: "Glute Lower Right", cx: 215, cy: 290 },
    { id: "back-lower-left", label: "Lower Back Left", cx: 185, cy: 245 },
    { id: "back-lower-right", label: "Lower Back Right", cx: 215, cy: 245 },
    { id: "back-upper-left", label: "Upper Back Left", cx: 180, cy: 175 },
    { id: "back-upper-right", label: "Upper Back Right", cx: 220, cy: 175 },
    { id: "thigh-outer-left", label: "Thigh Outer Left", cx: 170, cy: 340 },
    { id: "thigh-outer-right", label: "Thigh Outer Right", cx: 230, cy: 340 },
    { id: "arm-lower-left", label: "Arm Lower Left", cx: 145, cy: 220 },
    { id: "arm-lower-right", label: "Arm Lower Right", cx: 255, cy: 220 },
  ],
};

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
          {view === "front" ? (
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
          ) : (
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
          )}
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

export default function Log() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recentLogs, setRecentLogs] = useState([]);
  const [siteMode, setSiteMode] = useState("dropdown");
  const [sessionDebug, setSessionDebug] = useState("");

  const today = new Date().toISOString().slice(0, 16);
  const [peptideName, setPeptideName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [unit, setUnit] = useState("mg");
  const [injectionSite, setInjectionSite] = useState("");
  const [injectionGroup, setInjectionGroup] = useState("");
  const [customSite, setCustomSite] = useState("");
  const [diagramSite, setDiagramSite] = useState("");
  const [loggedAt, setLoggedAt] = useState(today);
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
      await fetchRecentLogs(session.user.id);
      setLoading(false);
    }
    initialize();
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
      setSuccess(true);
      setPeptideName("");
      setDoseAmount("");
      setInjectionSite("");
      setInjectionGroup("");
      setCustomSite("");
      setDiagramSite("");
      setNotes("");
      setLoggedAt(today);
      await fetchRecentLogs(session.user.id);
      setTimeout(() => setSuccess(false), 3000);
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Log a Dose</h1>
        <p className="text-slate-600 text-xs mb-6">{sessionDebug}</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-4 text-sm">
            ✅ Dose logged successfully!
          </div>
        )}

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-8">

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
    </main>
  );
}