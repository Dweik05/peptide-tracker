"use client";

// ============================================================
// PEPTIDE ENCYCLOPEDIA  —  goes in:  app/(app)/peptides/page.js
// (replaces the "coming soon" placeholder — paste over it all)
//
// Day 17: goal-first reference library.
//
//   - Browse by GOAL (Weight Loss, Healing, Sleep, ...): each
//     goal lists relevant peptides tagged PRIMARY vs SECONDARY,
//     with an EVIDENCE-TIER badge + a plain-language one-liner.
//   - Or browse A–Z.
//   - Tap any peptide for the full entry: what it is, how it
//     works, half-life, storage, common side effects, a clearly
//     labeled DOSING REFERENCE block, and real regulatory
//     status.
//
// ⚠️ All content is reference-only, not medical advice. The
// data lives in app/lib/encyclopedia.js (the single place to
// review/edit dosing content — lawyer checklist item #3).
//
// Day 18 will add the remaining peptides, the reconstitution
// guide, and search.
// ============================================================

import { useState } from "react";
import {
  GOALS,
  EVIDENCE_TIERS,
  entriesForGoal,
  entryByName,
  allEntriesSorted,
} from "../../lib/encyclopedia";

// Tailwind classes per evidence-tier color (kept explicit so
// Tailwind's compiler can see every class name).
const TIER_BADGE = {
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  teal: "bg-teal-500/10 border-teal-500/20 text-teal-300",
  sky: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  slate: "bg-slate-700/40 border-slate-600 text-slate-300",
};

function TierBadge({ tierKey }) {
  const tier = EVIDENCE_TIERS[tierKey];
  if (!tier) return null;
  return (
    <span
      className={`text-xs font-semibold border rounded-md px-2 py-0.5 ${
        TIER_BADGE[tier.color] || TIER_BADGE.slate
      }`}
      title={tier.blurb}
    >
      {tier.label}
    </span>
  );
}

