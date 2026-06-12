"use client";

// ============================================================
// STACK SUMMARY  —  goes in:  app/components/StackSummary.js
// (NEW FILE — create it next to Sidebar.js)
//
// The compact "Your stack" card shown on /log and /inventory.
// It works out which peptides you're on (anything dosed in the
// last 30 days + anything in inventory with stock remaining),
// shows them as chips, and lists the top goals that combination
// targets — based on the encyclopedia's reference tags.
//
// Self-contained: does its own small fetches, renders nothing
// while loading or when the stack is empty. The full breakdown
// lives in the encyclopedia's "My stack" tab.
// ============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { PEPTIDES } from "../lib/peptides";
import { GOALS, analyzeStack } from "../lib/encyclopedia";

// "Semaglutide" → "SM" (falls back to the full name)
function shortCodeFor(name) {
  const match = PEPTIDES.find(
    (p) => p.full.trim().toLowerCase() === name.trim().toLowerCase()
  );
  return match ? match.short : name;
}

export default function StackSummary() {
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState([]);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
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

      // union, de-duped case-insensitively (first casing wins)
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

      setNames([...seen.values()]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || names.length === 0) return null;

  const { targets } = analyzeStack(names);
  const topGoals = targets.slice(0, 3).map((target) => {
    const goal = GOALS.find((g) => g.key === target.key);
    return goal ? `${goal.icon} ${goal.label}` : target.key;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold">Your stack</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            From your recent doses &amp; inventory
          </p>
        </div>
        <Link
          href="/peptides"
          className="text-sm text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
        >
          Full breakdown →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {names.map((name) => (
          <span
            key={name}
            title={name}
            className="text-sm bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-slate-300"
          >
            {shortCodeFor(name)}
          </span>
        ))}
      </div>

      {topGoals.length > 0 && (
        <p className="text-sm text-slate-400 mt-3">
          Targets: {topGoals.join(" · ")}
        </p>
      )}
    </div>
  );
}