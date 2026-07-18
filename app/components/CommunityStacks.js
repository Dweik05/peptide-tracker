"use client";

// ============================================================
// COMMUNITY STACKS  —  goes in:  app/components/CommunityStacks.js
//
// A reference library of the named peptide "stacks" people talk about online
// (Wolverine, Glow, KLOW, CagriSema...) — what each contains and the goals it's
// commonly associated with.
//
// Every peptide name below is written to EXACTLY match an entry name in
// app/lib/encyclopedia.js, so the chips can click through to the real detail
// page. If a name ever stops matching, that chip simply renders as plain text
// instead of a dead link (checked via entryByName), so this can never break.
//
// Several of these combinations also exist as their own blend entry in the
// encyclopedia — those cards get a "View the combined entry" link too.
//
// Intentionally lists NO doses — appropriate dosing is individual, and leaving
// it out keeps this clearly reference material rather than a recommendation.
//
// Props:
//   onOpenEntry(name) — optional. When provided, chips become buttons that
//                       open that encyclopedia entry. Without it, the
//                       component still renders fine as a plain list.
//
// To add a stack, just add an object to COMMUNITY_STACKS below.
// ============================================================

import { GOALS, entryByName } from "../lib/encyclopedia";

const COMMUNITY_STACKS = [
  {
    name: "Wolverine",
    aka: [],
    contains: ["BPC-157", "TB-500"],
    goals: ["healing"],
    blendEntry: "BPC-157 + TB-500 Blend",
    summary:
      "The classic recovery pairing, named for the comic character's healing factor. The two most-discussed repair peptides run together, usually around injury or heavy training.",
  },
  {
    name: "Glow",
    aka: ["GLOW"],
    contains: ["GHK-CU", "BPC-157", "TB-500"],
    goals: ["skin-hair", "healing"],
    blendEntry: "BPC-157 + GHK-CU + TB-500 Blend",
    summary:
      "The Wolverine base plus GHK-CU, a copper peptide associated with skin, hair, and collagen. Named for the aesthetic 'glow' angle layered on top of recovery.",
  },
  {
    name: "KLOW",
    aka: [],
    contains: ["KPV", "BPC-157", "GHK-CU", "TB-500"],
    goals: ["healing", "skin-hair"],
    blendEntry: "BPC-157 + GHK-CU + TB-500 + KPV Blend",
    summary:
      "Glow with KPV added — a peptide associated with inflammation and gut support. The letters are the four components, and it's the most 'everything' of the healing blends.",
  },
  {
    name: "CJC-1295 + Ipamorelin",
    aka: ["The GH stack"],
    contains: ["CJC-1295 without DAC", "Ipamorelin"],
    goals: ["muscle", "sleep"],
    blendEntry: "CJC-1295 (no DAC) + Ipamorelin Blend",
    summary:
      "The best-known growth-hormone pairing — a GHRH (CJC-1295) with a GHRP (Ipamorelin), used together because they act on two different parts of the same pathway. Commonly associated with recovery, sleep, and body composition.",
  },
  {
    name: "Semax + Selank",
    aka: ["The nootropic stack"],
    contains: ["Semax", "Selank"],
    goals: ["cognitive"],
    blendEntry: "Semax + Selank Blend",
    summary:
      "The go-to cognitive pairing: Semax for focus and clarity, Selank for calm — the idea being one balances the other. Both are usually used intranasally.",
  },
  {
    name: "CagriSema",
    aka: ["Cagrilintide + Semaglutide"],
    contains: ["Cagrilintide", "Semaglutide"],
    goals: ["weight-loss"],
    blendEntry: "Cagrilintide + Semaglutide Blend",
    summary:
      "An amylin analog paired with a GLP-1 — two different appetite pathways at once. This one is also a real investigational drug combination being studied in trials, not just a community stack.",
  },
  {
    name: "Reta + Cagri",
    aka: ["Retatrutide + Cagrilintide"],
    contains: ["Retatrutide", "Cagrilintide"],
    goals: ["weight-loss"],
    blendEntry: "Retatrutide + Cagrilintide Blend",
    summary:
      "The triple agonist stacked with an amylin analog — the most aggressive of the weight-loss combinations discussed online. Both components are investigational, not approved.",
  },
  {
    name: "Tesamorelin + Ipamorelin",
    aka: [],
    contains: ["Tesamorelin", "Ipamorelin"],
    goals: ["weight-loss", "muscle"],
    blendEntry: null,
    summary:
      "A GHRH known in research for reducing visceral fat, paired with Ipamorelin. Talked about for body composition rather than pure weight loss.",
  },
  {
    name: "Melanotan 2 + PT-141",
    aka: [],
    contains: ["Melanotan 2", "PT-141 (Bremelanotide)"],
    goals: ["skin-hair", "sexual"],
    blendEntry: null,
    summary:
      "Two melanocortin peptides run together — Melanotan 2 for tanning, PT-141 for libido. They act on the same receptor family, which is why their effects overlap.",
  },
  {
    name: "Epithalon",
    aka: ["Epitalon"],
    contains: ["Epithalon"],
    goals: ["longevity", "sleep"],
    blendEntry: null,
    summary:
      "Not a stack so much as a standalone the longevity crowd runs in short cycles a couple of times a year. Included here because it comes up constantly in stack discussions.",
  },
];

