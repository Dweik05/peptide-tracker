"use client";

// ============================================================
// DRAW CALCULATOR  —  goes in:  app/components/DrawCalculator.js
//
// The reconstitution draw calculator, extracted from the planner so it can be
// reused on both the Planner and the Log page. Same math, same look.
//
// Optional props pre-fill boxes from whatever the page already knows — but
// every box stays fully editable, so you can always just type it yourself:
//   suggestedVialMg  — pre-fills "Vial amount" (a best guess; override freely)
//   suggestedDoseMg  — pre-fills "Your dose" (carried from the dose above)
// Water added is always manual (the app can't know how much you used).
//
// When a suggestion changes (you pick a different peptide / change the dose),
// that box re-fills. Leave the props off entirely (e.g. on the planner in
// phase/weekly mode) and it behaves exactly like the old manual calculator.
// ============================================================

import { useState, useEffect } from "react";

function trim(value) {
  return parseFloat(parseFloat(value).toFixed(3)).toString();
}

const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function DrawCalculator({ suggestedVialMg, suggestedDoseMg }) {
  const [vial, setVial] = useState(
    suggestedVialMg !== undefined && suggestedVialMg !== null && suggestedVialMg !== ""
      ? String(suggestedVialMg)
      : ""
  );
  const [water, setWater] = useState("");
  const [dose, setDose] = useState(
    suggestedDoseMg !== undefined && suggestedDoseMg !== null && suggestedDoseMg !== ""
      ? String(suggestedDoseMg)
      : ""
  );

  // Re-fill the vial box when the suggestion changes (still fully editable).
  useEffect(() => {
    if (
      suggestedVialMg !== undefined &&
      suggestedVialMg !== null &&
      suggestedVialMg !== ""
    ) {
      setVial(String(suggestedVialMg));
    }
  }, [suggestedVialMg]);

  // Re-fill the dose box when the suggestion changes (still fully editable).
  useEffect(() => {
    if (
      suggestedDoseMg !== undefined &&
      suggestedDoseMg !== null &&
      suggestedDoseMg !== ""
    ) {
      setDose(String(suggestedDoseMg));
    }
  }, [suggestedDoseMg]);

  const dv = parseFloat(vial);
  const dw = parseFloat(water);
  const dd = parseFloat(dose);
  let draw = null;
  if (!isNaN(dv) && dv > 0 && !isNaN(dw) && dw > 0 && !isNaN(dd) && dd > 0) {
    const concentration = dv / dw;
    const ml = dd / concentration;
    const units = ml * 100;
    draw = { concentration, ml, units, overdraw: dd > dv };
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">
        Reconstitution draw calculator
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        After mixing, work out exactly how much to draw for your dose. Amounts in
        mg — every box is editable, so you can enter your own numbers.
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
            value={vial}
            onChange={(e) => setVial(e.target.value)}
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
            value={water}
            onChange={(e) => setWater(e.target.value)}
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
            value={dose}
            onChange={(e) => setDose(e.target.value)}
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
              Your dose is larger than the whole vial — double-check the numbers.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 mt-3">
        Math only — this converts a dose you entered into a volume. It is not a
        recommendation about how much to take.
      </p>
    </div>
  );
}