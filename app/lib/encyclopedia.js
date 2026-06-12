// ============================================================
// ENCYCLOPEDIA DATA  —  goes in:  app/lib/encyclopedia.js
// (NEW FILE — create it next to peptides.js, sites.js, etc.)
//
// The reference library behind the Peptide Encyclopedia.
//
// ⚠️ LEGAL FRAMING (lawyer checklist item #3) — read before
// editing. Everything here is REFERENCE CONTENT, not advice:
//   - Dosing lives ONLY in the `dosingReference` field, always
//     phrased as what was STUDIED/REPORTED, never as an
//     instruction. Each entry repeats that it's not medical
//     advice. Do not add "recommended dose" anywhere.
//   - `approval` states real-world regulatory status plainly.
//     Research-only compounds say so, prominently.
//   - This file is the SINGLE PLACE a lawyer reviews dosing
//     content. Keep it that way — pages render these fields,
//     they don't add dosing of their own.
//
// Read by: /peptides (the encyclopedia), and later the
// goal-stacks browsing + Day 28 benchmarking, which reuse
// `GOALS`, the `goals` tags, and `evidenceTier`.
//
// Day 17 ships ~10 deep entries (the popular ones). Day 18
// adds the rest + the reconstitution guide + search.
// ============================================================

// ---- evidence tiers: a ranking users can trust ----
// We rank by strength of evidence, NOT by an invented score.
export const EVIDENCE_TIERS = {
  approved: {
    label: "Approved for this use",
    blurb: "Regulator-approved for this purpose in at least one major market.",
    color: "emerald",
  },
  strong: {
    label: "Strong clinical evidence",
    blurb: "Tested in large human trials (Phase 2/3), though not approved for this specific use.",
    color: "teal",
  },
  emerging: {
    label: "Emerging human data",
    blurb: "Early human studies exist, but evidence is limited or ongoing.",
    color: "sky",
  },
  preclinical: {
    label: "Animal / lab research only",
    blurb: "Studied mainly in animals or cells — little or no human data.",
    color: "amber",
  },
  anecdotal: {
    label: "Anecdotal",
    blurb: "Used in the community, but lacking meaningful published human evidence.",
    color: "slate",
  },
};

// ---- the goals users browse by ----
export const GOALS = [
  { key: "weight-loss", label: "Weight Loss & Appetite", icon: "⚖️" },
  { key: "healing", label: "Healing & Recovery", icon: "🩹" },
  { key: "muscle", label: "Muscle & Performance", icon: "💪" },
  { key: "sleep", label: "Sleep", icon: "😴" },
  { key: "cognitive", label: "Cognitive & Mood", icon: "🧠" },
  { key: "skin-hair", label: "Skin, Hair & Tanning", icon: "✨" },
  { key: "sexual", label: "Sexual Health", icon: "❤️" },
  { key: "longevity", label: "Longevity & Cellular", icon: "🧬" },
];

// Tag shape on each entry's `goals`:
//   { key: <goal key>, role: "primary" | "secondary", note: "..." }
// "primary" = a main, intended use. "secondary" = a real but
// non-primary effect (e.g. MT2's appetite suppression).

