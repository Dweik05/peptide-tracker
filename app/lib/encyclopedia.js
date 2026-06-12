// ============================================================
// ENCYCLOPEDIA DATA  —  goes in:  app/lib/encyclopedia.js
// (v3 — FULL REPLACEMENT of v2. This is Chunk 1 of Day 18.)
//
// What's new in v3:
//   - Every entry gains pros[], cons[], and sources[].
//       * pros/cons are FACTUAL ATTRIBUTES, never verdicts:
//         an evidence point, a practical note, a cost, a risk,
//         a legal status — things a reader can verify. No
//         "worth it" / "skip it" editorializing.
//       * sources are real references. To guarantee no broken
//         links, each URL is a STABLE SEARCH link (PubMed term
//         search, DailyMed, or ClinicalTrials.gov search) and
//         the specific trial/document is named in the label.
//         A pre-launch pass can pin exact DOIs; search links
//         never 404 and always surface the real literature.
//   - 23 full entries (was 10) + ~67 long-tail stubs.
//   - Stubs carry the full field shape (goals[] and
//     commonSideEffects[] are always present), so the existing
//     page renders them without crashing — meaning THIS FILE
//     IS SAFE TO COMMIT ON ITS OWN. The richer pros/cons/
//     sources rendering + search arrive in Chunk 2.
//
// ⚠️ Legal framing unchanged (lawyer checklist item #3): all
// dosing stays in `dosingReference` as background, never an
// instruction. This file is the single review point.
// ============================================================

// ---- evidence tiers: a ranking users can trust ----
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

// Small helper to keep source links tidy.
function pubmed(term) {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`;
}
function dailymed(term) {
  return `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(
    term
  )}`;
}
function trials(term) {
  return `https://clinicaltrials.gov/search?term=${encodeURIComponent(term)}`;
}

