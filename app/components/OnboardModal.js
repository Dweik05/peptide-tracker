"use client";

// ============================================================
// ONBOARDING MODAL  —  goes in:  app/components/OnboardingModal.js
//
// A first-run pop-up shown on the dashboard. It asks two quick questions to
// tailor the app, and can be dismissed with the X (or "Skip for now").
//
// It shows itself ONLY when the user hasn't finished or dismissed onboarding
// (reads profiles.onboarding_completed / onboarding_dismissed). Saving writes
// uses_peptides + goal and marks onboarding_completed; the X marks
// onboarding_dismissed. Either way it won't appear again.
//
// HOW TO MOUNT (once, on the dashboard):
//   1. add:   import OnboardingModal from "../../components/OnboardingModal";
//   2. drop:  <OnboardingModal />   anywhere inside the returned JSX.
// It's fixed-position and self-gating, so where you place it doesn't matter,
// and it renders nothing for users who've already onboarded.
//
// Requires a `goal` (text) column on profiles (migration run from chat).
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const GOALS = [
  { value: "weight_loss", label: "Weight loss / fat loss" },
  { value: "muscle", label: "Muscle & recomposition" },
  { value: "healing", label: "Healing & recovery" },
  { value: "longevity", label: "Longevity & anti-aging" },
  { value: "general", label: "General wellness / just tracking" },
];

export default function OnboardingModal() {
  const [userId, setUserId] = useState(null);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // answers
  const [usesPeptides, setUsesPeptides] = useState(null); // true | false | null
  const [goal, setGoal] = useState("");

  // Decide whether to show the modal on first load.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select(
          "uses_peptides, goal, onboarding_completed, onboarding_dismissed"
        )
        .eq("id", session.user.id)
        .single();

      if (cancelled || fetchError || !data) return;

      // pre-fill any answers they already have
      if (typeof data.uses_peptides === "boolean") {
        setUsesPeptides(data.uses_peptides);
      }
      if (data.goal) setGoal(data.goal);

      // show only if they haven't finished or dismissed it
      if (!data.onboarding_completed && !data.onboarding_dismissed) {
        setUserId(session.user.id);
        setShow(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  // X out / skip — remember the dismissal so it doesn't nag again.
  async function handleDismiss() {
    setShow(false);
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ onboarding_dismissed: true })
      .eq("id", userId);
  }

  // Save answers and mark onboarding complete.
  async function handleSave() {
    setError("");
    if (usesPeptides === null) {
      setError("Let us know whether you're using peptides.");
      return;
    }
    if (!goal) {
      setError("Pick a main goal.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        uses_peptides: usesPeptides,
        goal: goal,
        onboarding_completed: true,
      })
      .eq("id", userId);
    setSaving(false);

    if (updateError) {
      setError(`Couldn't save: ${updateError.message}`);
      return;
    }
    setShow(false);
    // hand off to the guided tour (Sidebar listens for this)
    window.dispatchEvent(new Event("pt:start-tour"));
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* card */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 max-h-[90vh] overflow-y-auto">
        {/* X */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Skip for now"
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-white pr-8">
          Welcome to Peptide Tracker
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Two quick questions so we can tailor things to you. You can skip this
          and change it anytime in Settings.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mt-4">
            {error}
          </div>
        )}

        {/* Q1: peptides */}
        <div className="mt-5">
          <p className="text-sm font-medium text-white mb-2">
            Are you currently using peptides?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setUsesPeptides(true)}
              className={
                usesPeptides === true
                  ? "flex-1 px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold"
                  : "flex-1 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setUsesPeptides(false)}
              className={
                usesPeptides === false
                  ? "flex-1 px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold"
                  : "flex-1 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }
            >
              No
            </button>
          </div>
          {usesPeptides === false && (
            <p className="text-xs text-slate-500 mt-2">
              No problem — you can track weight, measurements, photos, and goals
              without logging any peptides.
            </p>
          )}
        </div>

        {/* Q2: goal */}
        <div className="mt-5">
          <p className="text-sm font-medium text-white mb-2">
            What's your main goal?
          </p>
          <div className="space-y-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={
                  goal === g.value
                    ? "w-full text-left px-4 py-3 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 font-medium"
                    : "w-full text-left px-4 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-slate-400 hover:text-white"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}