// ------------------------------------------------------------
// THE ENTRIES (Day 17 batch). `name` MUST match the `full`
// name in peptides.js so cross-links and benchmarking line up.
// ------------------------------------------------------------
export const ENTRIES = [
  {
    name: "Semaglutide",
    aka: ["Ozempic", "Wegovy", "Rybelsus"],
    category: "GLP-1 receptor agonist",
    summary:
      "A GLP-1 medication that lowers appetite and slows stomach emptying. One of the most studied weight-loss and type-2-diabetes drugs available.",
    goals: [
      { key: "weight-loss", role: "primary", note: "Reduces appetite and food intake; among the most effective options studied." },
    ],
    evidenceTier: "approved",
    mechanism:
      "Mimics the GLP-1 hormone, signalling fullness to the brain, slowing gastric emptying, and improving insulin response.",
    halfLife: "About 7 days (once-weekly dosing).",
    storage:
      "Refrigerate; protect from light. Follow the product's specific storage instructions.",
    commonSideEffects: [
      "Nausea",
      "Diarrhea or constipation",
      "Vomiting",
      "Reduced appetite",
      "Heartburn",
    ],
    dosingReference:
      "In trials and approved labeling, semaglutide for weight management was titrated slowly over months from a low starting amount to a higher maintenance amount to limit nausea. Exact schedules differ by product and indication. This is background information, not a dosing instruction.",
    approval:
      "FDA- and Health-Canada-approved (e.g. Ozempic/Rybelsus for type 2 diabetes, Wegovy for weight management).",
  },
  {
    name: "Tirzepatide",
    aka: ["Mounjaro", "Zepbound"],
    category: "GIP / GLP-1 dual agonist",
    summary:
      "A dual-hormone medication (GIP + GLP-1) for blood sugar and weight. In head-to-head trials it produced larger average weight loss than semaglutide.",
    goals: [
      { key: "weight-loss", role: "primary", note: "Dual GIP/GLP-1 action; produced very large average weight loss in trials." },
    ],
    evidenceTier: "approved",
    mechanism:
      "Activates both the GIP and GLP-1 receptors, which together curb appetite, slow gastric emptying, and improve insulin sensitivity.",
    halfLife: "About 5 days (once-weekly dosing).",
    storage:
      "Refrigerate; protect from light. Follow the product's specific storage instructions.",
    commonSideEffects: [
      "Nausea",
      "Diarrhea",
      "Decreased appetite",
      "Vomiting",
      "Constipation",
    ],
    dosingReference:
      "In trials and approved labeling, tirzepatide was titrated upward gradually over months from a low starting amount to reduce gastrointestinal side effects. Exact schedules differ by product and indication. Background information only, not a dosing instruction.",
    approval:
      "FDA- and Health-Canada-approved (Mounjaro for type 2 diabetes; Zepbound for weight management).",
  },
  {
    name: "Retatrutide",
    aka: ["Reta", "LY3437943"],
    category: "GIP / GLP-1 / glucagon triple agonist",
    summary:
      "An investigational triple-hormone agonist for obesity. Early-phase trials showed striking weight loss, but it is still being studied and is not approved.",
    goals: [
      { key: "weight-loss", role: "primary", note: "Triple-hormone agonist; Phase 2 weight loss was among the largest reported, but trials are ongoing." },
    ],
    evidenceTier: "strong",
    mechanism:
      "Activates three receptors — GIP, GLP-1, and glucagon — combining appetite reduction with increased energy expenditure.",
    halfLife: "Roughly 6 days (once-weekly dosing in trials).",
    storage: "Handle and store per supplier guidance; protect from light and heat.",
    commonSideEffects: [
      "Nausea",
      "Diarrhea",
      "Vomiting",
      "Decreased appetite",
      "Constipation",
    ],
    dosingReference:
      "Phase 2 studies explored a range of once-weekly amounts reached through gradual escalation. Because retatrutide is still investigational, no approved dosing exists. This is a description of published research, not a dosing instruction.",
    approval:
      "NOT APPROVED anywhere — investigational only, still in clinical trials. Sold by suppliers as a research compound; not a licensed medicine.",
  },
  {
    name: "BPC-157",
    aka: ["Body Protection Compound 157"],
    category: "Synthetic peptide fragment",
    summary:
      "A peptide popular in the community for soft-tissue healing and gut support. Animal research is promising; rigorous human evidence is lacking.",
    goals: [
      { key: "healing", role: "primary", note: "Most-discussed community use is tendon, muscle, and gut healing — based largely on animal data." },
    ],
    evidenceTier: "preclinical",
    mechanism:
      "Thought to promote new blood-vessel growth and modulate healing pathways in animal models. Human mechanisms are not well established.",
    halfLife: "Short (estimated; not well characterized in humans).",
    storage:
      "Lyophilized powder is stable refrigerated/frozen; once reconstituted, refrigerate and use within weeks.",
    commonSideEffects: [
      "Generally few reported in the community",
      "Injection site irritation",
      "Effects and safety not established by rigorous human trials",
    ],
    dosingReference:
      "Community and animal-study reports describe a range of daily amounts, sometimes split through the day, often cited in micrograms per kilogram in animal work. No human dosing has been established in controlled trials. Reference information only, not a dosing instruction.",
    approval:
      "NOT an approved medicine. Research compound; the WADA prohibited-substances list includes BPC-157.",
  },
  {
    name: "TB-500",
    aka: ["Thymosin Beta-4 fragment"],
    category: "Synthetic peptide",
    summary:
      "A peptide related to Thymosin Beta-4, used in the community alongside BPC-157 for recovery. Evidence is largely preclinical.",
    goals: [
      { key: "healing", role: "primary", note: "Community use centers on recovery and flexibility; evidence is mostly animal-based." },
      { key: "muscle", role: "secondary", note: "Used in recovery stacks, but not a muscle-builder itself." },
    ],
    evidenceTier: "preclinical",
    mechanism:
      "Linked to actin regulation, cell migration, and blood-vessel growth in laboratory and animal models.",
    halfLife: "Not well characterized in humans.",
    storage:
      "Lyophilized powder is stable refrigerated/frozen; reconstituted, keep refrigerated.",
    commonSideEffects: [
      "Few reported in the community",
      "Injection site irritation",
      "Safety not established by rigorous human trials",
    ],
    dosingReference:
      "Community protocols often describe a weekly loading approach followed by a maintenance amount, expressed in milligrams. None of this is established in controlled human trials. Reference information only, not a dosing instruction.",
    approval:
      "NOT an approved medicine. Research compound; on the WADA prohibited list.",
  },
  {
    name: "Ipamorelin",
    aka: [],
    category: "Growth-hormone secretagogue (ghrelin agonist)",
    summary:
      "A peptide that prompts the body to release its own growth hormone, valued in the community for being relatively selective with fewer off-target effects.",
    goals: [
      { key: "muscle", role: "primary", note: "Stimulates the body's own growth-hormone pulse; used for recovery and body composition." },
      { key: "sleep", role: "secondary", note: "Some users report deeper sleep via increased GH release at night." },
    ],
    evidenceTier: "emerging",
    mechanism:
      "Selectively activates the ghrelin/GH-secretagogue receptor, triggering a pulse of growth hormone from the pituitary.",
    halfLife: "Roughly 2 hours.",
    storage:
      "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate and use within weeks.",
    commonSideEffects: [
      "Headache",
      "Flushing",
      "Lightheadedness",
      "Water retention",
    ],
    dosingReference:
      "Community use describes small microgram amounts once or more daily, often before bed or around training. Not established in approved human dosing. Reference information only, not a dosing instruction.",
    approval:
      "NOT an approved medicine. Research compound; GH secretagogues are on the WADA prohibited list.",
  },
  {
    name: "CJC-1295 without DAC",
    aka: ["Mod GRF 1-29"],
    category: "Growth-hormone-releasing hormone analog",
    summary:
      "A GHRH analog often paired with ipamorelin to amplify natural growth-hormone release. The 'without DAC' version acts in shorter pulses.",
    goals: [
      { key: "muscle", role: "primary", note: "Boosts GH-releasing signal; commonly stacked with ipamorelin for recovery and body composition." },
    ],
    evidenceTier: "emerging",
    mechanism:
      "Mimics GHRH, stimulating the pituitary to release growth hormone; the no-DAC form produces a shorter, more natural pulse.",
    halfLife: "Roughly 30 minutes (no-DAC form).",
    storage:
      "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: [
      "Flushing",
      "Injection site reaction",
      "Headache",
      "Water retention",
    ],
    dosingReference:
      "Community protocols describe small microgram amounts timed with ipamorelin, often around sleep or training. No approved human dosing exists. Reference information only, not a dosing instruction.",
    approval:
      "NOT an approved medicine. Research compound; on the WADA prohibited list.",
  },
  {
    name: "Melanotan 2",
    aka: ["MT2"],
    category: "Melanocortin agonist",
    summary:
      "A peptide that darkens skin pigmentation (tanning). It also suppresses appetite and affects libido — secondary effects that draw some users.",
    goals: [
      { key: "skin-hair", role: "primary", note: "Stimulates melanin for tanning — its best-known effect." },
      { key: "weight-loss", role: "secondary", note: "Appetite suppression is a known side effect, not its purpose." },
      { key: "sexual", role: "secondary", note: "Can increase libido via melanocortin pathways." },
    ],
    evidenceTier: "preclinical",
    mechanism:
      "Activates melanocortin receptors, stimulating melanin production; the same receptor family influences appetite and sexual arousal.",
    halfLife: "Roughly 30+ hours (estimated).",
    storage:
      "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: [
      "Nausea (especially early)",
      "Facial flushing",
      "Darkening of moles and freckles",
      "Spontaneous erections",
      "Appetite loss",
    ],
    dosingReference:
      "Community use describes small microgram amounts, sometimes with an initial loading phase then maintenance. Not an approved medicine and not established in human dosing. Reference information only — and note the safety concerns below.",
    approval:
      "NOT approved. Health regulators (including the FDA and others) have warned against Melanotan products over safety concerns, including effects on moles/melanoma risk. Research compound only.",
  },
  {
    name: "NAD+",
    aka: ["Nicotinamide adenine dinucleotide"],
    category: "Coenzyme",
    summary:
      "A coenzyme central to energy metabolism and cellular repair, used by the longevity community. Levels decline with age; supplementation is an active research area.",
    goals: [
      { key: "longevity", role: "primary", note: "Supports cellular energy and repair pathways; a focus of aging research." },
      { key: "cognitive", role: "secondary", note: "Some users report mental clarity/energy; human evidence is limited." },
    ],
    evidenceTier: "emerging",
    mechanism:
      "Acts as an essential coenzyme in metabolism and as a substrate for repair enzymes (sirtuins, PARPs). Whether injected NAD+ meaningfully raises tissue levels is still studied.",
    halfLife: "Not well characterized for injected NAD+.",
    storage:
      "Refrigerate; protect from light. Reconstituted solutions are sensitive — follow supplier guidance.",
    commonSideEffects: [
      "Flushing or nausea with fast administration",
      "Chest tightness if infused/injected too quickly",
      "Injection site discomfort",
    ],
    dosingReference:
      "Used in the community in a range of milligram amounts, often slowly because rapid administration causes discomfort. Human evidence for injected NAD+ benefits is limited. Reference information only, not a dosing instruction.",
    approval:
      "Not an approved medicine for anti-aging. Sometimes used in clinics (e.g. IV infusions) without broad regulatory approval for these uses.",
  },
  {
    name: "Glutathione",
    aka: ["GSH"],
    category: "Antioxidant tripeptide",
    summary:
      "The body's major antioxidant, used in the community for skin brightening and general 'detox' support. Evidence for injected benefits is mixed.",
    goals: [
      { key: "skin-hair", role: "primary", note: "Popular for skin brightening; human evidence is limited and mixed." },
      { key: "longevity", role: "secondary", note: "Marketed for antioxidant/'detox' support." },
    ],
    evidenceTier: "emerging",
    mechanism:
      "A tripeptide antioxidant that neutralizes free radicals and supports liver detox enzymes. Skin-lightening is attributed to effects on melanin pathways.",
    halfLife: "Short for the reduced form.",
    storage:
      "Refrigerate; protect from light. Reconstituted solutions oxidize — use promptly.",
    commonSideEffects: [
      "Generally well tolerated",
      "Injection site discomfort",
      "Rare allergic reactions",
    ],
    dosingReference:
      "Used in a range of milligram amounts in clinic and community settings. Evidence for injected skin or health benefits is limited. Reference information only, not a dosing instruction.",
    approval:
      "Not broadly approved for skin-lightening or anti-aging; available in some compounding/clinic contexts.",
  },
];

// ------------------------------------------------------------
// Query helpers — used by the page (and later goal-stacks +
// benchmarking) so everyone reads from one source.
// ------------------------------------------------------------

// All entries that list a given goal, split into primary/secondary,
// each sorted by evidence strength (best first).
const TIER_RANK = {
  approved: 0,
  strong: 1,
  emerging: 2,
  preclinical: 3,
  anecdotal: 4,
};

export function entriesForGoal(goalKey) {
  const matches = [];
  for (const entry of ENTRIES) {
    const tag = entry.goals.find((g) => g.key === goalKey);
    if (tag) matches.push({ entry, role: tag.role, note: tag.note });
  }
  matches.sort((a, b) => {
    if (a.role !== b.role) return a.role === "primary" ? -1 : 1;
    return TIER_RANK[a.entry.evidenceTier] - TIER_RANK[b.entry.evidenceTier];
  });
  return matches;
}

export function entryByName(name) {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return (
    ENTRIES.find((entry) => entry.name.trim().toLowerCase() === target) || null
  );
}

// Alphabetical list of every entry (for the A–Z browse + Day 18 search).
export function allEntriesSorted() {
  return [...ENTRIES].sort((a, b) => a.name.localeCompare(b.name));
}