function goalLabel(key) {
  const goal = GOALS.find((g) => g.key === key);
  return goal ? `${goal.icon} ${goal.label}` : key;
}

// A peptide chip. Clickable when the name resolves to a real encyclopedia
// entry AND a handler was passed; otherwise it's plain text.
function PeptideChip({ name, onOpenEntry }) {
  const exists = Boolean(entryByName(name));

  if (!exists || !onOpenEntry) {
    return (
      <span className="text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1">
        {name}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenEntry(name)}
      className="text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1 hover:border-emerald-500/40 hover:text-white transition-colors"
    >
      {name} →
    </button>
  );
}

export default function CommunityStacks({ onOpenEntry }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">👥 Community stacks</h2>
        <p className="text-slate-400 mt-1 text-sm">
          The named peptide combinations you'll see discussed online — what each
          one actually contains and the goals it's associated with. Tap any
          peptide to read its full entry.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COMMUNITY_STACKS.map((stack) => {
          const blend = stack.blendEntry ? entryByName(stack.blendEntry) : null;
          return (
            <div
              key={stack.name}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-white">
                  {stack.name}
                </h3>
                <span className="text-xs text-slate-500 shrink-0">
                  {stack.contains.length}{" "}
                  {stack.contains.length === 1 ? "peptide" : "peptides"}
                </span>
              </div>

              {stack.aka.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Also called: {stack.aka.join(", ")}
                </p>
              )}

              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                {stack.summary}
              </p>

              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-2">
                Contains
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stack.contains.map((name) => (
                  <PeptideChip
                    key={name}
                    name={name}
                    onOpenEntry={onOpenEntry}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {stack.goals.map((key) => (
                  <span
                    key={key}
                    className="text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md px-2 py-1"
                  >
                    {goalLabel(key)}
                  </span>
                ))}
              </div>

              {blend && onOpenEntry && (
                <button
                  type="button"
                  onClick={() => onOpenEntry(blend.name)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 mt-4"
                >
                  View the combined entry →
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <p className="text-sm text-slate-400">
          <span className="text-amber-400 font-semibold">
            Descriptive, not a recommendation.
          </span>{" "}
          These are popular community names and combinations, listed for
          reference only — including one here says nothing about whether it's
          safe, effective, or right for you. No doses are given, because
          appropriate dosing is individual. Many of these are research
          compounds, not approved medicines. Always work with a licensed
          healthcare provider.
        </p>
      </div>
    </div>
  );
}