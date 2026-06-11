// ============================================================
// SHARED PEPTIDE DATA  —  goes in:  app/lib/peptides.js
// (NEW FILE — create it right next to app/lib/supabase.js)
//
// Single source of truth for the peptide list. Imported by:
//   - /log        (the dose dropdown)
//   - /inventory  (the product dropdown + vial-size presets)
//   - later: the encyclopedia (Days 17-18) and the injection
//     map (Day 15)
//
// Change a peptide here and every page updates. When your
// lawyer review decides which research-only compounds to hide
// before launch, this is the one file to edit.
//
// NOTE: dose_logs rows store the FULL NAME exactly as written
// here. Matching everywhere is case-insensitive, so fixing
// capitalization is safe — but renaming a peptide (changing
// letters) would orphan old logs. Add freely; rename carefully.
// ============================================================

export const PEPTIDES = [
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
  { short: "KP", full: "Kisspeptin-10" },
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
  { short: "TR", full: "Tirzepatide" },
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

// The units used for dosing and inventory quantities.
export const UNITS = ["mg", "mcg", "IU", "ml"];

// Convert an amount between units, when possible.
// mg ↔ mcg convert cleanly; IU and ml only match themselves.
// Returns null when the units aren't compatible.
export function convertAmount(amount, fromUnit, toUnit) {
  if (fromUnit === toUnit) return amount;
  if (fromUnit === "mg" && toUnit === "mcg") return amount * 1000;
  if (fromUnit === "mcg" && toUnit === "mg") return amount / 1000;
  return null;
}

// ------------------------------------------------------------
// Common vial sizes per peptide, transcribed from the supplier
// catalogue. Used by the inventory form's tap-to-fill presets.
// Sizes are PER VIAL (a "5mg*10vials" kit = tap 5, then add the
// product once per vial, or multiply yourself for the kit).
// Peptides not listed here simply show no presets.
// ------------------------------------------------------------
export const VIAL_SIZES = {
  "Semaglutide": { unit: "mg", sizes: [2, 5, 10, 15, 20, 30, 40, 50] },
  "Tirzepatide": { unit: "mg", sizes: [5, 10, 15, 20, 30, 40, 50, 60, 100, 120] },
  "Retatrutide": { unit: "mg", sizes: [5, 10, 15, 20, 30, 40, 50, 60] },
  "BPC-157": { unit: "mg", sizes: [5, 10, 20] },
  "PT-141 (Bremelanotide)": { unit: "mg", sizes: [10] },
  "Gonadorelin Acetate": { unit: "mg", sizes: [2] },
  "Selank": { unit: "mg", sizes: [5, 10] },
  "NA Selank Amidate": { unit: "mg", sizes: [30] },
  "DSIP": { unit: "mg", sizes: [5, 10, 15] },
  "Oxytocin Acetate": { unit: "mg", sizes: [2, 5, 10] },
  "Epithalon": { unit: "mg", sizes: [10, 40, 50] },
  "Melanotan 1": { unit: "mg", sizes: [10] },
  "Melanotan 2": { unit: "mg", sizes: [10] },
  "BPC-157 + TB-500 Blend": { unit: "mg", sizes: [10, 20] },
  "BPC-157 + GHK-CU + TB-500 Blend": { unit: "mg", sizes: [70] },
  "ACE-031": { unit: "mg", sizes: [1] },
  "Semax + Selank Blend": { unit: "mg", sizes: [20] },
  "Semax": { unit: "mg", sizes: [10, 50] },
  "SS-31": { unit: "mg", sizes: [5, 10] },
  "CJC-1295 without DAC": { unit: "mg", sizes: [5, 10] },
  "CJC-1295 with DAC": { unit: "mg", sizes: [2, 5, 10] },
  "TB-500": { unit: "mg", sizes: [10] },
  "MGF": { unit: "mg", sizes: [2] },
  "PEG MGF": { unit: "mg", sizes: [2] },
  "HCG": { unit: "IU", sizes: [2000, 5000, 10000] },
  "HMG": { unit: "IU", sizes: [75] },
  "AOD9604": { unit: "mg", sizes: [5, 10] },
  "IGF-1 LR3": { unit: "mg", sizes: [0.1, 1] },
  "Tesamorelin": { unit: "mg", sizes: [10, 20] },
  "Ipamorelin": { unit: "mg", sizes: [5, 10] },
  "Hexarelin Acetate": { unit: "mg", sizes: [2, 5] },
  "GHK-CU": { unit: "mg", sizes: [50, 100] },
  "AHK-CU": { unit: "mg", sizes: [50, 100] },
  "Kisspeptin-10": { unit: "mg", sizes: [5, 10] },
  "Thymalin": { unit: "mg", sizes: [10] },
  "Thymosin Alpha-1": { unit: "mg", sizes: [5, 10] },
  "MOTS-c": { unit: "mg", sizes: [10, 40] },
  "FOXO4": { unit: "mg", sizes: [10] },
  "Melatonin": { unit: "mg", sizes: [10] },
  "HGH Fragment 176-191": { unit: "mg", sizes: [2, 5, 10, 15] },
  "Lemon Bottle": { unit: "mg", sizes: [10] },
  "Glutathione": { unit: "mg", sizes: [600, 1500] },
  "5-Amino-1MQ": { unit: "mg", sizes: [5, 10, 50] },
  "Cerebrolysin": { unit: "mg", sizes: [60] },
  "Hyaluronic Acid": { unit: "mg", sizes: [5] },
  "Cagrilintide": { unit: "mg", sizes: [5, 10, 20] },
  "Cagrilintide + Semaglutide Blend": { unit: "mg", sizes: [10] },
  "Retatrutide + Cagrilintide Blend": { unit: "mg", sizes: [10] },
  "Survodutide": { unit: "mg", sizes: [10] },
  "VIP": { unit: "mg", sizes: [5, 10] },
  "KPV": { unit: "mg", sizes: [10] },
  "Pinealon": { unit: "mg", sizes: [5, 10, 20] },
  "PNC-27": { unit: "mg", sizes: [5, 10] },
  "P21": { unit: "mg", sizes: [10] },
  "Humanin": { unit: "mg", sizes: [10] },
  "Teriparatide": { unit: "mg", sizes: [10] },
  "Liraglutide": { unit: "mg", sizes: [5, 10, 30] },
  "L-Carnitine": { unit: "mg", sizes: [600] },
  "NAD+": { unit: "mg", sizes: [100, 500, 1000] },
  "Matrixyl": { unit: "mg", sizes: [10] },
  "N-Acetyl Epitalon Amidate": { unit: "mg", sizes: [5] },
};