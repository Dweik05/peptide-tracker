// ============================================================
// SHARED PEPTIDE DATA  —  goes in:  app/lib/peptides.js
// (FULL REPLACEMENT of the previous version)
//
// v2 — now contains EVERY item from the supplier catalogue,
// per your request. The only things skipped are the diluents
// (bacteriostatic water, acetic acid water, plain water) —
// they're not peptides and would clutter the dose dropdown.
// If you ever want to track them, we can add a separate
// "supplies" section to inventory.
//
// Single source of truth. Imported by /log and /inventory
// (and later: encyclopedia, injection map). One edit here
// updates every page — including your pre-launch lawyer cull.
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

  // ---- added in v2: the rest of the catalogue ----
  { short: "AP", full: "Adipotide" },
  { short: "BTF", full: "TB-500 Fragment" },
  { short: "CP", full: "CJC-1295 (no DAC) + Ipamorelin Blend" },
  { short: "ARA", full: "ARA-290" },
  { short: "NP8", full: "Snap-8" },
  { short: "EPO", full: "EPO" },
  { short: "AD", full: "Adamax" },
  { short: "PE", full: "PE 22-28" },
  { short: "VI", full: "Vilon" },
  { short: "TG", full: "Testagen" },
  { short: "KLOW", full: "BPC-157 + GHK-CU + TB-500 + KPV Blend" },
  { short: "BR", full: "Bronchogen" },
  { short: "CA", full: "Cardiogen" },
  { short: "COR", full: "Cortagen" },
  { short: "LI", full: "Livagen" },
  { short: "PA", full: "Pancragen" },
  { short: "MAX", full: "Prostamax" },
  { short: "LAX", full: "Cartalax" },
  { short: "CH", full: "Chonluten" },
  { short: "CRY", full: "Crystagen" },
  { short: "OV", full: "Ovagen" },
  { short: "VE", full: "Vesugen" },
  { short: "HHB", full: "Hair Skin & Nails Blend (HHB)" },
  { short: "SHB", full: "Super Human Blend (SHB)" },
  { short: "LIPO", full: "Lipo-C" },
  { short: "LIPOF", full: "Lipo-C Fat Blaster" },
  { short: "LC216", full: "L-Carnitine + B-Vitamin Blend (LC216)" },
  { short: "B12", full: "B12 (Methylcobalamin)" },

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

  // ---- added in v2 ----
  "Adipotide": { unit: "mg", sizes: [2, 5] },
  "TB-500 Fragment": { unit: "mg", sizes: [10] },
  "CJC-1295 (no DAC) + Ipamorelin Blend": { unit: "mg", sizes: [10] },
  "ARA-290": { unit: "mg", sizes: [10] },
  "Snap-8": { unit: "mg", sizes: [10] },
  "EPO": { unit: "IU", sizes: [3000] },
  "Adamax": { unit: "mg", sizes: [5] },
  "PE 22-28": { unit: "mg", sizes: [10] },
  "Vilon": { unit: "mg", sizes: [20] },
  "Testagen": { unit: "mg", sizes: [20] },
  "BPC-157 + GHK-CU + TB-500 + KPV Blend": { unit: "mg", sizes: [80] },
  "Bronchogen": { unit: "mg", sizes: [20] },
  "Cardiogen": { unit: "mg", sizes: [20] },
  "Cortagen": { unit: "mg", sizes: [20] },
  "Livagen": { unit: "mg", sizes: [20] },
  "Pancragen": { unit: "mg", sizes: [20] },
  "Prostamax": { unit: "mg", sizes: [20] },
  "Cartalax": { unit: "mg", sizes: [20] },
  "Chonluten": { unit: "mg", sizes: [20] },
  "Crystagen": { unit: "mg", sizes: [20] },
  "Ovagen": { unit: "mg", sizes: [20] },
  "Vesugen": { unit: "mg", sizes: [20] },
  "Hair Skin & Nails Blend (HHB)": { unit: "ml", sizes: [10] },
  "Super Human Blend (SHB)": { unit: "ml", sizes: [10] },
  "Lipo-C": { unit: "ml", sizes: [10] },
  "Lipo-C Fat Blaster": { unit: "ml", sizes: [10] },
  "L-Carnitine + B-Vitamin Blend (LC216)": { unit: "ml", sizes: [10] },
  "B12 (Methylcobalamin)": { unit: "ml", sizes: [10] },
};
