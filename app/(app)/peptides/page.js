"use client";

// ============================================================
// PEPTIDE ENCYCLOPEDIA  —  goes in:  app/(app)/peptides/page.js
// (v2 — REPLACES the Day 17 version; use this one)
//
// Day 17 + the My Stack feature:
//
//   - Browse by GOAL or A–Z (Day 17)
//   - Full reference entries with evidence tiers (Day 17)
//   - NEW "MY STACK" TAB: auto-detects the peptides you're on
//     (recent doses + inventory), shows what that combination
//     targets — "primarily Weight Loss, with secondary support
//     for Skin & Hair..." — and lets you toggle peptides on/off
//     to preview any stack. Based purely on the encyclopedia's
//     reference tags: descriptive, never a recommendation.
//
// Data lives in app/lib/encyclopedia.js (single review point —
// lawyer checklist item #3).
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { PEPTIDES } from "../../lib/peptides";
import {
  GOALS,
  EVIDENCE_TIERS,
  entriesForGoal,
  entryByName,
  allEntriesSorted,
  analyzeStack,
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
  // view: "goals" grid, a specific goal key, "az", or "stack"
  const [mode, setMode] = useState("goals");
  const [openName, setOpenName] = useState(null); // entry detail

  // ----- My Stack -----
  const [autoNames, setAutoNames] = useState([]); // detected from your data
  const [selected, setSelected] = useState([]); // the stack being analyzed
  const [stackLoaded, setStackLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Detect the user's stack once: peptides dosed in the last 30
  // days + anything in inventory with stock remaining.
  useEffect(() => {
    async function loadStack() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStackLoaded(true);
        return;
      }
      const uid = session.user.id;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [doseResult, inventoryResult] = await Promise.all([
        supabase
          .from("dose_logs")
          .select("peptide_name")
          .eq("user_id", uid)
          .gte("logged_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("inventory")
          .select("peptide_name, quantity_remaining")
          .eq("user_id", uid),
      ]);

      const seen = new Map();
      for (const row of doseResult.data || []) {
        const key = row.peptide_name.trim().toLowerCase();
        if (key && !seen.has(key)) seen.set(key, row.peptide_name.trim());
      }
      for (const row of inventoryResult.data || []) {
        if (parseFloat(row.quantity_remaining) <= 0) continue;
        const key = row.peptide_name.trim().toLowerCase();
        if (key && !seen.has(key)) seen.set(key, row.peptide_name.trim());
      }

      const detected = [...seen.values()];
      setAutoNames(detected);
      setSelected(detected);
      setStackLoaded(true);
    }
    loadStack();
  }, []);

  function isSelected(name) {
    return selected.some(
      (s) => s.trim().toLowerCase() === name.trim().toLowerCase()
    );
  }

  function toggleSelected(name) {
    setSelected((previous) =>
      previous.some(
        (s) => s.trim().toLowerCase() === name.trim().toLowerCase()
      )
        ? previous.filter(
            (s) => s.trim().toLowerCase() !== name.trim().toLowerCase()
          )
        : [...previous, name]
    );
  }

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

  // ---------- MY STACK VIEW ----------
  if (mode === "stack") {
    const { known, unknown, targets } = analyzeStack(selected);

    const primaryGoals = targets.filter((t) => t.primary.length > 0);
    const secondaryOnlyGoals = targets.filter((t) => t.primary.length === 0);

    function goalLabel(key) {
      const goal = GOALS.find((g) => g.key === key);
      return goal ? `${goal.icon} ${goal.label}` : key;
    }

    return (
      <div className="p-8 max-w-5xl space-y-6">
        <Header />
        <ModeTabs mode={mode} setMode={setMode} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">🧩 My stack</h2>
            <p className="text-slate-400 mt-1 text-sm">
              Pre-filled from your recent doses and inventory — toggle
              peptides to preview any combination.
            </p>
          </div>
          {autoNames.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(autoNames)}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              ↺ Reset to my peptides
            </button>
          )}
        </div>

        {!stackLoaded ? (
          <p className="text-slate-500">Detecting your stack...</p>
        ) : (
          <>
            {/* the selected stack as removable chips */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              {selected.length === 0 ? (
                <p className="text-slate-500">
                  Nothing selected — add peptides below, or log doses /
                  inventory and they'll appear here automatically.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selected.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleSelected(name)}
                      title="Remove from stack"
                      className="text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full px-3 py-1.5 hover:bg-emerald-500/20"
                    >
                      {name} ✕
                    </button>
                  ))}
                </div>
              )}

              {/* add/remove picker */}
              <button
                type="button"
                onClick={() => setShowPicker((previous) => !previous)}
                aria-expanded={showPicker}
                className="mt-4 text-sm text-slate-400 hover:text-white"
              >
                {showPicker ? "▾" : "▸"} Add / remove peptides
              </button>
              {showPicker && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {PEPTIDES.filter((p) => p.full !== "Other").map((p) => (
                    <button
                      key={p.full}
                      type="button"
                      onClick={() => toggleSelected(p.full)}
                      className={
                        isSelected(p.full)
                          ? "text-sm bg-emerald-500 text-white rounded-full px-3 py-1.5 font-semibold"
                          : "text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-full px-3 py-1.5 hover:bg-slate-700"
                      }
                    >
                      {p.full}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* the verdict */}
            {known.length > 0 && targets.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-slate-200">
                  This stack{" "}
                  {primaryGoals.length > 0 ? (
                    <>
                      primarily targets{" "}
                      <span className="text-white font-semibold">
                        {primaryGoals
                          .map((t) => goalLabel(t.key))
                          .join(", ")}
                      </span>
                    </>
                  ) : (
                    <>has no primary target among its tagged goals</>
                  )}
                  {secondaryOnlyGoals.length > 0 && (
                    <>
                      {primaryGoals.length > 0 ? " — with" : " It offers"}{" "}
                      secondary support for{" "}
                      <span className="text-slate-300 font-semibold">
                        {secondaryOnlyGoals
                          .map((t) => goalLabel(t.key))
                          .join(", ")}
                      </span>
                    </>
                  )}
                  .
                </p>

                {/* per-goal breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  {targets.map((target) => (
                    <div
                      key={target.key}
                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-white font-semibold text-sm">
                          {goalLabel(target.key)}
                        </h3>
                        <span
                          className={
                            target.primary.length > 0
                              ? "text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md px-2 py-0.5"
                              : "text-xs font-semibold bg-slate-700/40 border border-slate-600 text-slate-300 rounded-md px-2 py-0.5"
                          }
                        >
                          {target.primary.length > 0
                            ? "Primary target"
                            : "Secondary"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-2">
                        {target.primary.length > 0 && (
                          <>
                            Primary for{" "}
                            {target.primary.map((name, index) => (
                              <span key={name}>
                                {index > 0 && ", "}
                                <button
                                  type="button"
                                  onClick={() => setOpenName(name)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                >
                                  {name}
                                </button>
                              </span>
                            ))}
                          </>
                        )}
                        {target.secondary.length > 0 && (
                          <>
                            {target.primary.length > 0 && " · "}
                            Secondary for{" "}
                            {target.secondary.map((name, index) => (
                              <span key={name}>
                                {index > 0 && ", "}
                                <button
                                  type="button"
                                  onClick={() => setOpenName(name)}
                                  className="text-slate-300 hover:text-white"
                                >
                                  {name}
                                </button>
                              </span>
                            ))}
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* honest pending list */}
            {unknown.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-sm text-slate-400">
                  <span className="text-slate-300 font-semibold">
                    Not in the encyclopedia yet:
                  </span>{" "}
                  {unknown.join(", ")} — full entries are coming (Day 18);
                  these aren't counted in the breakdown above.
                </p>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                <span className="text-amber-400 font-semibold">
                  Descriptive, not a recommendation.
                </span>{" "}
                This breakdown reflects the encyclopedia's reference tags for
                each peptide individually — it says nothing about whether a
                combination is safe, effective, or right for you. Always work
                with a licensed healthcare provider.
              </p>
            </div>
          </>
        )}
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
        Browse by goal, A–Z, or your own stack. Reference information, not
        medical advice.
      </p>
    </div>
  );
}

function ModeTabs({ mode, setMode }) {
  const onGoals = mode === "goals" || GOALS.some((g) => g.key === mode);
  return (
    <div className="flex flex-wrap gap-2">
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
      <button
        type="button"
        onClick={() => setMode("stack")}
        className={
          mode === "stack"
            ? "px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
            : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
        }
      >
        🧩 My stack
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