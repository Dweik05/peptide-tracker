// ============================================================
// SHARED INJECTION SITE DATA  —  goes in:  app/lib/sites.js
// (FULL REPLACEMENT)
//
// Day 15 upgrade — the promised site-key standardization:
//
//   1. BODY_POINTS moved here from /log (it's site data, and
//      the rotation map needs it too)
//   2. normalizeSiteKey(): turns ANY injection_site string the
//      app has ever saved into one canonical key.
//
// Coordinate update: BODY_POINTS cx/cy re-plotted to sit on the
// new anatomical body silhouette. Every id and label is UNCHANGED,
// so normalization, history, and the rotation map keep working.
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

// The clickable points on the body diagram. Same ids and labels as
// always; coordinates re-plotted for the new silhouette (viewBox 0 0 400 500).
export const BODY_POINTS = {
  front: [
    { id: "abd-upper-left", label: "Abdomen Upper Left", cx: 185, cy: 212 },
    { id: "abd-upper-right", label: "Abdomen Upper Right", cx: 215, cy: 212 },
    { id: "abd-lower-left", label: "Abdomen Lower Left", cx: 185, cy: 248 },
    { id: "abd-lower-right", label: "Abdomen Lower Right", cx: 215, cy: 248 },
    { id: "abd-navel-left", label: "Abdomen Navel Left", cx: 185, cy: 230 },
    { id: "abd-navel-right", label: "Abdomen Navel Right", cx: 215, cy: 230 },
    { id: "thigh-upper-left", label: "Thigh Upper Left", cx: 184, cy: 350 },
    { id: "thigh-upper-right", label: "Thigh Upper Right", cx: 216, cy: 350 },
    { id: "thigh-mid-left", label: "Thigh Middle Left", cx: 182, cy: 395 },
    { id: "thigh-mid-right", label: "Thigh Middle Right", cx: 218, cy: 395 },
    { id: "arm-upper-left", label: "Arm Upper Left (Deltoid)", cx: 152, cy: 150 },
    { id: "arm-upper-right", label: "Arm Upper Right (Deltoid)", cx: 248, cy: 150 },
    { id: "chest-left", label: "Chest Left Pectoral", cx: 182, cy: 165 },
    { id: "chest-right", label: "Chest Right Pectoral", cx: 218, cy: 165 },
  ],
  back: [
    { id: "glute-upper-left", label: "Glute Upper Left", cx: 184, cy: 285 },
    { id: "glute-upper-right", label: "Glute Upper Right", cx: 216, cy: 285 },
    { id: "glute-lower-left", label: "Glute Lower Left", cx: 184, cy: 305 },
    { id: "glute-lower-right", label: "Glute Lower Right", cx: 216, cy: 305 },
    { id: "back-lower-left", label: "Lower Back Left", cx: 185, cy: 235 },
    { id: "back-lower-right", label: "Lower Back Right", cx: 215, cy: 235 },
    { id: "back-upper-left", label: "Upper Back Left", cx: 183, cy: 158 },
    { id: "back-upper-right", label: "Upper Back Right", cx: 217, cy: 158 },
    { id: "thigh-outer-left", label: "Thigh Outer Left", cx: 172, cy: 352 },
    { id: "thigh-outer-right", label: "Thigh Outer Right", cx: 228, cy: 352 },
    { id: "arm-lower-left", label: "Arm Lower Left", cx: 140, cy: 195 },
    { id: "arm-lower-right", label: "Arm Lower Right", cx: 260, cy: 195 },
  ],
};

export const ALL_BODY_POINTS = [
  ...BODY_POINTS.front.map((p) => ({ ...p, view: "front" })),
  ...BODY_POINTS.back.map((p) => ({ ...p, view: "back" })),
];

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

function cleanText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

const SITE_LOOKUP = {};

for (const point of ALL_BODY_POINTS) {
  SITE_LOOKUP[cleanText(point.label)] = point.id;
}

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

export function normalizeSiteKey(text) {
  if (!text) return null;
  return SITE_LOOKUP[cleanText(text)] ?? null;
}

const KEY_TO_LABEL = {};
for (const point of ALL_BODY_POINTS) {
  KEY_TO_LABEL[point.id] = point.label;
}

export function labelOfKey(key) {
  return KEY_TO_LABEL[key] || key;
}