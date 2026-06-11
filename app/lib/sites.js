// ============================================================
// SHARED INJECTION SITE DATA  —  goes in:  app/lib/sites.js
// (NEW FILE — create it next to peptides.js and supabase.js)
//
// Single source of truth for the injection site options.
// Imported by:
//   - /log        (the two-level site dropdown)
//   - /dashboard  (the quick-log modal)
//
// Heads up for future-us: Day 15 (the injection map) will
// upgrade this file with normalized site keys so historical
// doses can light up the body diagram. The import locations
// stay the same — only this file's contents will grow.
// ============================================================

export const INJECTION_SITE_GROUPS = [
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