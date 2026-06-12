// ============================================================
// SHARED INJECTION SITE DATA  —  goes in:  app/lib/sites.js
// (FULL REPLACEMENT of the Day 13 version)
//
// Day 15 upgrade — the promised site-key standardization:
//
//   1. BODY_POINTS moved here from /log (it's site data, and
//      the rotation map needs it too)
//   2. normalizeSiteKey(): turns ANY injection_site string the
//      app has ever saved into one canonical key. Your history
//      uses two formats — the dropdown saved "Thigh - Middle
//      Left" while the body diagram saved "Thigh Middle Left".
//      This function maps BOTH to "thigh-mid-left".
//
// WHY THIS WAY (the data decision): instead of adding a new
// database column and migrating old rows, we translate at
// read time. The set of possible strings is closed — our own
// UI generated every one of them — so a lookup table covers
// 100% of mappable history. Old logs light up the map with
// ZERO database changes and zero migration risk. Free-text
// "Other" sites simply don't map (the page shows a count).
//
// Imported by: /log (dropdown + diagram + rotation map) and
// /dashboard (quick-log modal).
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

// The clickable points on the body diagram (moved from /log —
// same ids, labels, and coordinates as always).
export const BODY_POINTS = {
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

// Every point with its view attached — handy for iterating all
// 26 sites at once (the suggestion logic does this).
export const ALL_BODY_POINTS = [
  ...BODY_POINTS.front.map((p) => ({ ...p, view: "front" })),
  ...BODY_POINTS.back.map((p) => ({ ...p, view: "back" })),
];

// Which body-area group a site key belongs to ("thigh-mid-left"
// → "Thigh"). Used to suggest rotations within the areas you
// actually use.
const KEY_PREFIX_TO_GROUP = {
  abd: "Abdomen",
  thigh: "Thigh",
  glute: "Glute",
  arm: "Arm",
  back: "Back",
  chest: "Chest",
};

export function groupOfKey(key) {
  return KEY_PREFIX_TO_GROUP[key.split("-")[0]] || "Other";
}

// ------------------------------------------------------------
// The normalization lookup. Two historical formats map to the
// same canonical key:
//   diagram label:    "Thigh Middle Left"     → thigh-mid-left
//   dropdown combo:   "Thigh - Middle Left"   → thigh-mid-left
// ------------------------------------------------------------

function cleanText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

const SITE_LOOKUP = {};

// 1) every diagram label maps to its own id
for (const point of ALL_BODY_POINTS) {
  SITE_LOOKUP[cleanText(point.label)] = point.id;
}

// 2) every "Group - Site" dropdown combo maps to the matching id
const DROPDOWN_TO_KEY = {
  "Abdomen - Upper Left": "abd-upper-left",
  "Abdomen - Upper Right": "abd-upper-right",
  "Abdomen - Lower Left": "abd-lower-left",
  "Abdomen - Lower Right": "abd-lower-right",
  "Abdomen - Navel Left": "abd-navel-left",
  "Abdomen - Navel Right": "abd-navel-right",
  "Thigh - Upper Left": "thigh-upper-left",
  "Thigh - Upper Right": "thigh-upper-right",
  "Thigh - Middle Left": "thigh-mid-left",
  "Thigh - Middle Right": "thigh-mid-right",
  "Thigh - Outer Left": "thigh-outer-left",
  "Thigh - Outer Right": "thigh-outer-right",
  "Glute - Upper Left": "glute-upper-left",
  "Glute - Upper Right": "glute-upper-right",
  "Glute - Lower Left": "glute-lower-left",
  "Glute - Lower Right": "glute-lower-right",
  "Arm - Upper Left (Deltoid)": "arm-upper-left",
  "Arm - Upper Right (Deltoid)": "arm-upper-right",
  "Arm - Lower Left": "arm-lower-left",
  "Arm - Lower Right": "arm-lower-right",
  "Back - Lower Left": "back-lower-left",
  "Back - Lower Right": "back-lower-right",
  "Back - Upper Left": "back-upper-left",
  "Back - Upper Right": "back-upper-right",
  "Chest - Left Pectoral": "chest-left",
  "Chest - Right Pectoral": "chest-right",
};

for (const [text, key] of Object.entries(DROPDOWN_TO_KEY)) {
  SITE_LOOKUP[cleanText(text)] = key;
}

// Turns any saved injection_site string into a canonical site
// key, or null when it can't be mapped (free-text "Other" sites).
export function normalizeSiteKey(text) {
  if (!text) return null;
  return SITE_LOOKUP[cleanText(text)] ?? null;
}

// Display label for a key ("thigh-mid-left" → "Thigh Middle Left")
const KEY_TO_LABEL = {};
for (const point of ALL_BODY_POINTS) {
  KEY_TO_LABEL[point.id] = point.label;
}

export function labelOfKey(key) {
  return KEY_TO_LABEL[key] || key;
}