export default function EncyclopediaPage() {
  // view: "goals" grid, a specific goal key, or "az"
  const [mode, setMode] = useState("goals");
  const [openName, setOpenName] = useState(null); // entry detail

  const openEntry = openName ? entryByName(openName) : null;

  // ---------- DETAIL VIEW ----------
  if (openEntry) {
    return (
      <div className="p-8 max-w-3xl space-y-6">
        <button
          type="button"
          onClick={() => setOpenName(null)}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to the encyclopedia
        </button>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {openEntry.name}
            </h1>
            <TierBadge tierKey={openEntry.evidenceTier} />
          </div>
          {openEntry.aka && openEntry.aka.length > 0 && (
            <p className="text-slate-400 mt-1">
              Also known as: {openEntry.aka.join(", ")}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1">{openEntry.category}</p>
        </div>

        {/* disclaimer up top */}
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-sm">
          Reference information only — not medical advice. Nothing here is a
          recommendation to use any substance. Talk to a licensed healthcare
          provider before starting anything.
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <Section title="What it is">
            <p className="text-slate-300">{openEntry.summary}</p>
          </Section>

          <Section title="Goals it's used for">
            <div className="flex flex-wrap gap-2">
              {openEntry.goals.map((tag) => {
                const goal = GOALS.find((g) => g.key === tag.key);
                return (
                  <span
                    key={tag.key}
                    className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300"
                  >
                    {goal ? `${goal.icon} ${goal.label}` : tag.key}
                    <span
                      className={
                        tag.role === "primary"
                          ? "ml-2 text-emerald-400 text-xs font-semibold"
                          : "ml-2 text-slate-500 text-xs font-semibold"
                      }
                    >
                      {tag.role}
                    </span>
                  </span>
                );
              })}
            </div>
          </Section>

          <Section title="How it works">
            <p className="text-slate-300">{openEntry.mechanism}</p>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Section title="Half-life">
              <p className="text-slate-300">{openEntry.halfLife}</p>
            </Section>
            <Section title="Storage">
              <p className="text-slate-300">{openEntry.storage}</p>
            </Section>
          </div>

          <Section title="Common side effects">
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              {openEntry.commonSideEffects.map((effect, index) => (
                <li key={index}>{effect}</li>
              ))}
            </ul>
          </Section>

          {/* dosing reference — clearly labeled, not advice */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
              Dosing reference — background only
            </p>
            <p className="text-slate-300 text-sm">
              {openEntry.dosingReference}
            </p>
          </div>

          <Section title="Regulatory status">
            <p className="text-slate-300">{openEntry.approval}</p>
          </Section>
        </div>

        <p className="text-xs text-slate-500">
          Sources are summarized in plain language from public regulatory
          information and published research. This page does not reproduce
          any source in full.
        </p>
      </div>
    );
  }

  // ---------- A–Z VIEW ----------
  if (mode === "az") {
    const all = allEntriesSorted();
    return (
      <div className="p-8 max-w-5xl space-y-6">
        <Header />
        <ModeTabs mode={mode} setMode={setMode} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {all.map((entry) => (
            <EntryCard
              key={entry.name}
              entry={entry}
              onOpen={() => setOpenName(entry.name)}
            />
          ))}
        </div>
        <Disclaimer />
      </div>
    );
  }

  // ---------- A SPECIFIC GOAL VIEW ----------
  if (mode !== "goals") {
    const goal = GOALS.find((g) => g.key === mode);
    const matches = entriesForGoal(mode);
    const primary = matches.filter((m) => m.role === "primary");
    const secondary = matches.filter((m) => m.role === "secondary");

    return (
      <div className="p-8 max-w-5xl space-y-6">
        <Header />
        <ModeTabs mode={mode} setMode={setMode} />

        <div>
          <h2 className="text-xl font-bold text-white">
            {goal ? `${goal.icon} ${goal.label}` : "Goal"}
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            Peptides the community associates with this goal, ranked by
            strength of evidence. "Primary" = a main intended use; "secondary"
            = a real but non-primary effect.
          </p>
        </div>

        {matches.length === 0 ? (
          <p className="text-slate-500">
            No entries tagged for this goal yet — more are coming on Day 18.
          </p>
        ) : (
          <>
            {primary.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Primary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {primary.map((m) => (
                    <EntryCard
                      key={m.entry.name}
                      entry={m.entry}
                      note={m.note}
                      onOpen={() => setOpenName(m.entry.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {secondary.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 mt-2">
                  Secondary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {secondary.map((m) => (
                    <EntryCard
                      key={m.entry.name}
                      entry={m.entry}
                      note={m.note}
                      onOpen={() => setOpenName(m.entry.name)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Disclaimer />
      </div>
    );
  }

  // ---------- GOALS GRID (default) ----------
  return (
    <div className="p-8 max-w-5xl space-y-6">
      <Header />
      <ModeTabs mode={mode} setMode={setMode} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GOALS.map((goal) => {
          const count = entriesForGoal(goal.key).length;
          return (
            <button
              key={goal.key}
              type="button"
              onClick={() => setMode(goal.key)}
              className="text-left bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/40 transition-colors"
            >
              <div className="text-3xl">{goal.icon}</div>
              <h2 className="text-lg font-semibold text-white mt-3">
                {goal.label}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {count} {count === 1 ? "peptide" : "peptides"}
              </p>
            </button>
          );
        })}
      </div>

      <Disclaimer />
    </div>
  );
}

// ---------------- small building blocks ----------------

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Peptide Encyclopedia</h1>
      <p className="text-slate-400 mt-1">
        Browse by goal or A–Z. Reference information, not medical advice.
      </p>
    </div>
  );
}

function ModeTabs({ mode, setMode }) {
  const onGoals = mode === "goals" || GOALS.some((g) => g.key === mode);
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setMode("goals")}
        className={
          onGoals
            ? "px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
            : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
        }
      >
        By goal
      </button>
      <button
        type="button"
        onClick={() => setMode("az")}
        className={
          mode === "az"
            ? "px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
            : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
        }
      >
        A–Z
      </button>
    </div>
  );
}

function EntryCard({ entry, note, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{entry.name}</h3>
        <TierBadge tierKey={entry.evidenceTier} />
      </div>
      <p className="text-sm text-slate-400 mt-2">
        {note || entry.summary}
      </p>
      <p className="text-xs text-emerald-400 mt-3">Read more →</p>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-sm text-slate-400">
        <span className="text-amber-400 font-semibold">
          Not medical advice.
        </span>{" "}
        This encyclopedia is educational reference material. Evidence tiers
        describe how much human research exists — not how safe or effective
        something is for you. Many of these are research compounds, not
        approved medicines. Always work with a licensed healthcare provider.
      </p>
    </div>
  );
}