"use client";

// ============================================================
// PROTOCOL PLANNER (v4 — reskinned)  —  goes in:  app/(app)/planner/page.js
//
// Same planner, restyled to the new design system: metric-style
// plan stats, cohesive line icons in place of emoji, and dark
// text on the emerald buttons. All logic (flat / by-phase /
// by-week titration, the math, drafts, the draw calculator) is
// unchanged — only the markup changed.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { PEPTIDES, VIAL_SIZES, convertAmount } from "../../lib/peptides";
import { doseOnDate } from "../../lib/schedule-helpers";

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
    close: <path d="M18 6 6 18M6 6l12 12" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M20 6 9 17l-5-5" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ---------------- helpers ----------------

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromString(value) {
  return new Date(`${value}T12:00:00`);
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function intervalDays(freq) {
  if (freq === "daily") return 1;
  if (freq === "eod") return 2;
  return null;
}

function defaultWeekdays(freq, customN, startDateString) {
  if (freq === "weekly") return [dateFromString(startDateString).getDay()];
  if (freq === "2x") return [1, 4];
  if (freq === "3x") return [1, 3, 5];
  if (freq === "5x") return [1, 2, 3, 4, 5];
  if (freq === "custom") {
    const n = Math.max(1, Math.min(7, Math.round(customN) || 1));
    const order = [1, 2, 3, 4, 5, 6, 0];
    const set = new Set();
    for (let i = 0; i < n; i++) set.add(order[Math.floor((i * 7) / n)]);
    return [...set].sort((a, b) => a - b);
  }
  return [];
}

function generateDoseDates(start, weeks, freq, pickedDays) {
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
    const pattern = new Set(pickedDays);
    if (pattern.size === 0) return out;
    while (cursor < end) {
      if (pattern.has(cursor.getDay())) out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return out;
}

function buildPhases(doseMode, phases, weeklyDoses) {
  if (doseMode === "phases") {
    return phases.map((p) => ({
      dose: parseFloat(p.dose),
      weeks: parseInt(p.weeks, 10),
    }));
  }
  if (doseMode === "weekly") {
    const out = [];
    for (const raw of weeklyDoses) {
      const dose = parseFloat(raw);
      const last = out[out.length - 1];
      if (last && last.dose === dose) last.weeks += 1;
      else out.push({ dose, weeks: 1 });
    }
    return out;
  }
  return null;
}

function effectiveWeeksOf(p) {
  return p.doseMode === "phases"
    ? p.phases.reduce((sum, ph) => sum + (parseInt(ph.weeks, 10) || 0), 0)
    : Math.round(parseFloat(p.weeks)) || 0;
}

// THE shared row builder — used by BOTH "Save schedule" and
// "Activate draft" so they can never produce different rows.
// `p` is a protocol object (see getCurrentProtocol / normalizeDef).
function buildReminderRow(p, userId) {
  const builtPhases = buildPhases(p.doseMode, p.phases, p.weeklyDoses);
  const effectiveWeeks = effectiveWeeksOf(p);

  const startObj = dateFromString(p.startDate);
  const endObj = new Date(startObj);
  endObj.setDate(endObj.getDate() + Math.round(effectiveWeeks * 7) - 1);

  const startingDose =
    p.doseMode === "flat"
      ? parseFloat(p.dose)
      : builtPhases && builtPhases.length > 0
      ? builtPhases[0].dose
      : 0;

  const interval = intervalDays(p.freq);
  return {
    user_id: userId,
    peptide_name: p.peptide,
    dose_amount: startingDose, // NOT-NULL column; for titration = starting dose
    dose_phases: p.doseMode === "flat" ? null : builtPhases,
    unit: p.doseUnit,
    interval_days: interval ? interval : null,
    days_of_week: interval ? null : [...p.pickedDays].sort((a, b) => a - b),
    start_date: p.startDate,
    end_date: toDateString(endObj),
    duration_weeks: effectiveWeeks,
    email_reminders: p.emailReminders,
    active: true,
  };
}

// Fill in defaults so an older/partial draft still loads safely.
function normalizeDef(d) {
  return {
    peptide: d.peptide ?? "",
    doseUnit: d.doseUnit ?? "mg",
    freq: d.freq ?? "weekly",
    customN: d.customN ?? "3",
    pickedDays: d.pickedDays ?? [],
    doseMode: d.doseMode ?? "flat",
    dose: d.dose ?? "",
    phases: d.phases ?? [{ dose: "", weeks: "4" }],
    weeklyDoses: d.weeklyDoses ?? [],
    weeks: d.weeks ?? "12",
    startDate: d.startDate ?? getTodayString(),
    vialSize: d.vialSize ?? "",
    vialUnit: d.vialUnit ?? "mg",
    costPerVial: d.costPerVial ?? "",
    emailReminders: d.emailReminders ?? false,
  };
}

// One-line summary for a draft card.
function summarizeDraft(rawDef) {
  const def = normalizeDef(rawDef);
  const freqLabel =
    (FREQUENCIES.find((f) => f.key === def.freq) || {}).label || def.freq;

  let doseStr;
  if (def.doseMode === "flat") {
    doseStr = `${def.dose}${def.doseUnit}`;
  } else {
    const ph = buildPhases(def.doseMode, def.phases, def.weeklyDoses) || [];
    if (ph.length > 0) {
      const first = ph[0].dose;
      const last = ph[ph.length - 1].dose;
      doseStr =
        first === last
          ? `${first}${def.doseUnit}`
          : `${first}→${last}${def.doseUnit} titrated`;
    } else {
      doseStr = "—";
    }
  }
  return { doseStr, freqLabel, weeks: effectiveWeeksOf(def) };
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

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const DOSE_MODES = [
  { key: "flat", label: "Flat" },
  { key: "phases", label: "By phase" },
  { key: "weekly", label: "By week" },
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
  const [doseUnit, setDoseUnit] = useState("mg");
  const [freq, setFreq] = useState("weekly");
  const [customN, setCustomN] = useState("3");
  const [weeks, setWeeks] = useState("12");
  const [startDate, setStartDate] = useState(getTodayString());
  const [pickedDays, setPickedDays] = useState([]);

  // dosing mode + per-mode inputs
  const [doseMode, setDoseMode] = useState("flat");
  const [dose, setDose] = useState("");
  const [phases, setPhases] = useState([{ dose: "", weeks: "4" }]);
  const [weeklyDoses, setWeeklyDoses] = useState([]);

  // vial size + cost
  const [vialSize, setVialSize] = useState("");
  const [vialUnit, setVialUnit] = useState("mg");
  const [costPerVial, setCostPerVial] = useState("");

  // saving the schedule
  const [emailReminders, setEmailReminders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // drafts
  const [drafts, setDrafts] = useState([]);
  const [draftName, setDraftName] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftActionMsg, setDraftActionMsg] = useState("");
  const [draftActionError, setDraftActionError] = useState("");
  const [activatingId, setActivatingId] = useState(null);
  // suppresses the weekday-seeding effects while a draft loads,
  // so a draft's custom day selection isn't overwritten
  const isLoadingDraft = useRef(false);

  // draw calculator
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

      const [invRes, draftRes] = await Promise.all([
        supabase
          .from("inventory")
          .select("peptide_name, quantity_remaining, unit, cost")
          .eq("user_id", session.user.id),
        supabase
          .from("protocol_drafts")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
      ]);
      setInventory(invRes.data || []);
      setDrafts(draftRes.data || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // seed weekday picker from frequency (suspended during a draft load)
  useEffect(() => {
    if (isLoadingDraft.current) return;
    if (intervalDays(freq)) {
      setPickedDays([]);
      return;
    }
    setPickedDays(defaultWeekdays(freq, parseFloat(customN), startDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freq, customN]);

  useEffect(() => {
    if (isLoadingDraft.current) return;
    if (freq === "weekly") {
      setPickedDays([dateFromString(startDate).getDay()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  // keep per-week dose boxes in sync with plan length
  useEffect(() => {
    if (doseMode !== "weekly") return;
    const n = Math.max(0, Math.min(104, Math.round(parseFloat(weeks)) || 0));
    setWeeklyDoses((current) => {
      const next = current.slice(0, n);
      while (next.length < n) {
        next.push(next.length > 0 ? next[next.length - 1] : "");
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, doseMode]);

  // any edit clears the "Saved ✓" message
  useEffect(() => {
    setJustSaved(false);
    setSaveError("");
  }, [
    peptide,
    doseUnit,
    freq,
    customN,
    weeks,
    startDate,
    pickedDays,
    doseMode,
    dose,
    phases,
    weeklyDoses,
    emailReminders,
  ]);

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

  function toggleDay(value) {
    setPickedDays((current) =>
      current.includes(value)
        ? current.filter((d) => d !== value)
        : [...current, value].sort((a, b) => a - b)
    );
  }

  function updatePhase(index, field, value) {
    setPhases((current) =>
      current.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }
  function addPhase() {
    setPhases((current) => [...current, { dose: "", weeks: "4" }]);
  }
  function removePhase(index) {
    setPhases((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current
    );
  }
  function updateWeek(index, value) {
    setWeeklyDoses((current) =>
      current.map((d, i) => (i === index ? value : d))
    );
  }

  // the current form as a protocol object (for save + draft)
  function getCurrentProtocol() {
    return {
      peptide,
      doseUnit,
      freq,
      customN,
      pickedDays,
      doseMode,
      dose,
      phases,
      weeklyDoses,
      weeks,
      startDate,
      vialSize,
      vialUnit,
      costPerVial,
      emailReminders,
    };
  }

  // ---------------- validity ----------------
  const weeksNumber = parseFloat(weeks);
  const usesWeekdays = intervalDays(freq) === null;

  const flatValid =
    doseMode === "flat" &&
    !isNaN(parseFloat(dose)) &&
    parseFloat(dose) > 0 &&
    weeksNumber > 0;

  const phasesValid =
    doseMode === "phases" &&
    phases.length >= 1 &&
    phases.every(
      (p) =>
        parseFloat(p.dose) > 0 &&
        Number.isInteger(parseInt(p.weeks, 10)) &&
        parseInt(p.weeks, 10) >= 1
    );

  const weeklyValid =
    doseMode === "weekly" &&
    weeksNumber > 0 &&
    weeklyDoses.length === Math.round(weeksNumber) &&
    weeklyDoses.length > 0 &&
    weeklyDoses.every((d) => parseFloat(d) > 0);

  const doseValid = flatValid || phasesValid || weeklyValid;
  const validProtocol =
    peptide && doseValid && (!usesWeekdays || pickedDays.length > 0);

  const effectiveWeeks =
    doseMode === "phases"
      ? phases.reduce((sum, p) => sum + (parseInt(p.weeks, 10) || 0), 0)
      : Math.round(weeksNumber) || 0;

  // ---------------- the math ----------------
  let plan = null;
  if (validProtocol) {
    const builtPhases = buildPhases(doseMode, phases, weeklyDoses);
    const previewSchedule = {
      start_date: startDate,
      dose_amount: doseMode === "flat" ? parseFloat(dose) : null,
      dose_phases: doseMode === "flat" ? null : builtPhases,
    };

    const dates = generateDoseDates(
      dateFromString(startDate),
      effectiveWeeks,
      freq,
      pickedDays
    );
    const dateDoses = dates.map((d) => ({
      date: d,
      dose: doseOnDate(previewSchedule, d),
    }));

    const totalDoses = dateDoses.length;
    const totalAmount = dateDoses.reduce((sum, dd) => sum + dd.dose, 0);
    const dosesPerWeek = effectiveWeeks > 0 ? totalDoses / effectiveWeeks : 0;

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

    let remainingInDoseUnit = 0;
    let inventoryMismatch = false;
    let hasInventory = false;
    for (const item of inventory) {
      if (
        item.peptide_name.trim().toLowerCase() !== peptide.trim().toLowerCase()
      )
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

    let supply = remainingInDoseUnit;
    let dosesCovered = 0;
    let coverUntil = null;
    if (hasInventory) {
      for (const dd of dateDoses) {
        if (supply + 1e-9 >= dd.dose) {
          supply -= dd.dose;
          dosesCovered++;
          coverUntil = dd.date;
        } else break;
      }
    }
    const coversAll = hasInventory && dosesCovered === dateDoses.length;

    const costNumber = parseFloat(costPerVial);
    const estCost =
      vialsNeeded !== null && !isNaN(costNumber) && costNumber >= 0
        ? vialsNeeded * costNumber
        : null;

    plan = {
      dateDoses,
      totalDoses,
      totalAmount,
      dosesPerWeek,
      vialsNeeded,
      vialUnitMismatch,
      vialSizeNumber,
      hasInventory,
      inventoryMismatch,
      remainingInDoseUnit,
      dosesCovered,
      coverUntil,
      coversAll,
      estCost,
      titrated: doseMode !== "flat",
    };
  }

  // ---------------- save a live schedule ----------------
  async function handleSave() {
    if (!validProtocol || !userId || saving) return;
    setSaving(true);
    setSaveError("");
    const row = buildReminderRow(getCurrentProtocol(), userId);
    const { error } = await supabase.from("reminders").insert(row);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setJustSaved(true);
  }

  // ---------------- drafts ----------------
  async function handleSaveDraft() {
    if (!validProtocol || !userId || savingDraft) return;
    setSavingDraft(true);
    setDraftError("");
    const name = draftName.trim() || `${peptide} protocol`;
    const definition = getCurrentProtocol();
    const { data, error } = await supabase
      .from("protocol_drafts")
      .insert({ user_id: userId, name, definition })
      .select()
      .single();
    setSavingDraft(false);
    if (error) {
      setDraftError(error.message);
      return;
    }
    setDrafts((current) => [data, ...current]);
    setDraftName("");
    setDraftSaved(true);
  }

  function handleLoadDraft(draft) {
    const d = normalizeDef(draft.definition);
    isLoadingDraft.current = true; // don't let the seeding effects clobber days

    setPeptide(d.peptide);
    setDoseUnit(d.doseUnit);
    setFreq(d.freq);
    setCustomN(d.customN);
    setDoseMode(d.doseMode);
    setDose(d.dose);
    setPhases(d.phases);
    setWeeklyDoses(d.weeklyDoses);
    setWeeks(d.weeks);
    setStartDate(d.startDate);
    setVialSize(d.vialSize);
    setVialUnit(d.vialUnit);
    setCostPerVial(d.costPerVial);
    setEmailReminders(d.emailReminders);
    setPickedDays(d.pickedDays);

    setDraftActionMsg(`Loaded "${draft.name}" into the planner above.`);
    setDraftActionError("");

    // release the guard after this render + its effects have run
    setTimeout(() => {
      isLoadingDraft.current = false;
    }, 0);
  }

  async function handleActivateDraft(draft) {
    if (!userId || activatingId) return;
    setActivatingId(draft.id);
    setDraftActionError("");
    setDraftActionMsg("");
    const row = buildReminderRow(normalizeDef(draft.definition), userId);
    const { error } = await supabase.from("reminders").insert(row);
    setActivatingId(null);
    if (error) {
      setDraftActionError(`Couldn't activate "${draft.name}": ${error.message}`);
      return;
    }
    setDraftActionMsg(
      `Activated "${draft.name}" — it's now on your Calendar.`
    );
  }

  async function handleDeleteDraft(draft) {
    const sure = window.confirm(
      `Delete the draft "${draft.name}"? This can't be undone. ` +
        `(It only removes the saved draft — any schedules you already ` +
        `activated are not affected.)`
    );
    if (!sure) return;
    const { error } = await supabase
      .from("protocol_drafts")
      .delete()
      .eq("id", draft.id);
    if (!error) {
      setDrafts((current) => current.filter((d) => d.id !== draft.id));
    }
  }

  // ---------------- draw calculator ----------------
  const dv = parseFloat(drawVialMg);
  const dw = parseFloat(drawWaterMl);
  const dd = parseFloat(drawDoseMg);
  let draw = null;
  if (!isNaN(dv) && dv > 0 && !isNaN(dw) && dw > 0 && !isNaN(dd) && dd > 0) {
    const concentration = dv / dw;
    const ml = dd / concentration;
    const units = ml * 100;
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
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Protocol Planner
        </h1>
        <p className="text-slate-400 mt-1">
          Enter a protocol — flat or titrated — and the app works out the
          supply, cost, and timing. Save it as a schedule, or keep it as a
          draft.
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
                Times per week{" "}
                <span className="text-slate-500">(sets a starting pattern)</span>
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

          {usesWeekdays ? (
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                On which days{" "}
                <span className="text-slate-500">(tap to adjust)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={
                      pickedDays.includes(day.value)
                        ? "px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-sm font-semibold"
                        : "px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
                    }
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {pickedDays.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  Pick at least one day to see the plan.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Doses fall{" "}
              {freq === "daily" ? "every day" : "every other day"} from your
              start date.
            </p>
          )}

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

          {/* ---------- dosing ---------- */}
          <div className="pt-2 border-t border-slate-800 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Dosing
                </label>
                <div className="flex gap-2">
                  {DOSE_MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setDoseMode(m.key)}
                      className={
                        doseMode === m.key
                          ? "px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-sm font-semibold"
                          : "px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Unit{" "}
                  {doseMode !== "flat" && (
                    <span className="text-slate-500">(all doses)</span>
                  )}
                </label>
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

            {doseMode === "phases" ? (
              <p className="text-sm text-slate-400">
                Plan length:{" "}
                <span className="text-white font-semibold">
                  {effectiveWeeks} {effectiveWeeks === 1 ? "week" : "weeks"}
                </span>{" "}
                <span className="text-slate-500">(summed from your phases)</span>
              </p>
            ) : (
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
            )}

            {doseMode === "flat" && (
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
            )}

            {doseMode === "phases" && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">
                  Phases <span className="text-slate-500">(dose × weeks)</span>
                </label>
                {phases.map((p, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="dose"
                      value={p.dose}
                      onChange={(e) => updatePhase(index, "dose", e.target.value)}
                      className={inputClasses}
                    />
                    <span className="text-slate-500 text-sm">{doseUnit} ×</span>
                    <input
                      type="number"
                      min="1"
                      max="104"
                      step="1"
                      placeholder="wks"
                      value={p.weeks}
                      onChange={(e) =>
                        updatePhase(index, "weeks", e.target.value)
                      }
                      className="w-20 bg-slate-800 text-white px-3 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-slate-500 text-sm">wk</span>
                    <button
                      type="button"
                      onClick={() => removePhase(index)}
                      disabled={phases.length === 1}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30 px-1"
                      title="Remove phase"
                    >
                      <Icon name="close" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhase}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 inline-flex items-center gap-1.5"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  Add phase
                </button>
              </div>
            )}

            {doseMode === "weekly" && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">
                  Dose each week{" "}
                  <span className="text-slate-500">({doseUnit})</span>
                </label>
                {weeklyDoses.length === 0 ? (
                  <p className="text-xs text-amber-400">
                    Set a plan length above to get a box per week.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {weeklyDoses.map((d, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-12 shrink-0">
                          Wk {index + 1}
                        </span>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0.0"
                          value={d}
                          onChange={(e) => updateWeek(index, e.target.value)}
                          className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* vial size + cost */}
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
                        ? "px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-sm font-semibold"
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
            <h2 className="text-lg font-semibold text-white mb-4">The plan</h2>

            {!validProtocol ? (
              <p className="text-slate-500">
                Fill in a peptide, frequency, length, and dose and your plan
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
                    sub={
                      plan.titrated
                        ? `titrated over ${effectiveWeeks} weeks`
                        : `over ${effectiveWeeks} weeks`
                    }
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

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  {!plan.hasInventory ? (
                    <p className="text-sm text-slate-400">
                      You're not tracking{" "}
                      <span className="text-white">{peptide}</span> in
                      inventory yet — add it there to see how long your current
                      supply lasts.
                    </p>
                  ) : plan.dosesCovered > 0 ? (
                    <p className="text-sm text-slate-300">
                      Your current inventory ({trim(plan.remainingInDoseUnit)}{" "}
                      {doseUnit}) covers about{" "}
                      <span className="text-white font-semibold">
                        {plan.dosesCovered}{" "}
                        {plan.dosesCovered === 1 ? "dose" : "doses"}
                      </span>
                      {plan.coversAll ? (
                        <span> — the full protocol.</span>
                      ) : (
                        <span> — through {formatDate(plan.coverUntil)}.</span>
                      )}
                      {plan.inventoryMismatch &&
                        " (Some vials in another unit were skipped.)"}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Your current inventory ({trim(plan.remainingInDoseUnit)}{" "}
                      {doseUnit}) isn't enough for even the first dose.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">
                    Upcoming doses{" "}
                    <span className="text-slate-500">
                      (first {Math.min(14, plan.dateDoses.length)})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plan.dateDoses.slice(0, 14).map((dd, index) => (
                      <span
                        key={index}
                        className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-300"
                      >
                        {formatDate(dd.date)}
                        {plan.titrated && (
                          <span className="text-emerald-400">
                            {" "}
                            · {trim(dd.dose)}
                            {doseUnit}
                          </span>
                        )}
                      </span>
                    ))}
                    {plan.dateDoses.length > 14 && (
                      <span className="text-xs text-slate-500 px-2 py-1">
                        +{plan.dateDoses.length - 14} more
                      </span>
                    )}
                  </div>
                </div>

                {/* save as a schedule */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Save as a schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saving stores this recurrence rule (including any titration)
                    so the calendar and reminders can use it. It doesn't log any
                    doses or touch your inventory.
                  </p>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailReminders}
                      onChange={(e) => setEmailReminders(e.target.checked)}
                      className="mt-1 accent-emerald-500"
                    />
                    <span className="text-sm text-slate-300">
                      Email me on dose days
                      <span className="block text-xs text-slate-500">
                        The reminder states the dose that applies that day.
                      </span>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-emerald-950 font-semibold py-3 rounded-lg transition-colors"
                  >
                    {saving ? "Saving..." : "Save schedule"}
                  </button>

                  {justSaved && (
                    <p className="text-sm text-emerald-400 flex items-start gap-1.5">
                      <Icon name="check" className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        Schedule saved. Check it on the Calendar page — a
                        titrated schedule shows the dose changing over time.
                      </span>
                    </p>
                  )}
                  {saveError && (
                    <p className="text-sm text-red-400">
                      Couldn't save: {saveError}
                    </p>
                  )}

                  {/* save as a draft */}
                  <div className="pt-3 border-t border-slate-800/60 space-y-2">
                    <p className="text-xs text-slate-500">
                      Not ready to commit? Save it as a draft instead — drafts
                      stay off the calendar and send no reminders.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={80}
                        placeholder="Draft name (optional)"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className={inputClasses}
                      />
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                        className="shrink-0 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                      >
                        {savingDraft ? "Saving..." : "Save draft"}
                      </button>
                    </div>
                    {draftSaved && (
                      <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                        <Icon name="check" className="w-3.5 h-3.5 shrink-0" />
                        Draft saved — see it in "Your drafts" below.
                      </p>
                    )}
                    {draftError && (
                      <p className="text-sm text-red-400">
                        Couldn't save draft: {draftError}
                      </p>
                    )}
                  </div>
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

      {/* ---------- DRAFTS (full width, always visible) ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Your drafts</h2>
        <p className="text-sm text-slate-500 mb-4">
          Saved protocols you haven't committed to. They don't appear on the
          calendar, send reminders, or affect streaks until you activate one.
        </p>

        {(draftActionMsg || draftActionError) && (
          <div className="mb-4">
            {draftActionMsg && (
              <p className="text-sm text-emerald-400">{draftActionMsg}</p>
            )}
            {draftActionError && (
              <p className="text-sm text-red-400">{draftActionError}</p>
            )}
          </div>
        )}

        {drafts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No drafts yet — build a protocol above and hit "Save draft".
          </p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((draft) => {
              const s = summarizeDraft(draft.definition);
              return (
                <li
                  key={draft.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {draft.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {summarizeDraft(draft.definition).doseStr
                        ? `${s.doseStr} · ${s.freqLabel} · ${s.weeks} ${
                            s.weeks === 1 ? "week" : "weeks"
                          }`
                        : `${s.freqLabel} · ${s.weeks} weeks`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoadDraft(draft)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivateDraft(draft)}
                      disabled={activatingId === draft.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {activatingId === draft.id ? "Activating..." : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(draft)}
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
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-xl font-semibold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}