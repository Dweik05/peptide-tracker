"use client";

// ============================================================
// ONBOARDING CHECKLIST  —  goes in:
//   app/components/OnboardingChecklist.js
//
// Day 25E — a first-run "Get started" card for the dashboard.
//
// It's self-contained: it loads the session, figures out which
// setup steps the user has/hasn't done (by checking whether they
// have any rows in the relevant tables), and renders a checklist
// that ticks itself off as they go. Each open step links to the
// page where they'd do it.
//
//   - Peptide users see: add inventory, set up a schedule, log a
//     dose, log a weight.
//   - Non-peptide users see: log a weight, take measurements, add
//     a progress photo.
//
// It hides itself once everything's done (and remembers that so it
// stops checking), and there's a Dismiss link to hide it early.
// Both are stored in profiles.onboarding_dismissed.
//
// The dashboard just renders <OnboardingChecklist /> near the top;
// all the logic lives here.
// ============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function OnboardingChecklist() {
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      return;
    }
    const uid = session.user.id;

    // profile flags: peptide mode + whether they've dismissed onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("uses_peptides, onboarding_dismissed")
      .eq("id", uid)
      .single();

    if (profile && profile.onboarding_dismissed) {
      setLoading(false);
      return; // already dismissed / completed — render nothing
    }

    const usesPeptides = profile ? profile.uses_peptides ?? true : true;

    // "do they have at least one row in this table?" — cheap existence check
    async function hasAny(table) {
      const { data } = await supabase
        .from(table)
        .select("id")
        .eq("user_id", uid)
        .limit(1);
      return !!(data && data.length > 0);
    }

    let built = [];

    if (usesPeptides) {
      const [inv, sched, dose, weight] = await Promise.all([
        hasAny("inventory"),
        hasAny("reminders"),
        hasAny("dose_logs"),
        hasAny("weight_logs"),
      ]);
      built = [
        {
          key: "inventory",
          label: "Add your first inventory item",
          href: "/inventory",
          done: inv,
        },
        {
          key: "schedule",
          label: "Set up a dose schedule",
          href: "/planner",
          done: sched,
        },
        {
          key: "dose",
          label: "Log your first dose",
          href: "/log",
          done: dose,
        },
        {
          key: "weight",
          label: "Log your first weight",
          href: "/progress",
          done: weight,
        },
      ];
    } else {
      const [weight, meas, photo] = await Promise.all([
        hasAny("weight_logs"),
        hasAny("body_measurements"),
        hasAny("progress_photos"),
      ]);
      built = [
        {
          key: "weight",
          label: "Log your first weight",
          href: "/progress",
          done: weight,
        },
        {
          key: "measure",
          label: "Take your body measurements",
          href: "/progress",
          done: meas,
        },
        {
          key: "photo",
          label: "Add a progress photo",
          href: "/progress",
          done: photo,
        },
      ];
    }

    const allDone = built.every((step) => step.done);
    if (allDone) {
      // nothing left to do — hide for good so we stop checking on every load
      await supabase
        .from("profiles")
        .update({ onboarding_dismissed: true })
        .eq("id", uid);
      setLoading(false);
      return;
    }

    setSteps(built);
    setVisible(true);
    setLoading(false);
  }

  async function handleDismiss() {
    setVisible(false);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("profiles")
        .update({ onboarding_dismissed: true })
        .eq("id", session.user.id);
    }
  }

  if (loading || !visible) return null;

  const doneCount = steps.filter((step) => step.done).length;
  const pct = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Get started</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            A few quick steps to set up your tracker — {doneCount} of{" "}
            {steps.length} done.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-sm text-slate-500 hover:text-slate-300 whitespace-nowrap"
        >
          Dismiss
        </button>
      </div>

      {/* progress bar (width is dynamic, so it must be an inline style) */}
      <div className="mt-4 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) =>
          step.done ? (
            <li
              key={step.key}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50"
            >
              <span className="text-emerald-400">✓</span>
              <span className="text-sm text-slate-400 line-through">
                {step.label}
              </span>
            </li>
          ) : (
            <li key={step.key}>
              <Link
                href={step.href}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                <span className="flex items-center gap-3">
                  <span className="text-slate-500">○</span>
                  <span className="text-sm text-white font-medium">
                    {step.label}
                  </span>
                </span>
                <span className="text-slate-500 text-sm">→</span>
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  );
}