// ============================================================
// FULL ENTRIES. `name` MUST match the `full` name in
// peptides.js so cross-links + stack analysis line up.
// ============================================================
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
    storage: "Refrigerate; protect from light. Follow the product's storage instructions.",
    commonSideEffects: ["Nausea", "Diarrhea or constipation", "Vomiting", "Reduced appetite", "Heartburn"],
    pros: [
      "Among the most effective weight-loss medications studied — STEP trials showed roughly 15% average body-weight reduction",
      "Approved and widely prescribed, with a large safety dataset",
      "Once-weekly injection",
      "Also improves blood sugar and several cardiovascular risk markers",
    ],
    cons: [
      "GI side effects (nausea, etc.) common, especially while increasing the dose",
      "Weight tends to return after stopping",
      "Can be costly without insurance coverage",
      "Requires gradual titration over months",
    ],
    sources: [
      { label: "STEP 1 trial — Wilding et al., NEJM 2021", url: pubmed("semaglutide STEP 1 obesity Wilding") },
      { label: "FDA / DailyMed label (Wegovy, Ozempic)", url: dailymed("semaglutide") },
    ],
    dosingReference:
      "In trials and approved labeling, semaglutide for weight management was titrated slowly over months from a low starting amount to a higher maintenance amount to limit nausea. Exact schedules differ by product and indication. Background information, not a dosing instruction.",
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
    storage: "Refrigerate; protect from light. Follow the product's storage instructions.",
    commonSideEffects: ["Nausea", "Diarrhea", "Decreased appetite", "Vomiting", "Constipation"],
    pros: [
      "Produced the largest average weight loss of approved agents in trials — SURMOUNT-1 reached up to ~21%",
      "Dual GIP/GLP-1 mechanism",
      "Approved, with a growing safety dataset",
      "Once-weekly; strong blood-sugar control",
    ],
    cons: [
      "GI side effects common during dose escalation",
      "Weight regain after stopping",
      "Cost without coverage",
      "Months-long titration",
    ],
    sources: [
      { label: "SURMOUNT-1 trial — Jastreboff et al., NEJM 2022", url: pubmed("tirzepatide SURMOUNT-1 obesity Jastreboff") },
      { label: "FDA / DailyMed label (Mounjaro, Zepbound)", url: dailymed("tirzepatide") },
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
    commonSideEffects: ["Nausea", "Diarrhea", "Vomiting", "Decreased appetite", "Constipation"],
    pros: [
      "Phase 2 weight loss among the largest ever reported (~24% at the highest dose over 48 weeks)",
      "Triple-hormone mechanism adds energy expenditure on top of appetite reduction",
      "Once-weekly",
    ],
    cons: [
      "NOT approved — investigational; long-term safety is unknown",
      "Only sold as a research compound; purity and identity are not guaranteed",
      "GI side effects during escalation",
      "No established human dosing",
    ],
    sources: [
      { label: "Phase 2 trial — Jastreboff et al., NEJM 2023", url: pubmed("retatrutide phase 2 obesity Jastreboff") },
      { label: "ClinicalTrials.gov — retatrutide studies", url: trials("retatrutide") },
    ],
    dosingReference:
      "Phase 2 studies explored a range of once-weekly amounts reached through gradual escalation. Because retatrutide is still investigational, no approved dosing exists. A description of published research, not a dosing instruction.",
    approval:
      "NOT APPROVED anywhere — investigational, still in clinical trials. Sold by suppliers as a research compound; not a licensed medicine.",
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
    storage: "Lyophilized powder is stable refrigerated/frozen; reconstituted, refrigerate and use within weeks.",
    commonSideEffects: ["Generally few reported in the community", "Injection site irritation", "Effects and safety not established by rigorous human trials"],
    pros: [
      "Promising tissue-healing and gut-protective effects in animal studies",
      "Generally well tolerated in community reports",
      "Inexpensive",
    ],
    cons: [
      "No quality human trials — benefits are unproven in people",
      "Not an approved medicine; on the WADA banned list",
      "Purity/identity not guaranteed from research suppliers",
      "Long-term safety unknown",
    ],
    sources: [
      { label: "Preclinical literature (animal studies)", url: pubmed("BPC-157 healing") },
    ],
    dosingReference:
      "Community and animal-study reports describe a range of daily amounts, sometimes cited in micrograms per kilogram in animal work. No human dosing has been established in controlled trials. Reference information only, not a dosing instruction.",
    approval: "NOT an approved medicine. Research compound; the WADA prohibited-substances list includes BPC-157.",
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
    mechanism: "Linked to actin regulation, cell migration, and blood-vessel growth in laboratory and animal models.",
    halfLife: "Not well characterized in humans.",
    storage: "Lyophilized powder is stable refrigerated/frozen; reconstituted, keep refrigerated.",
    commonSideEffects: ["Few reported in the community", "Injection site irritation", "Safety not established by rigorous human trials"],
    pros: [
      "Animal studies suggest benefits for recovery and tissue repair",
      "Often well tolerated in community reports",
      "Commonly paired with BPC-157",
    ],
    cons: [
      "No quality human trials",
      "Not approved; on the WADA banned list",
      "Research-supplier purity not guaranteed",
      "Long-term safety unknown",
    ],
    sources: [{ label: "Thymosin Beta-4 research", url: pubmed("thymosin beta-4 tissue repair") }],
    dosingReference:
      "Community protocols often describe a weekly loading approach followed by a maintenance amount, in milligrams. None of this is established in controlled human trials. Reference information only, not a dosing instruction.",
    approval: "NOT an approved medicine. Research compound; on the WADA prohibited list.",
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
    mechanism: "Selectively activates the ghrelin/GH-secretagogue receptor, triggering a pulse of growth hormone from the pituitary.",
    halfLife: "Roughly 2 hours.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate and use within weeks.",
    commonSideEffects: ["Headache", "Flushing", "Lightheadedness", "Water retention"],
    pros: [
      "More selective than older GH secretagogues — fewer off-target effects like big hunger spikes",
      "Stimulates your own GH rather than replacing it",
      "Often stacked with CJC-1295 for a stronger pulse",
    ],
    cons: [
      "Limited human trial evidence",
      "Not an approved medicine; GH secretagogues are WADA-banned",
      "Effects are subtle compared with actual GH",
      "Research-supplier purity not guaranteed",
    ],
    sources: [{ label: "GH-secretagogue research", url: pubmed("ipamorelin growth hormone secretagogue") }],
    dosingReference:
      "Community use describes small microgram amounts once or more daily, often before bed or around training. Not established in approved human dosing. Reference information only, not a dosing instruction.",
    approval: "NOT an approved medicine. Research compound; GH secretagogues are on the WADA prohibited list.",
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
    mechanism: "Mimics GHRH, stimulating the pituitary to release growth hormone; the no-DAC form produces a shorter, more natural pulse.",
    halfLife: "Roughly 30 minutes (no-DAC form).",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Flushing", "Injection site reaction", "Headache", "Water retention"],
    pros: [
      "Synergizes with ipamorelin for a larger, natural-style GH pulse",
      "Short action mimics the body's own rhythm",
      "Widely used and inexpensive",
    ],
    cons: [
      "Limited human trial evidence",
      "Not approved; WADA-banned",
      "Frequent dosing due to short half-life",
      "Research-supplier purity not guaranteed",
    ],
    sources: [{ label: "GHRH-analog research", url: pubmed("CJC-1295 GHRH growth hormone") }],
    dosingReference:
      "Community protocols describe small microgram amounts timed with ipamorelin, often around sleep or training. No approved human dosing exists. Reference information only, not a dosing instruction.",
    approval: "NOT an approved medicine. Research compound; on the WADA prohibited list.",
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
    mechanism: "Activates melanocortin receptors, stimulating melanin production; the same receptor family influences appetite and sexual arousal.",
    halfLife: "Roughly 30+ hours (estimated).",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Nausea (especially early)", "Facial flushing", "Darkening of moles and freckles", "Spontaneous erections", "Appetite loss"],
    pros: [
      "Produces a tan with less sun exposure",
      "Appetite suppression and libido effects draw some users",
      "Long-lasting effect per dose",
    ],
    cons: [
      "NOT approved; regulators have warned against it over safety",
      "Darkens moles and may complicate melanoma monitoring",
      "Nausea and flushing are common",
      "Research-supplier purity not guaranteed",
    ],
    sources: [
      { label: "Melanocortin / Melanotan research", url: pubmed("melanotan II melanocortin") },
      { label: "Regulator safety warnings", url: pubmed("melanotan safety warning") },
    ],
    dosingReference:
      "Community use describes small microgram amounts, sometimes with an initial loading phase then maintenance. Not an approved medicine and not established in human dosing. Reference information only — note the safety concerns above.",
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
    storage: "Refrigerate; protect from light. Reconstituted solutions are sensitive — follow supplier guidance.",
    commonSideEffects: ["Flushing or nausea with fast administration", "Chest tightness if injected too quickly", "Injection site discomfort"],
    pros: [
      "Central to energy metabolism and DNA repair",
      "Active, well-funded research area in aging",
      "Generally tolerated when administered slowly",
    ],
    cons: [
      "Human evidence for injected NAD+ benefits is limited",
      "Fast administration causes flushing/discomfort",
      "Not an approved anti-aging therapy",
      "Can be expensive",
    ],
    sources: [{ label: "NAD+ metabolism & aging research", url: pubmed("NAD+ aging metabolism") }],
    dosingReference:
      "Used in the community in a range of milligram amounts, often slowly because rapid administration causes discomfort. Human evidence for injected NAD+ benefits is limited. Reference information only, not a dosing instruction.",
    approval: "Not an approved medicine for anti-aging. Sometimes used in clinics (e.g. IV infusions) without broad regulatory approval for these uses.",
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
    storage: "Refrigerate; protect from light. Reconstituted solutions oxidize — use promptly.",
    commonSideEffects: ["Generally well tolerated", "Injection site discomfort", "Rare allergic reactions"],
    pros: [
      "The body's main antioxidant",
      "Generally well tolerated",
      "Some evidence for skin-brightening with sustained use",
    ],
    cons: [
      "Injected skin/health benefits have limited, mixed evidence",
      "Effects fade once stopped",
      "Not broadly approved for cosmetic use",
      "Solutions oxidize quickly once mixed",
    ],
    sources: [{ label: "Glutathione & skin research", url: pubmed("glutathione skin lightening") }],
    dosingReference:
      "Used in a range of milligram amounts in clinic and community settings. Evidence for injected skin or health benefits is limited. Reference information only, not a dosing instruction.",
    approval: "Not broadly approved for skin-lightening or anti-aging; available in some compounding/clinic contexts.",
  },

  // ---------------- new full entries (Day 18) ----------------
  {
    name: "PT-141 (Bremelanotide)",
    aka: ["Vyleesi", "Bremelanotide"],
    category: "Melanocortin agonist",
    summary:
      "A melanocortin peptide for sexual desire. The branded version (Vyleesi) is FDA-approved for low sexual desire in some women; used more broadly in the community.",
    goals: [{ key: "sexual", role: "primary", note: "Acts on brain pathways for arousal; FDA-approved (Vyleesi) for HSDD in premenopausal women." }],
    evidenceTier: "approved",
    mechanism: "Activates melanocortin receptors in the brain involved in sexual arousal — a central, not vascular, mechanism.",
    halfLife: "Roughly 2–3 hours.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Nausea", "Facial flushing", "Headache", "Temporary blood-pressure rise", "Injection site reaction"],
    pros: [
      "FDA-approved for one use (Vyleesi), so there is real human trial data",
      "Works centrally — useful when blood-flow drugs (e.g. PDE5 inhibitors) don't help",
      "Used on-demand rather than daily",
    ],
    cons: [
      "Nausea is common",
      "Raises blood pressure transiently — caution with cardiovascular conditions",
      "Community (non-Vyleesi) use is off-label/research-grade",
    ],
    sources: [
      { label: "Bremelanotide trials (RECONNECT)", url: pubmed("bremelanotide hypoactive sexual desire") },
      { label: "FDA / DailyMed label (Vyleesi)", url: dailymed("bremelanotide") },
    ],
    dosingReference:
      "Approved labeling for Vyleesi describes a single on-demand amount before anticipated activity with a daily/monthly cap. Community use of research-grade PT-141 is not standardized. Background information, not a dosing instruction.",
    approval: "FDA-approved as Vyleesi for HSDD in premenopausal women. Research-grade 'PT-141' sold by suppliers is not the approved product.",
  },
  {
    name: "GHK-CU",
    aka: ["Copper Peptide", "GHK-Copper"],
    category: "Copper-binding peptide",
    summary:
      "A naturally occurring copper peptide popular for skin and hair. Best evidence is topical/cosmetic; injectable use is largely anecdotal.",
    goals: [
      { key: "skin-hair", role: "primary", note: "Supports skin remodeling and hair; strongest evidence is for topical use." },
      { key: "healing", role: "secondary", note: "Studied for wound healing and tissue remodeling." },
    ],
    evidenceTier: "emerging",
    mechanism: "Binds copper and influences genes tied to collagen production, tissue remodeling, and wound repair.",
    halfLife: "Short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate. Blue tint is the copper.",
    commonSideEffects: ["Generally well tolerated topically", "Injection site irritation", "Injectable safety less studied"],
    pros: [
      "Real evidence for skin remodeling and collagen — especially topical",
      "Naturally present in the body",
      "Common in cosmetic skincare",
    ],
    cons: [
      "Injectable benefits are largely anecdotal",
      "Excess copper is a theoretical concern with heavy use",
      "Not an approved injectable medicine",
    ],
    sources: [{ label: "GHK-Cu skin & wound research", url: pubmed("GHK-Cu copper peptide skin") }],
    dosingReference:
      "Topical cosmetic products use low concentrations; community injectable use is not standardized. Reference information only, not a dosing instruction.",
    approval: "Used in approved cosmetic/topical products. Injectable GHK-Cu is a research compound, not an approved medicine.",
  },
  {
    name: "MOTS-c",
    aka: [],
    category: "Mitochondrial-derived peptide",
    summary:
      "A peptide encoded in mitochondrial DNA, studied for metabolism and exercise capacity. Human data are early.",
    goals: [
      { key: "longevity", role: "primary", note: "Mitochondrial peptide studied for metabolic health and aging." },
      { key: "weight-loss", role: "secondary", note: "Linked to insulin sensitivity and metabolism in research." },
    ],
    evidenceTier: "preclinical",
    mechanism: "Acts on metabolic regulators (including AMPK) influencing insulin sensitivity and energy use; mostly shown in animal/cell studies.",
    halfLife: "Not well characterized in humans.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Limited human data", "Injection site irritation", "Safety not established by rigorous trials"],
    pros: [
      "Intriguing metabolic and exercise-capacity findings in animals",
      "Tied to a novel mitochondrial mechanism",
    ],
    cons: [
      "Human evidence is very limited",
      "Not approved; research compound",
      "Supplier purity not guaranteed",
    ],
    sources: [{ label: "MOTS-c metabolic research", url: pubmed("MOTS-c mitochondrial metabolism") }],
    dosingReference:
      "Community use describes milligram amounts a few times weekly; no human dosing is established. Reference information only, not a dosing instruction.",
    approval: "NOT approved. Research compound.",
  },
  {
    name: "Tesamorelin",
    aka: ["Egrifta"],
    category: "Growth-hormone-releasing hormone analog",
    summary:
      "A GHRH analog approved to reduce excess abdominal fat in HIV-associated lipodystrophy. Studied for visceral fat more broadly.",
    goals: [
      { key: "weight-loss", role: "primary", note: "Approved to reduce visceral (abdominal) fat in a specific population." },
      { key: "muscle", role: "secondary", note: "Raises GH/IGF-1, of interest for body composition." },
    ],
    evidenceTier: "approved",
    mechanism: "Stimulates the pituitary to release growth hormone, which preferentially reduces visceral fat.",
    halfLife: "Short (minutes); dosed daily.",
    storage: "Refrigerate; follow product storage instructions.",
    commonSideEffects: ["Injection site reactions", "Joint pain", "Swelling", "Raised blood sugar"],
    pros: [
      "FDA-approved with real human trial data",
      "Specifically reduces visceral fat",
      "Raises GH without directly injecting GH",
    ],
    cons: [
      "Approved only for a narrow indication; other uses are off-label",
      "Daily injection",
      "Can raise blood sugar and cause joint symptoms",
      "Expensive",
    ],
    sources: [
      { label: "Tesamorelin lipodystrophy trials — Falutz et al.", url: pubmed("tesamorelin visceral fat lipodystrophy") },
      { label: "FDA / DailyMed label (Egrifta)", url: dailymed("tesamorelin") },
    ],
    dosingReference:
      "Approved labeling describes a daily amount for the approved indication. Background information, not a dosing instruction.",
    approval: "FDA-approved (Egrifta) for HIV-associated lipodystrophy. Other uses are off-label.",
  },
  {
    name: "Sermorelin",
    aka: [],
    category: "Growth-hormone-releasing hormone analog",
    summary:
      "An older GHRH analog that stimulates natural GH release. Historically used in GH-deficiency testing; used in the community for anti-aging/recovery.",
    goals: [
      { key: "muscle", role: "primary", note: "Stimulates natural GH for recovery and body composition." },
      { key: "sleep", role: "secondary", note: "GH release is sleep-linked; some report better sleep." },
    ],
    evidenceTier: "emerging",
    mechanism: "Mimics GHRH, prompting the pituitary to release growth hormone in a natural pulse.",
    halfLife: "Short (~10–20 minutes).",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Injection site reaction", "Flushing", "Headache"],
    pros: [
      "Stimulates your own GH rather than replacing it",
      "Longer real-world track record than newer secretagogues",
      "Often dosed before bed to match natural rhythm",
    ],
    cons: [
      "Limited modern trial evidence for anti-aging use",
      "Not approved for body-composition/anti-aging uses; WADA-banned",
      "Short half-life means precise timing",
    ],
    sources: [{ label: "Sermorelin / GHRH research", url: pubmed("sermorelin growth hormone releasing") }],
    dosingReference:
      "Community use describes microgram amounts before bed. No approved dosing exists for anti-aging uses. Reference information only, not a dosing instruction.",
    approval: "Formerly approved for diagnostic use; community anti-aging use is off-label/research-grade. WADA-banned.",
  },
  {
    name: "Selank",
    aka: [],
    category: "Synthetic peptide (tuftsin analog)",
    summary:
      "A peptide developed in Russia for anxiety, often used intranasally. Human evidence outside Russian studies is limited.",
    goals: [
      { key: "cognitive", role: "primary", note: "Used for anxiety and focus; most data come from Russian studies." },
    ],
    evidenceTier: "emerging",
    mechanism: "Thought to modulate GABA and serotonin systems and immune signalling; mechanism not fully established.",
    halfLife: "Short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Generally well tolerated", "Nasal irritation (intranasal)", "Limited safety data outside Russian studies"],
    pros: [
      "Reported calming/anti-anxiety effects without sedation",
      "Often used intranasally (needle-free)",
      "Generally well tolerated in reports",
    ],
    cons: [
      "Most evidence is from Russian studies, hard to verify",
      "Not approved in North America",
      "Supplier purity not guaranteed",
    ],
    sources: [{ label: "Selank anxiety research", url: pubmed("selank anxiety peptide") }],
    dosingReference:
      "Community use describes microgram-to-milligram amounts intranasally or by injection. No approved Western dosing exists. Reference information only, not a dosing instruction.",
    approval: "Approved/used in Russia; not approved in North America. Research compound here.",
  },
  {
    name: "Semax",
    aka: [],
    category: "Synthetic peptide (ACTH fragment analog)",
    summary:
      "A Russian-developed peptide for cognition and neuroprotection, often used intranasally. Western human evidence is limited.",
    goals: [
      { key: "cognitive", role: "primary", note: "Used for focus, memory, and neuroprotection; mostly Russian data." },
    ],
    evidenceTier: "emerging",
    mechanism: "Thought to raise BDNF and modulate neurotransmitters; precise mechanism not fully established.",
    halfLife: "Short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Generally well tolerated", "Nasal irritation (intranasal)", "Limited safety data outside Russian studies"],
    pros: [
      "Reported focus and mental-clarity effects",
      "Often used intranasally (needle-free)",
      "Studied for neuroprotection in Russia",
    ],
    cons: [
      "Most evidence is from Russian studies, hard to verify",
      "Not approved in North America",
      "Supplier purity not guaranteed",
    ],
    sources: [{ label: "Semax cognition research", url: pubmed("semax cognitive neuroprotection") }],
    dosingReference:
      "Community use describes microgram amounts intranasally. No approved Western dosing exists. Reference information only, not a dosing instruction.",
    approval: "Approved/used in Russia; not approved in North America. Research compound here.",
  },
  {
    name: "Epithalon",
    aka: ["Epitalon", "Epithalone"],
    category: "Synthetic tetrapeptide",
    summary:
      "A peptide studied in Russia for aging and telomere length. Western human evidence is very limited.",
    goals: [
      { key: "longevity", role: "primary", note: "Studied for telomere/aging effects; mostly Russian and animal data." },
      { key: "sleep", role: "secondary", note: "Tied to melatonin/pineal regulation in research." },
    ],
    evidenceTier: "preclinical",
    mechanism: "Thought to influence the pineal gland and telomerase activity; evidence is mostly animal and Russian-clinical.",
    halfLife: "Short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Few reported", "Injection site irritation", "Safety not established by rigorous Western trials"],
    pros: [
      "Intriguing telomere/longevity findings in early studies",
      "Generally well tolerated in reports",
      "Often run in short annual 'cycles'",
    ],
    cons: [
      "Human evidence is very limited and hard to verify",
      "Not approved; research compound",
      "Supplier purity not guaranteed",
    ],
    sources: [{ label: "Epithalon / telomere research", url: pubmed("epithalon telomerase aging") }],
    dosingReference:
      "Community use describes milligram amounts in short cycles. No approved dosing exists. Reference information only, not a dosing instruction.",
    approval: "NOT approved in North America. Research compound.",
  },
  {
    name: "DSIP",
    aka: ["Delta Sleep-Inducing Peptide"],
    category: "Neuropeptide",
    summary:
      "A naturally occurring peptide linked to sleep regulation. Human evidence is old and limited; effects are inconsistent.",
    goals: [{ key: "sleep", role: "primary", note: "Studied for sleep regulation; human evidence is limited and mixed." }],
    evidenceTier: "preclinical",
    mechanism: "A naturally occurring peptide that may influence sleep-regulating and stress pathways; mechanism not well established.",
    halfLife: "Very short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Few reported", "Injection site irritation", "Inconsistent effects"],
    pros: [
      "Occurs naturally in the body",
      "Some users report easier sleep onset",
      "Generally well tolerated in reports",
    ],
    cons: [
      "Human evidence is old, limited, and inconsistent",
      "Not approved; research compound",
      "Very short half-life",
    ],
    sources: [{ label: "DSIP sleep research", url: pubmed("delta sleep inducing peptide") }],
    dosingReference:
      "Community use describes microgram amounts before bed. No approved dosing exists. Reference information only, not a dosing instruction.",
    approval: "NOT approved. Research compound.",
  },
  {
    name: "Melanotan 1",
    aka: ["MT1", "Afamelanotide", "Scenesse"],
    category: "Melanocortin agonist",
    summary:
      "A tanning peptide; the branded implant (Scenesse/afamelanotide) is approved for a rare light-sensitivity disorder. More selective than MT2.",
    goals: [{ key: "skin-hair", role: "primary", note: "Stimulates melanin for tanning/photoprotection; approved form treats a rare disorder." }],
    evidenceTier: "approved",
    mechanism: "Activates melanocortin-1 receptors to stimulate melanin; more receptor-selective than MT2, so fewer appetite/libido effects.",
    halfLife: "Short (the approved product is a slow-release implant).",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Nausea (milder than MT2)", "Facial flushing", "Darkening of moles/freckles"],
    pros: [
      "More selective than MT2 — fewer appetite/libido side effects",
      "Approved form (Scenesse) has real trial data for a rare disorder",
      "Provides photoprotection via melanin",
    ],
    cons: [
      "Community injectable use is off-label/research-grade",
      "Still darkens moles — melanoma monitoring matters",
      "Research-supplier purity not guaranteed",
    ],
    sources: [
      { label: "Afamelanotide trials (EPP)", url: pubmed("afamelanotide erythropoietic protoporphyria") },
      { label: "FDA / DailyMed label (Scenesse)", url: dailymed("afamelanotide") },
    ],
    dosingReference:
      "The approved product is a controlled-release implant placed by a clinician. Research-grade 'MT1' community use is not standardized. Background information, not a dosing instruction.",
    approval: "Approved as Scenesse (afamelanotide) for a rare disorder (EPP). Research-grade injectable use is off-label.",
  },
  {
    name: "AOD9604",
    aka: [],
    category: "Growth-hormone fragment",
    summary:
      "A fragment of growth hormone marketed for fat loss. Human trials were largely disappointing for weight loss.",
    goals: [{ key: "weight-loss", role: "primary", note: "Marketed for fat metabolism, but human weight-loss trials were unimpressive." }],
    evidenceTier: "emerging",
    mechanism: "A modified GH fragment intended to stimulate fat breakdown without GH's blood-sugar effects.",
    halfLife: "Short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Generally well tolerated", "Injection site irritation"],
    pros: [
      "Generally well tolerated in studies",
      "Designed to avoid GH's blood-sugar downsides",
    ],
    cons: [
      "Human weight-loss trials were largely disappointing",
      "Not an approved weight-loss medicine",
      "Supplier purity not guaranteed",
    ],
    sources: [{ label: "AOD9604 fat-loss research", url: pubmed("AOD9604 obesity fat") }],
    dosingReference:
      "Community use describes microgram amounts daily. No approved dosing exists. Reference information only, not a dosing instruction.",
    approval: "NOT approved as a medicine (has held food-additive status in some contexts). Research compound for injection.",
  },
  {
    name: "HGH Fragment 176-191",
    aka: ["Frag 176-191", "Lipolytic fragment"],
    category: "Growth-hormone fragment",
    summary:
      "A GH fragment marketed specifically for fat loss. Like AOD9604, human evidence is weak.",
    goals: [{ key: "weight-loss", role: "primary", note: "Marketed for targeted fat loss; human evidence is weak." }],
    evidenceTier: "preclinical",
    mechanism: "The fat-loss portion of the GH molecule, intended to promote fat breakdown without GH's growth effects.",
    halfLife: "Short.",
    storage: "Lyophilized powder refrigerated/frozen; reconstituted, refrigerate.",
    commonSideEffects: ["Generally well tolerated", "Injection site irritation"],
    pros: [
      "Aims for fat loss without GH's growth/blood-sugar effects",
      "Generally well tolerated in reports",
    ],
    cons: [
      "Little quality human evidence",
      "Not an approved medicine",
      "Supplier purity not guaranteed",
    ],
    sources: [{ label: "GH fragment fat-loss research", url: pubmed("HGH fragment 176-191 lipolysis") }],
    dosingReference:
      "Community use describes microgram amounts, often fasted. No approved dosing exists. Reference information only, not a dosing instruction.",
    approval: "NOT approved. Research compound.",
  },
  {
    name: "Cagrilintide",
    aka: [],
    category: "Long-acting amylin analog",
    summary:
      "An amylin-analog appetite regulator, studied for weight loss — especially combined with semaglutide (as CagriSema). Still investigational.",
    goals: [{ key: "weight-loss", role: "primary", note: "Amylin analog that curbs appetite; strong trial interest, especially with semaglutide." }],
    evidenceTier: "strong",
    mechanism: "Mimics amylin, a hormone that promotes fullness and slows gastric emptying — complementary to GLP-1 drugs.",
    halfLife: "Long (once-weekly dosing in trials).",
    storage: "Handle and store per supplier guidance; protect from light and heat.",
    commonSideEffects: ["Nausea", "Reduced appetite", "GI effects", "Injection site reaction"],
    pros: [
      "Promising Phase 2 weight loss, especially combined with semaglutide",
      "Different mechanism (amylin) that complements GLP-1 drugs",
      "Once-weekly",
    ],
    cons: [
      "NOT approved — still investigational",
      "Research-supplier purity not guaranteed",
      "GI side effects similar to GLP-1 drugs",
    ],
    sources: [
      { label: "Cagrilintide / CagriSema trials", url: pubmed("cagrilintide semaglutide obesity") },
      { label: "ClinicalTrials.gov — cagrilintide", url: trials("cagrilintide") },
    ],
    dosingReference:
      "Trials explored once-weekly amounts, often escalated and frequently paired with semaglutide. No approved dosing exists. Background information, not a dosing instruction.",
    approval: "NOT approved — investigational. Research compound.",
  },
];

