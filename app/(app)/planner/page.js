"use client";

// ============================================================
// PROTOCOL PLANNER  —  goes in:  app/(app)/planner/page.js
// (NEW page — create the folder "planner" inside app/(app)/
//  and a "page.js" inside it.)
//
// Day 19: the beginner's planning calculator.
//
//   Enter a protocol (peptide, dose, how often, for how long)
//   and the app does the MATH:
//     - total number of doses and total amount needed
//     - how many vials to buy (at a catalogue vial size you pick)
//     - how long your CURRENT inventory will last
//     - an optional cost estimate
//     - a reconstitution "draw" calculator: vial + water →
//       concentration → exactly how much to draw for your dose
//       (in mL and insulin units)
//     - a preview of your upcoming dose dates
//
// ⚠️ FRAMING (lawyer checklist item #3): this planner does
// arithmetic on a protocol YOU enter. It never recommends a
// peptide, a dose, or a schedule — those are between you and
// your provider. Nothing here is medical advice.
//
// Day 20 will let you SAVE a protocol as a schedule that the
// calendar + email reminders run on. This page is calculator-
// only — it saves nothing, so it's completely self-contained.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { PEPTIDES, VIAL_SIZES, convertAmount } from "../../lib/peptides";

// ---------------- helpers ----------------

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromString(value) {
  // parse "YYYY-MM-DD" at local noon so it doesn't shift a day
  return new Date(`${value}T12:00:00`);
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function trim(value) {
  return parseFloat(parseFloat(value).toFixed(3)).toString();
}

// Frequency → how the doses fall. Interval-based ones step by a
// fixed number of days; pattern-based ones land on weekdays.
function intervalDays(freq) {
  if (freq === "daily") return 1;
  if (freq === "eod") return 2;
  if (freq === "weekly") return 7;
  return null;
}

// weekday set (0=Sun ... 6=Sat) for pattern frequencies
function weekdayPattern(freq, customN) {
  if (freq === "2x") return new Set([1, 4]); // Mon, Thu
  if (freq === "3x") return new Set([1, 3, 5]); // Mon, Wed, Fri
  if (freq === "5x") return new Set([1, 2, 3, 4, 5]); // Mon–Fri
  if (freq === "custom") {
    const n = Math.max(1, Math.min(7, Math.round(customN) || 1));
    const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
    const set = new Set();
    for (let i = 0; i < n; i++) set.add(order[Math.floor((i * 7) / n)]);
    return set;
  }
  return null;
}

// All dose dates from start over `weeks`, by frequency.
function generateDoseDates(start, weeks, freq, customN) {
  const out = [];
  const end = new Date(start);
  end.setDate(end.getDate() + Math.round(weeks * 7));

  const interval = intervalDays(freq);
  const cursor = new Date(start);

  if (interval) {
    while (cursor < end) {
      out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + interval);
    }
  } else {
    const pattern = weekdayPattern(freq, customN);
    while (cursor < end) {
      if (pattern.has(cursor.getDay())) out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return out;
}

const FREQUENCIES = [
  { key: "daily", label: "Every day" },
  { key: "eod", label: "Every other day" },
  { key: "5x", label: "5× / week (weekdays)" },
  { key: "3x", label: "3× / week" },
  { key: "2x", label: "2× / week" },
  { key: "weekly", label: "Once a week" },
  { key: "custom", label: "Custom / week" },
];

const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function PlannerPage() {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);

  // protocol inputs
  const [peptide, setPeptide] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("mg");
  const [freq, setFreq] = useState("weekly");
  const [customN, setCustomN] = useState("3");
  const [weeks, setWeeks] = useState("12");
  const [startDate, setStartDate] = useState(getTodayString());

  // vial size + cost for the "how many to buy" math
  const [vialSize, setVialSize] = useState("");
  const [vialUnit, setVialUnit] = useState("mg");
  const [costPerVial, setCostPerVial] = useState("");

  // draw calculator (independent little tool)
  const [drawVialMg, setDrawVialMg] = useState("");
  const [drawWaterMl, setDrawWaterMl] = useState("");
  const [drawDoseMg, setDrawDoseMg] = useState("");

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
      const { data } = await supabase
        .from("inventory")
        .select("peptide_name, quantity_remaining, unit, cost")
        .eq("user_id", session.user.id);
      setInventory(data || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the peptide changes, preset vial size + unit from the
  // catalogue (and seed the draw calculator's vial amount).
  function handlePeptideChange(name) {
    setPeptide(name);
    const preset = VIAL_SIZES[name];
    if (preset && preset.sizes.length > 0) {
      setVialSize(String(preset.sizes[0]));
      setVialUnit(preset.unit);
      if (preset.unit === "mg") setDrawVialMg(String(preset.sizes[0]));
    } else {
      setVialSize("");
    }
  }

  // ---------------- the math ----------------
  const doseNumber = parseFloat(dose);
  const weeksNumber = parseFloat(weeks);
  const validProtocol =
    peptide &&
    !isNaN(doseNumber) &&
    doseNumber > 0 &&
    !isNaN(weeksNumber) &&
    weeksNumber > 0;

  let plan = null;
  if (validProtocol) {
    const dates = generateDoseDates(
      dateFromString(startDate),
      weeksNumber,
      freq,
      parseFloat(customN)
    );
    const totalDoses = dates.length;
    const totalAmount = totalDoses * doseNumber; // in doseUnit
    const dosesPerWeek = totalDoses / weeksNumber;

    // vials needed at the chosen vial size
    const vialSizeNumber = parseFloat(vialSize);
    let vialsNeeded = null;
    let vialUnitMismatch = false;
    if (!isNaN(vialSizeNumber) && vialSizeNumber > 0) {
      const totalInVialUnit = convertAmount(totalAmount, doseUnit, vialUnit);
      if (totalInVialUnit === null) {
        vialUnitMismatch = true;
      } else {
        vialsNeeded = Math.ceil(totalInVialUnit / vialSizeNumber);
      }
    }

    // current inventory coverage for this peptide
    let remainingInDoseUnit = 0;
    let inventoryMismatch = false;
    let hasInventory = false;
    for (const item of inventory) {
      if (item.peptide_name.trim().toLowerCase() !== peptide.trim().toLowerCase())
        continue;
      hasInventory = true;
      const converted = convertAmount(
        parseFloat(item.quantity_remaining),
        item.unit,
        doseUnit
      );
      if (converted === null) {
        inventoryMismatch = true;
        continue;
      }
      remainingInDoseUnit += converted;
    }
    const weeklyUse = dosesPerWeek * doseNumber;
    const daysOfSupply =
      hasInventory && weeklyUse > 0
        ? Math.floor((remainingInDoseUnit / weeklyUse) * 7)
        : null;

    // cost
    const costNumber = parseFloat(costPerVial);
    const estCost =
      vialsNeeded !== null && !isNaN(costNumber) && costNumber >= 0
        ? vialsNeeded * costNumber
        : null;

    plan = {
      dates,
      totalDoses,
      totalAmount,
      dosesPerWeek,
      vialsNeeded,
      vialUnitMismatch,
      vialSizeNumber,
      daysOfSupply,
      hasInventory,
      inventoryMismatch,
      remainingInDoseUnit,
      estCost,
    };
  }

  // ---------------- draw calculator ----------------
  const dv = parseFloat(drawVialMg);
  const dw = parseFloat(drawWaterMl);
  const dd = parseFloat(drawDoseMg);
  let draw = null;
  if (!isNaN(dv) && dv > 0 && !isNaN(dw) && dw > 0 && !isNaN(dd) && dd > 0) {
    const concentration = dv / dw; // mg per mL
    const ml = dd / concentration;
    const units = ml * 100; // U-100 insulin syringe: 1 mL = 100 units
    draw = { concentration, ml, units, overdraw: dd > dv };
  }

  const presetSizes = peptide && VIAL_SIZES[peptide] ? VIAL_SIZES[peptide] : null;

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading the planner...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Protocol Planner</h1>
        <p className="text-slate-400 mt-1">
          Enter a protocol and the app works out the supply, cost, and timing.
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-sm">
        This planner does the math on a protocol <em>you</em> enter. It doesn't
        recommend a peptide, a dose, or a schedule — those are between you and
        your healthcare provider. Not medical advice.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT: protocol form ---------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Your protocol</h2>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Peptide</label>
            <select
              value={peptide}
              onChange={(e) => handlePeptideChange(e.target.value)}
              className={inputClasses}
            >
              <option value="">Select a peptide...</option>
              {PEPTIDES.filter((p) => p.full !== "Other").map((p) => (
                <option key={p.full} value={p.full}>
                  {p.short} — {p.full}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Dose per injection
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.0"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Unit</label>
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className={inputClasses}
              >
                {["mg", "mcg", "IU"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              How often
            </label>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              className={inputClasses}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {freq === "custom" && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Times per week
              </label>
              <input
                type="number"
                min="1"
                max="7"
                step="1"
                value={customN}
                onChange={(e) => setCustomN(e.target.value)}
                className={inputClasses}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Plan length (weeks)
              </label>
              <input
                type="number"
                min="1"
                max="104"
                step="1"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>
          </div>

          {/* vial size + cost for the buy math */}
          <div className="pt-2 border-t border-slate-800">
            <p className="text-sm text-slate-400 mb-2">
              Vial size to plan around
            </p>
            {presetSizes && (
              <div className="flex flex-wrap gap-2 mb-3">
                {presetSizes.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setVialSize(String(size));
                      setVialUnit(presetSizes.unit);
                    }}
                    className={
                      String(size) === vialSize && presetSizes.unit === vialUnit
                        ? "px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
                        : "px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
                    }
                  >
                    {size} {presetSizes.unit}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Vial size
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 10"
                    value={vialSize}
                    onChange={(e) => setVialSize(e.target.value)}
                    className={inputClasses}
                  />
                  <select
                    value={vialUnit}
                    onChange={(e) => setVialUnit(e.target.value)}
                    className="bg-slate-800 text-white px-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    {["mg", "mcg", "IU"].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Cost / vial{" "}
                  <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$CAD"
                  value={costPerVial}
                  onChange={(e) => setCostPerVial(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- RIGHT: results ---------- */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              The plan
            </h2>

            {!validProtocol ? (
              <p className="text-slate-500">
                Fill in a peptide, dose, frequency, and length and your plan
                appears here.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    label="Total doses"
                    value={`${plan.totalDoses}`}
                    sub={`~${trim(plan.dosesPerWeek)} / week`}
                  />
                  <Stat
                    label="Total needed"
                    value={`${trim(plan.totalAmount)} ${doseUnit}`}
                    sub={`over ${trim(weeksNumber)} weeks`}
                  />
                  <Stat
                    label="Vials to buy"
                    value={
                      plan.vialUnitMismatch
                        ? "—"
                        : plan.vialsNeeded !== null
                        ? `${plan.vialsNeeded}`
                        : "—"
                    }
                    sub={
                      plan.vialUnitMismatch
                        ? `can't convert ${doseUnit} ↔ ${vialUnit}`
                        : plan.vialsNeeded !== null
                        ? `at ${trim(plan.vialSizeNumber)} ${vialUnit}/vial`
                        : "set a vial size"
                    }
                  />
                  <Stat
                    label="Est. cost"
                    value={
                      plan.estCost !== null
                        ? `$${plan.estCost.toFixed(2)}`
                        : "—"
                    }
                    sub={
                      plan.estCost !== null
                        ? `${plan.vialsNeeded} × $${parseFloat(
                            costPerVial
                          ).toFixed(2)}`
                        : "add cost/vial"
                    }
                  />
                </div>

                {/* inventory coverage */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  {!plan.hasInventory ? (
                    <p className="text-sm text-slate-400">
                      You're not tracking{" "}
                      <span className="text-white">{peptide}</span> in
                      inventory yet — add it there to see how long your current
                      supply lasts.
                    </p>
                  ) : plan.daysOfSupply !== null ? (
                    <p className="text-sm text-slate-300">
                      Your current inventory (
                      {trim(plan.remainingInDoseUnit)} {doseUnit}) covers about{" "}
                      <span className="text-white font-semibold">
                        {plan.daysOfSupply} days
                      </span>{" "}
                      (~{trim(plan.daysOfSupply / 7)} weeks) at this protocol.
                      {plan.inventoryMismatch &&
                        " (Some vials in another unit were skipped.)"}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Couldn't compute coverage from your current inventory
                      units.
                    </p>
                  )}
                </div>

                {/* schedule preview */}
                <div>
                  <p className="text-sm text-slate-400 mb-2">
                    Upcoming doses{" "}
                    <span className="text-slate-500">
                      (first {Math.min(14, plan.dates.length)})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plan.dates.slice(0, 14).map((date, index) => (
                      <span
                        key={index}
                        className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-300"
                      >
                        {formatDate(date)}
                      </span>
                    ))}
                    {plan.dates.length > 14 && (
                      <span className="text-xs text-slate-500 px-2 py-1">
                        +{plan.dates.length - 14} more
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Saving this as a schedule with reminders is coming in the
                    next update.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* draw calculator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Reconstitution draw calculator
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              After mixing, work out exactly how much to draw for your dose.
              Amounts in mg.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Vial amount (mg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="10"
                  value={drawVialMg}
                  onChange={(e) => setDrawVialMg(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Water added (mL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="2"
                  value={drawWaterMl}
                  onChange={(e) => setDrawWaterMl(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Your dose (mg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.5"
                  value={drawDoseMg}
                  onChange={(e) => setDrawDoseMg(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>

            {draw && (
              <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-300">
                  Concentration:{" "}
                  <span className="text-white font-semibold">
                    {trim(draw.concentration)} mg/mL
                  </span>
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  Draw{" "}
                  <span className="text-emerald-400 font-semibold">
                    {trim(draw.ml)} mL
                  </span>{" "}
                  ={" "}
                  <span className="text-emerald-400 font-semibold">
                    {Math.round(draw.units)} units
                  </span>{" "}
                  on a U-100 insulin syringe.
                </p>
                {draw.overdraw && (
                  <p className="text-xs text-amber-400 mt-2">
                    Your dose is larger than the whole vial — double-check the
                    numbers.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-3">
              Math only — this converts a dose you entered into a volume. It is
              not a recommendation about how much to take.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}