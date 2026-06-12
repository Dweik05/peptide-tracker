"use client";

// ============================================================
// PEPTIDE ENCYCLOPEDIA  —  goes in:  app/(app)/peptides/page.js
// (v3 — REPLACES the v2 page. This is Chunk 2 of Day 18.)
//
// What's new in v3:
//   - Detail pages now show PROS / CONS (two columns) and a
//     REFERENCES section with links to the source literature.
//   - Detail pages are STUB-AWARE: short entries render only
//     the fields they have, with a "short reference for now"
//     note — no blank sections, no crashes.
//   - SEARCH: the A–Z tab has a search box across name, aka,
//     category, and summary.
//   - RECONSTITUTION & STORAGE GUIDE: a new tab with
//     reference-framed education on mixing and storing
//     lyophilized peptides (lawyer checklist item #2).
//
// ⚠️ Everything is reference-only, not medical advice. Data
// lives in app/lib/encyclopedia.js (single review point).
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
  searchEntries,
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

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

export default function EncyclopediaPage() {
  // view: "goals" grid, a goal key, "az", "stack", or "guide"
  const [mode, setMode] = useState("goals");
  const [openName, setOpenName] = useState(null); // entry detail
  const [query, setQuery] = useState(""); // search box (A–Z)

  // ----- My Stack -----
  const [autoNames, setAutoNames] = useState([]);
  const [selected, setSelected] = useState([]);
  const [stackLoaded, setStackLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

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

  // =========================================================
  // DETAIL VIEW
  // =========================================================
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
            <h1 className="text-2xl font-bold text-white">{openEntry.name}</h1>
            <TierBadge tierKey={openEntry.evidenceTier} />
          </div>
          {hasItems(openEntry.aka) && (
            <p className="text-slate-400 mt-1">
              Also known as: {openEntry.aka.join(", ")}
            </p>
          )}
          {openEntry.category && (
            <p className="text-sm text-slate-500 mt-1">{openEntry.category}</p>
          )}
        </div>

        {/* disclaimer up top */}
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-sm">
          Reference information only — not medical advice. Nothing here is a
          recommendation to use any substance. Talk to a licensed healthcare
          provider before starting anything.
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          {openEntry.summary && (
            <Section title="What it is">
              <p className="text-slate-300">{openEntry.summary}</p>
            </Section>
          )}

          {hasItems(openEntry.goals) && (
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
          )}

          {/* stub note */}
          {openEntry.isStub && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
              <p className="text-sm text-slate-400">
                This is a short reference entry for now — a full write-up
                (mechanism, pros/cons, references) is on the way.
              </p>
            </div>
          )}

          {openEntry.mechanism && (
            <Section title="How it works">
              <p className="text-slate-300">{openEntry.mechanism}</p>
            </Section>
          )}

          {(openEntry.halfLife || openEntry.storage) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {openEntry.halfLife && (
                <Section title="Half-life">
                  <p className="text-slate-300">{openEntry.halfLife}</p>
                </Section>
              )}
              {openEntry.storage && (
                <Section title="Storage">
                  <p className="text-slate-300">{openEntry.storage}</p>
                </Section>
              )}
            </div>
          )}

          {/* pros / cons */}
          {(hasItems(openEntry.pros) || hasItems(openEntry.cons)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-emerald-400 mb-2">
                  Pros
                </h3>
                {hasItems(openEntry.pros) ? (
                  <ul className="space-y-1.5">
                    {openEntry.pros.map((item, index) => (
                      <li
                        key={index}
                        className="text-sm text-slate-300 flex gap-2"
                      >
                        <span className="text-emerald-400">+</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">
                  Cons
                </h3>
                {hasItems(openEntry.cons) ? (
                  <ul className="space-y-1.5">
                    {openEntry.cons.map((item, index) => (
                      <li
                        key={index}
                        className="text-sm text-slate-300 flex gap-2"
                      >
                        <span className="text-amber-400">–</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
              </div>
            </div>
          )}

          {hasItems(openEntry.commonSideEffects) && (
            <Section title="Common side effects">
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {openEntry.commonSideEffects.map((effect, index) => (
                  <li key={index}>{effect}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* dosing reference — clearly labeled, not advice */}
          {openEntry.dosingReference && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
                Dosing reference — background only
              </p>
              <p className="text-slate-300 text-sm">
                {openEntry.dosingReference}
              </p>
            </div>
          )}

          {openEntry.approval && (
            <Section title="Regulatory status">
              <p className="text-slate-300">{openEntry.approval}</p>
            </Section>
          )}

          {/* references */}
          {hasItems(openEntry.sources) && (
            <Section title="References">
              <ul className="space-y-1.5">
                {openEntry.sources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 text-sm underline underline-offset-2"
                    >
                      {source.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                Links open a search on a public medical or research database.
              </p>
            </Section>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Information is summarized in plain language from public regulatory
          information and published research. This page does not reproduce any
          source in full.
        </p>
      </div>
    );
  }

  // =========================================================
  // RECONSTITUTION & STORAGE GUIDE
  // =========================================================
  if (mode === "guide") {
    return (
      <div className="p-8 max-w-3xl space-y-6">
        <Header />
        <ModeTabs mode={mode} setMode={setMode} />

        <div>
          <h2 className="text-xl font-bold text-white">
            🧪 Reconstitution &amp; storage guide
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            General educational reference on how lyophilized (freeze-dried)
            peptides are mixed and stored.
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-sm">
          Educational reference only — not medical advice or an instruction to
          use any substance. Techniques vary, sterility matters, and many of
          these compounds are not approved medicines. Always follow the guidance
          of a licensed healthcare provider.
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <Section title="What reconstitution means">
            <p className="text-slate-300">
              Many peptides ship as a dry powder (lyophilized) because they're
              more stable that way. "Reconstitution" simply means adding a
              sterile liquid — usually bacteriostatic water — to dissolve the
              powder into a solution. Bacteriostatic water contains a tiny
              amount of benzyl alcohol that limits bacterial growth, which is
              why it's commonly chosen over plain sterile water for multi-use
              vials.
            </p>
          </Section>

          <Section title="Typical supplies people use">
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>The lyophilized peptide vial</li>
              <li>Bacteriostatic water (the diluent)</li>
              <li>Alcohol swabs</li>
              <li>A sterile syringe to add the water</li>
              <li>A clean, flat work surface</li>
            </ul>
          </Section>

          <Section title="The general process (concept)">
            <ol className="list-decimal list-inside text-slate-300 space-y-1.5">
              <li>Wash hands; wipe the work surface.</li>
              <li>
                Swab the rubber stopper of both the peptide vial and the
                bacteriostatic water with alcohol, and let them dry.
              </li>
              <li>
                Draw the intended amount of bacteriostatic water into the
                syringe.
              </li>
              <li>
                Add the water <span className="text-white">slowly</span>,
                letting it run down the inside wall of the vial rather than
                blasting directly onto the powder.
              </li>
              <li>
                <span className="text-white">Swirl gently</span> — do not shake.
                Let the powder dissolve on its own; it may take a minute. The
                solution should be clear.
              </li>
              <li>Refrigerate once mixed.</li>
            </ol>
          </Section>

          <Section title="Understanding concentration (math literacy)">
            <p className="text-slate-300">
              The amount of water you add sets the concentration — how much
              peptide is in each unit of liquid. This is just arithmetic, and
              understanding it helps you read any protocol your provider gives
              you. For example, if a vial contains 5&nbsp;mg of peptide and you
              add 2&nbsp;mL of water, the concentration is
              5&nbsp;÷&nbsp;2&nbsp;=&nbsp;2.5&nbsp;mg per&nbsp;mL. More water
              means a more dilute solution; less water means more concentrated.
            </p>
            <p className="text-slate-500 text-sm mt-2">
              This explains the concept only — it is not a recommendation about
              how much of anything to use. (The dose planner coming in a later
              update will do this math for a protocol you enter.)
            </p>
          </Section>

          <Section title="Storage">
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>
                Dry, unmixed vials are usually kept refrigerated or frozen and
                protected from light.
              </li>
              <li>
                Once reconstituted, solutions are generally kept refrigerated
                (not frozen) and used within a few weeks — exact stability
                varies by peptide.
              </li>
              <li>Keep vials out of direct light and away from heat.</li>
            </ul>
          </Section>

          <Section title="When to discard">
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>If the solution turns cloudy or develops particles.</li>
              <li>If it changes color or smell.</li>
              <li>
                Past the stability window for that peptide, or if sterility is
                ever in doubt.
              </li>
            </ul>
          </Section>

          <Section title="Safety notes">
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>
                Sterile technique reduces the risk of contamination and
                infection.
              </li>
              <li>Never share needles or vials.</li>
              <li>Dispose of sharps in a proper sharps container.</li>
              <li>
                Research compounds aren't quality-controlled like approved
                medicines — purity and identity can't be assumed.
              </li>
            </ul>
          </Section>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400">
            <span className="text-amber-400 font-semibold">
              Not medical advice.
            </span>{" "}
            This guide describes general concepts for educational reference. It
            is not a recommendation to prepare or use any substance. Work with a
            licensed healthcare provider.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // A–Z + SEARCH VIEW
  // =========================================================
  if (mode === "az") {
    const results = searchEntries(query);
    return (
      <div className="p-8 max-w-5xl space-y-6">
        <Header />
        <ModeTabs mode={mode} setMode={setMode} />

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search peptides — name, alias, or what it's for..."
          className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500"
        />

        {results.length === 0 ? (
          <p className="text-slate-500">
            No matches for "{query}". Try a different term.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {results.length} {results.length === 1 ? "peptide" : "peptides"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((entry) => (
                <EntryCard
                  key={entry.name}
                  entry={entry}
                  onOpen={() => setOpenName(entry.name)}
                />
              ))}
            </div>
          </>
        )}
        <Disclaimer />
      </div>
    );
  }

  // =========================================================
  // MY STACK VIEW
  // =========================================================
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
              Pre-filled from your recent doses and inventory — toggle peptides
              to preview any combination.
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

            {known.length > 0 && targets.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-slate-200">
                  This stack{" "}
                  {primaryGoals.length > 0 ? (
                    <>
                      primarily targets{" "}
                      <span className="text-white font-semibold">
                        {primaryGoals.map((t) => goalLabel(t.key)).join(", ")}
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

            {unknown.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-sm text-slate-400">
                  <span className="text-slate-300 font-semibold">
                    Not in the encyclopedia yet:
                  </span>{" "}
                  {unknown.join(", ")} — these aren't counted in the breakdown
                  above.
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

  // =========================================================
  // A SPECIFIC GOAL VIEW
  // =========================================================
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
            Peptides the community associates with this goal, ranked by strength
            of evidence. "Primary" = a main intended use; "secondary" = a real
            but non-primary effect.
          </p>
        </div>

        {matches.length === 0 ? (
          <p className="text-slate-500">No entries tagged for this goal yet.</p>
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

  // =========================================================
  // GOALS GRID (default)
  // =========================================================
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
        Browse by goal, search A–Z, check your stack, or read the mixing guide.
        Reference information, not medical advice.
      </p>
    </div>
  );
}

function ModeTabs({ mode, setMode }) {
  const onGoals = mode === "goals" || GOALS.some((g) => g.key === mode);
  const tab = (active) =>
    active
      ? "px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold"
      : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setMode("goals")}
        className={tab(onGoals)}
      >
        By goal
      </button>
      <button
        type="button"
        onClick={() => setMode("az")}
        className={tab(mode === "az")}
      >
        A–Z &amp; search
      </button>
      <button
        type="button"
        onClick={() => setMode("stack")}
        className={tab(mode === "stack")}
      >
        🧩 My stack
      </button>
      <button
        type="button"
        onClick={() => setMode("guide")}
        className={tab(mode === "guide")}
      >
        🧪 Reconstitution
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
      <p className="text-sm text-slate-400 mt-2">{note || entry.summary}</p>
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
        something is for you. Many of these are research compounds, not approved
        medicines. Always work with a licensed healthcare provider.
      </p>
    </div>
  );
}