// ============================================================
// LONG-TAIL STUBS. Minimal but full-shape (goals[] and
// commonSideEffects[] always present) so the page never
// crashes on them. Detailed entries can be promoted later.
// ============================================================
const STUB = (name, category, summary, goals, evidenceTier, approval, aka = []) => ({
  name, aka, category, summary, goals, evidenceTier, approval,
  commonSideEffects: [], isStub: true,
});

const STUBS = [
  STUB("BPC-157 + TB-500 Blend", "Healing blend", "A popular recovery blend combining BPC-157 and TB-500 — see each component's full entry.", [{ key: "healing", role: "primary", note: "Combined healing/recovery blend." }], "preclinical", "Not approved; research blend."),
  STUB("BPC-157 + GHK-CU + TB-500 Blend", "Healing/skin blend", "Often sold as 'GLOW'. Combines BPC-157, GHK-Cu, and TB-500 — see each component.", [{ key: "healing", role: "primary", note: "Recovery blend." }, { key: "skin-hair", role: "secondary", note: "GHK-Cu adds skin support." }], "preclinical", "Not approved; research blend.", ["GLOW"]),
  STUB("BPC-157 + GHK-CU + TB-500 + KPV Blend", "Healing/anti-inflammatory blend", "Often sold as 'KLOW'. Adds KPV to the GLOW blend — see each component.", [{ key: "healing", role: "primary", note: "Recovery + anti-inflammatory blend." }, { key: "skin-hair", role: "secondary", note: "GHK-Cu adds skin support." }], "preclinical", "Not approved; research blend.", ["KLOW"]),
  STUB("Cagrilintide + Semaglutide Blend", "Weight-loss blend", "Amylin analog + GLP-1 (a.k.a. CagriSema). See Cagrilintide and Semaglutide.", [{ key: "weight-loss", role: "primary", note: "Combined appetite-regulating blend." }], "strong", "Investigational blend; not approved.", ["CagriSema"]),
  STUB("Retatrutide + Cagrilintide Blend", "Weight-loss blend", "Triple agonist + amylin analog. See Retatrutide and Cagrilintide.", [{ key: "weight-loss", role: "primary", note: "Combined weight-loss blend." }], "strong", "Investigational blend; not approved."),
  STUB("Semax + Selank Blend", "Cognitive blend", "Combines Semax and Selank for focus + calm. See each component.", [{ key: "cognitive", role: "primary", note: "Combined focus/anti-anxiety blend." }], "emerging", "Not approved in North America; research blend."),
  STUB("CJC-1295 (no DAC) + Ipamorelin Blend", "GH blend", "The classic GH-pulse stack. See CJC-1295 without DAC and Ipamorelin.", [{ key: "muscle", role: "primary", note: "Growth-hormone pulse blend." }], "emerging", "Not approved; WADA-banned components."),
  STUB("CJC-1295 with DAC", "GHRH analog (long-acting)", "A longer-acting GHRH analog (DAC extends its life), giving a steadier GH rise than the no-DAC form.", [{ key: "muscle", role: "primary", note: "Long-acting GH-releasing analog." }], "emerging", "Not approved; WADA-banned."),
  STUB("Survodutide", "GLP-1 / glucagon dual agonist", "An investigational dual agonist for weight loss and liver disease, in clinical trials.", [{ key: "weight-loss", role: "primary", note: "Dual-hormone agonist in trials." }], "strong", "Investigational; not approved."),
  STUB("Liraglutide", "GLP-1 receptor agonist", "An older daily GLP-1 medication, approved for diabetes (Victoza) and weight (Saxenda).", [{ key: "weight-loss", role: "primary", note: "Approved daily GLP-1 for weight management." }], "approved", "FDA/Health-Canada approved (Saxenda/Victoza).", ["Saxenda", "Victoza"]),
  STUB("Lemon Bottle", "Lipolytic injection", "A 'fat-dissolving' cosmetic injection blend used in localized areas. Evidence is largely anecdotal.", [{ key: "weight-loss", role: "secondary", note: "Localized fat-dissolving injection, not systemic weight loss." }], "anecdotal", "Not an approved medicine; cosmetic use varies by region."),
  STUB("L-Carnitine", "Amino-acid derivative", "Involved in fat metabolism; used as a supplement and injection for fat loss/energy. Evidence is mixed.", [{ key: "weight-loss", role: "secondary", note: "Supports fat metabolism; mixed evidence." }], "emerging", "Available as a supplement; injectable use not broadly approved."),
  STUB("5-Amino-1MQ", "NNMT inhibitor", "A small molecule studied for fat metabolism by blocking the NNMT enzyme. Early research.", [{ key: "weight-loss", role: "secondary", note: "Studied for fat metabolism; early research." }], "preclinical", "Not approved; research compound."),
  STUB("Adipotide", "Experimental peptide", "An experimental fat-targeting peptide (FTPP) studied in animals; raised safety concerns.", [{ key: "weight-loss", role: "primary", note: "Experimental fat-targeting peptide; animal data only." }], "preclinical", "Not approved; research compound with safety concerns."),
  STUB("Lipo-C", "Lipotropic blend", "A 'fat-burning' injection of methionine, inositol, choline, carnitine and B-vitamins. Evidence is limited.", [{ key: "weight-loss", role: "primary", note: "Lipotropic support blend; limited evidence." }], "anecdotal", "Compounded/clinic use; not a standardized approved medicine."),
  STUB("Lipo-C Fat Blaster", "Lipotropic blend", "A stronger lipotropic injection blend (carnitine, methionine, inositol, choline, B-vitamins, NADH).", [{ key: "weight-loss", role: "primary", note: "Lipotropic support blend; limited evidence." }], "anecdotal", "Compounded/clinic use; not a standardized approved medicine."),
  STUB("L-Carnitine + B-Vitamin Blend (LC216)", "Lipotropic blend", "A carnitine + amino-acid + B-vitamin injection blend for metabolism/energy.", [{ key: "weight-loss", role: "secondary", note: "Metabolism/energy support blend." }], "anecdotal", "Compounded/clinic use; not a standardized approved medicine."),
  STUB("Hexarelin Acetate", "GH secretagogue", "A potent GH-releasing peptide; less selective than ipamorelin, with more potential side effects.", [{ key: "muscle", role: "secondary", note: "Potent GH release for recovery/body composition." }], "preclinical", "Not approved; WADA-banned."),
  STUB("IGF-1 LR3", "Insulin-like growth factor analog", "A long-acting IGF-1 used in the community for muscle growth. Potent and risky; little human safety data.", [{ key: "muscle", role: "primary", note: "Directly anabolic; potent and risky." }], "anecdotal", "Not approved; WADA-banned. Hypoglycemia risk."),
  STUB("MGF", "Mechano growth factor", "An IGF-1 splice variant tied to local muscle repair. Animal/lab research only.", [{ key: "muscle", role: "primary", note: "Local muscle-repair factor; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("PEG MGF", "Pegylated MGF", "A longer-lasting (pegylated) version of MGF used in muscle stacks. Preclinical only.", [{ key: "muscle", role: "primary", note: "Longer-acting MGF; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("ACE-031", "Myostatin inhibitor (ActRIIB)", "An experimental muscle-growth agent that blocks myostatin. Human trials were halted over safety.", [{ key: "muscle", role: "secondary", note: "Myostatin-pathway muscle growth; trials halted." }], "preclinical", "Not approved; trials discontinued."),
  STUB("Super Human Blend (SHB)", "Amino-acid blend", "An injectable amino-acid blend (arginine, ornithine, citrulline, etc.) marketed for performance/recovery.", [{ key: "muscle", role: "secondary", note: "Amino-acid support blend." }], "anecdotal", "Compounded/clinic use; not a standardized approved medicine."),
  STUB("Kisspeptin-10", "Reproductive hormone peptide", "A peptide that stimulates reproductive hormone release; studied for fertility and libido.", [{ key: "sexual", role: "primary", note: "Stimulates reproductive hormones; emerging data." }], "emerging", "Research compound; not an approved medicine."),
  STUB("Gonadorelin Acetate", "GnRH", "A gonadotropin-releasing hormone used for fertility and hormone testing; community use supports testosterone.", [{ key: "sexual", role: "primary", note: "Supports natural hormone production." }], "approved", "Approved for certain diagnostic/fertility uses; other uses off-label."),
  STUB("HCG", "Human chorionic gonadotropin", "A hormone used for fertility and to maintain testosterone/testicular function, e.g. alongside TRT.", [{ key: "sexual", role: "primary", note: "Supports testosterone/fertility." }], "approved", "Approved for fertility uses; TRT-adjunct use is common/off-label."),
  STUB("HMG", "Menotropins", "A gonadotropin (FSH/LH) preparation used in fertility treatment.", [{ key: "sexual", role: "primary", note: "Fertility hormone support." }], "approved", "Approved for fertility treatment."),
  STUB("Oxytocin Acetate", "Neuropeptide hormone", "The 'bonding' hormone; an approved drug for labor, explored for social/mood and intimacy effects.", [{ key: "sexual", role: "secondary", note: "Bonding/intimacy effects." }, { key: "cognitive", role: "secondary", note: "Studied for social/mood effects." }], "approved", "Approved for obstetric use; other uses are experimental."),
  STUB("Thymosin Alpha-1", "Immune peptide", "An immune-modulating peptide approved in some countries (Zadaxin) for infections/immune support.", [{ key: "healing", role: "primary", note: "Immune support; approved abroad." }], "emerging", "Approved in some countries (Zadaxin); not FDA-approved.", ["Zadaxin"]),
  STUB("Thymalin", "Immune bioregulator", "A thymus-derived peptide used in Russia for immune regulation. Limited Western data.", [{ key: "healing", role: "secondary", note: "Immune regulation; limited Western data." }, { key: "longevity", role: "primary", note: "Marketed for immune aging." }], "preclinical", "Not approved in North America; research compound."),
  STUB("KPV", "Anti-inflammatory tripeptide", "A fragment of alpha-MSH with anti-inflammatory effects, used for gut and skin inflammation.", [{ key: "healing", role: "primary", note: "Anti-inflammatory; gut/skin focus." }], "preclinical", "Not approved; research compound."),
  STUB("ARA-290", "Tissue-protective peptide", "Also called cibinetide; studied for neuropathic pain and inflammation in trials.", [{ key: "healing", role: "primary", note: "Anti-inflammatory/neuropathic; in trials." }], "emerging", "Investigational; not approved.", ["Cibinetide"]),
  STUB("VIP", "Vasoactive intestinal peptide", "A signalling peptide studied for inflammation/immune and respiratory conditions (e.g. nasal use for CIRS).", [{ key: "healing", role: "primary", note: "Anti-inflammatory/immune; emerging use." }], "emerging", "Research/experimental; not broadly approved."),
  STUB("TB-500 Fragment", "Thymosin Beta-4 fragment", "An active fragment of the TB-500 molecule used for recovery. Preclinical only.", [{ key: "healing", role: "primary", note: "Recovery fragment; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("AHK-CU", "Copper peptide", "A copper tripeptide marketed mainly for hair growth and skin. Mostly cosmetic/topical evidence.", [{ key: "skin-hair", role: "primary", note: "Hair/skin support; mostly topical evidence." }], "anecdotal", "Cosmetic use; injectable use is research-grade."),
  STUB("Matrixyl", "Cosmetic peptide", "A collagen-stimulating peptide used in topical anti-aging skincare.", [{ key: "skin-hair", role: "primary", note: "Topical collagen support." }], "anecdotal", "Cosmetic ingredient; not an injectable medicine."),
  STUB("Snap-8", "Cosmetic peptide", "A peptide marketed to soften expression lines (a topical 'Botox-like' cosmetic).", [{ key: "skin-hair", role: "primary", note: "Topical expression-line cosmetic." }], "anecdotal", "Cosmetic ingredient; not an injectable medicine."),
  STUB("Hyaluronic Acid", "Glycosaminoglycan", "A moisture-binding molecule used in skincare, dermal fillers, and joint injections.", [{ key: "skin-hair", role: "primary", note: "Hydration/skin and joint uses." }], "approved", "Approved in various medical/cosmetic products."),
  STUB("Epithalon Variant — N-Acetyl Epitalon Amidate", "Modified tetrapeptide", "A modified, possibly more stable form of Epithalon. Same longevity framing; little human data.", [{ key: "longevity", role: "primary", note: "Epithalon-style longevity; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("FOXO4", "Senolytic peptide", "Usually FOXO4-DRI; an experimental senolytic that targets aged ('senescent') cells. Animal research.", [{ key: "longevity", role: "primary", note: "Experimental senolytic; animal data." }], "preclinical", "Not approved; research compound.", ["FOXO4-DRI"]),
  STUB("Humanin", "Mitochondrial-derived peptide", "A mitochondrial peptide studied for cytoprotection and metabolic/aging effects. Early research.", [{ key: "longevity", role: "primary", note: "Cytoprotective mitochondrial peptide; early research." }], "preclinical", "Not approved; research compound."),
  STUB("P21", "Neurogenic peptide", "A Cerebrolysin-derived peptide studied for promoting new neuron growth. Preclinical.", [{ key: "cognitive", role: "primary", note: "Neurogenesis; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("PNC-27", "Experimental peptide", "An experimental peptide studied for selectively destroying cancer cells in the lab. Preclinical.", [{ key: "longevity", role: "primary", note: "Experimental anti-cancer; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Pinealon", "Peptide bioregulator", "A short peptide bioregulator marketed for brain function and aging. Mostly Russian/preclinical data.", [{ key: "cognitive", role: "primary", note: "Brain bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Cerebrolysin", "Neuropeptide preparation", "A mixture of neuropeptides studied for stroke and dementia recovery; used medically in some countries.", [{ key: "cognitive", role: "primary", note: "Neuroprotection/recovery; used abroad." }], "emerging", "Approved/used in some countries; not FDA-approved."),
  STUB("NA Selank Amidate", "Selank variant", "A modified, amidated form of Selank intended for greater stability. Same anxiety/focus framing.", [{ key: "cognitive", role: "primary", note: "Selank-style anxiety/focus; limited data." }], "anecdotal", "Not approved in North America; research compound."),
  STUB("Adamax", "Cognitive peptide", "A Semax-related peptide marketed for focus and mood. Largely anecdotal.", [{ key: "cognitive", role: "primary", note: "Semax-style focus/mood; anecdotal." }], "anecdotal", "Not approved; research compound."),
  STUB("PE 22-28", "Spadin-analog peptide", "An experimental peptide (spadin analog) studied as a fast-acting antidepressant. Animal research.", [{ key: "cognitive", role: "primary", note: "Experimental antidepressant; animal data." }], "preclinical", "Not approved; research compound."),
  STUB("Melatonin", "Hormone", "The body's sleep hormone, widely used as a sleep-onset aid.", [{ key: "sleep", role: "primary", note: "Sleep-onset aid; widely used." }], "approved", "Available OTC in many regions; injectable use is uncommon."),
  STUB("Vilon", "Peptide bioregulator (Lys-Glu)", "A short peptide bioregulator marketed for immune/aging support. Russian/preclinical data.", [{ key: "longevity", role: "primary", note: "Immune/aging bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Testagen", "Peptide bioregulator", "A peptide bioregulator marketed for reproductive/hormonal aging support. Preclinical.", [{ key: "longevity", role: "primary", note: "Reproductive-aging bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Bronchogen", "Peptide bioregulator", "A bronchial/lung peptide bioregulator (Khavinson peptides line). Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Lung bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Cardiogen", "Peptide bioregulator", "A heart/cardiovascular peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Cardiac bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Cortagen", "Peptide bioregulator", "A brain/nervous-system peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Brain bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Livagen", "Peptide bioregulator", "A liver peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Liver bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Pancragen", "Peptide bioregulator", "A pancreas peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Pancreas bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Prostamax", "Peptide bioregulator", "A prostate peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Prostate bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Cartalax", "Peptide bioregulator", "A cartilage/connective-tissue peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Cartilage bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Chonluten", "Peptide bioregulator", "A lung/bronchial epithelium peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Lung bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Crystagen", "Peptide bioregulator", "An immune-system peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Immune bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Ovagen", "Peptide bioregulator", "A liver/immune peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Liver/immune bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Vesugen", "Peptide bioregulator", "A vascular peptide bioregulator. Preclinical/Russian data.", [{ key: "longevity", role: "primary", note: "Vascular bioregulator; preclinical." }], "preclinical", "Not approved; research compound."),
  STUB("Teriparatide", "Parathyroid hormone analog", "An approved osteoporosis medicine that builds bone (Forteo).", [], "approved", "FDA-approved for osteoporosis (Forteo).", ["Forteo"]),
  STUB("EPO", "Erythropoietin", "An approved hormone for anemia that raises red-blood-cell production; misused in endurance sport.", [{ key: "muscle", role: "secondary", note: "Boosts oxygen-carrying capacity; WADA-banned." }], "approved", "Approved for anemia; WADA-banned for performance use."),
  STUB("Hair Skin & Nails Blend (HHB)", "Vitamin blend", "An injectable B-vitamin/biotin blend marketed for hair, skin, and nails.", [{ key: "skin-hair", role: "primary", note: "Vitamin support for hair/skin/nails." }], "anecdotal", "Compounded/clinic vitamin blend; not a standardized medicine."),
  STUB("B12 (Methylcobalamin)", "Vitamin", "Injectable vitamin B12, used for deficiency and energy.", [], "approved", "Approved for B12 deficiency; energy claims beyond that are unproven."),
  STUB("SS-31", "Mitochondrial-targeted peptide", "Also called elamipretide; a mitochondria-protecting peptide studied in trials for various conditions.", [{ key: "longevity", role: "primary", note: "Mitochondrial protection; in trials." }], "emerging", "Investigational; not approved.", ["Elamipretide"]),
];

// Merge full entries + stubs into one list the app reads.
for (const stub of STUBS) ENTRIES.push(stub);

// ============================================================
// Query helpers (read by the page, My Stack, and benchmarking).
// ============================================================
const TIER_RANK = { approved: 0, strong: 1, emerging: 2, preclinical: 3, anecdotal: 4 };

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
  return ENTRIES.find((entry) => entry.name.trim().toLowerCase() === target) || null;
}

export function allEntriesSorted() {
  return [...ENTRIES].sort((a, b) => a.name.localeCompare(b.name));
}

// Simple text search over name, aka, category, summary (Day 18).
export function searchEntries(query) {
  const q = query.trim().toLowerCase();
  if (!q) return allEntriesSorted();
  return allEntriesSorted().filter((entry) => {
    const haystack = [
      entry.name,
      entry.category || "",
      entry.summary || "",
      ...(entry.aka || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

// Given the peptides a user is on, what does the combination target?
export function analyzeStack(names) {
  const known = [];
  const unknown = [];

  for (const raw of names || []) {
    if (!raw) continue;
    const entry = entryByName(raw);
    if (entry) {
      if (!known.find((k) => k.name === entry.name)) known.push(entry);
    } else {
      const cleaned = raw.trim();
      if (cleaned && !unknown.find((u) => u.toLowerCase() === cleaned.toLowerCase())) {
        unknown.push(cleaned);
      }
    }
  }

  const goalMap = {};
  for (const entry of known) {
    for (const tag of entry.goals) {
      if (!goalMap[tag.key]) goalMap[tag.key] = { key: tag.key, primary: [], secondary: [] };
      if (tag.role === "primary") goalMap[tag.key].primary.push(entry.name);
      else goalMap[tag.key].secondary.push(entry.name);
    }
  }

  const targets = Object.values(goalMap);
  targets.sort(
    (a, b) => b.primary.length - a.primary.length || b.secondary.length - a.secondary.length
  );

  return { known, unknown, targets };
}