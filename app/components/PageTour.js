"use client";

// ============================================================
// PAGE TOUR  —  goes in:  app/components/PageTour.js
//
// A reusable, per-page guided tour. Each page defines its own steps, so the
// explanations are specific to what's actually on screen.
//
// HOW A PAGE USES IT
//   1. Mark the things you want to point at with a data-tour attribute:
//        <div data-tour="streak"> ... </div>
//   2. Drop the tour in anywhere on that page:
//        <PageTour
//          tourKey="dashboard"
//          steps={[
//            { target: '[data-tour="streak"]', title: "Your streak",
//              body: "Logging a dose keeps this alive." },
//          ]}
//        />
//
// BEHAVIOR
//   • Runs automatically the first time a user sees that page, then never
//     again (completion is saved per tourKey on the user's profile, so it
//     follows them across devices).
//   • Also starts on demand when anything dispatches the "pt:start-tour"
//     event — which the onboarding modal already fires.
//   • Any step whose target isn't on the page right now is skipped, so a
//     tour can never get stuck pointing at something that isn't there.
//   • Esc or "Skip tour" exits at any time.
//
// Safe to mount on a page even if the user is signed out — it just won't
// persist completion.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const PADDING = 8; // breathing room around the highlighted element
const TOOLTIP_WIDTH = 340;
const GAP = 14; // space between the element and the tooltip

export default function PageTour({ tourKey, steps, autoStart = true }) {
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [checked, setChecked] = useState(false);
  const userIdRef = useRef(null);
  const prefsRef = useRef({});

  const liveSteps = Array.isArray(steps) ? steps : [];

  // ---------- has this user already seen this tour? ----------
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setChecked(true);
          return;
        }
        userIdRef.current = session.user.id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("prefs")
          .eq("id", session.user.id)
          .maybeSingle();

        const prefs = (profile && profile.prefs) || {};
        prefsRef.current = prefs;
        const seen = prefs.tours && prefs.tours[tourKey];

        if (!cancelled) {
          setChecked(true);
          if (autoStart && !seen) setRunning(true);
        }
      } catch (error) {
        // Never let the tour break the page.
        if (!cancelled) setChecked(true);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourKey]);

  // ---------- allow anything to start the tour on demand ----------
  useEffect(() => {
    function onStart() {
      setIndex(0);
      setRunning(true);
    }
    window.addEventListener("pt:start-tour", onStart);
    return () => window.removeEventListener("pt:start-tour", onStart);
  }, []);

  // ---------- save completion ----------
  const markSeen = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      const prefs = prefsRef.current || {};
      const tours = { ...(prefs.tours || {}), [tourKey]: true };
      const next = { ...prefs, tours };
      prefsRef.current = next;
      await supabase.from("profiles").update({ prefs: next }).eq("id", uid);
    } catch (error) {
      // Non-fatal: worst case the tour offers itself again next time.
    }
  }, [tourKey]);

  function finish() {
    setRunning(false);
    markSeen();
  }

  // ---------- find the element for the current step ----------
  const measure = useCallback(() => {
    const step = liveSteps[index];
    if (!step) return;
    const element = document.querySelector(step.target);
    if (!element) {
      setRect(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, liveSteps]);

  // Skip past any step whose target isn't on the page.
  useEffect(() => {
    if (!running) return;
    const step = liveSteps[index];
    if (!step) {
      finish();
      return;
    }
    const element = document.querySelector(step.target);
    if (!element) {
      if (index < liveSteps.length - 1) setIndex((i) => i + 1);
      else finish();
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    // measure after the scroll settles
    const t = setTimeout(measure, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  // Keep the spotlight glued to the element while the page moves.
  useEffect(() => {
    if (!running) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [running, measure]);

  // Esc closes.
  useEffect(() => {
    if (!running) return;
    function onKey(event) {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  function next() {
    if (index < liveSteps.length - 1) setIndex(index + 1);
    else finish();
  }
  function back() {
    if (index > 0) setIndex(index - 1);
  }

  if (!checked || !running || liveSteps.length === 0) return null;

  const step = liveSteps[index];
  if (!step || !rect) return null;

  // ---------- position the tooltip ----------
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const spaceBelow = viewportH - (rect.top + rect.height);
  const placeBelow = spaceBelow > 220 || rect.top < 220;

  const width = Math.min(TOOLTIP_WIDTH, viewportW - 24);
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(12, Math.min(left, viewportW - width - 12));
  const top = placeBelow
    ? rect.top + rect.height + PADDING + GAP
    : rect.top - PADDING - GAP;

  return (
    <>
      {/* click blocker so nothing is triggered by accident mid-tour */}
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          cursor: "default",
        }}
      />

      {/* the spotlight: a clear window with everything else dimmed */}
      <div
        style={{
          position: "fixed",
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
          borderRadius: 12,
          border: "2px solid #10b981",
          boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.78)",
          pointerEvents: "none",
          zIndex: 61,
          transition: "top .2s ease, left .2s ease, width .2s ease, height .2s ease",
        }}
      />

      {/* the explanation card */}
      <div
        role="dialog"
        aria-label={step.title}
        style={{
          position: "fixed",
          top: placeBelow ? top : undefined,
          bottom: placeBelow ? undefined : viewportH - top,
          left,
          width,
          zIndex: 62,
        }}
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-white font-semibold text-[15px] leading-snug">
            {step.title}
          </h3>
          <span className="text-xs text-slate-500 shrink-0 mt-0.5">
            {index + 1} of {liveSteps.length}
          </span>
        </div>

        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          {step.body}
        </p>

        <div className="flex items-center justify-between gap-3 mt-4">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="text-sm bg-slate-800 border border-slate-700 text-slate-300 px-4 py-1.5 rounded-lg hover:bg-slate-700"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="text-sm bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-5 py-1.5 rounded-lg"
            >
              {index === liveSteps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}