"use client";

// ============================================================
// PREMIUM GATE  —  app/components/PremiumGate.js
//
// Wraps any premium content. It checks the signed-in user's access
// (via lib/access) and either renders the content (children) or an
// upgrade screen. Reused by each premium route's layout.js.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { hasPremiumAccess } from "../lib/access";

export default function PremiumGate({ feature = "This page", children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_end_date")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data || null);
      setLoading(false);
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  // Access granted -> show the real page.
  if (hasPremiumAccess(profile)) {
    return children;
  }

  // No access -> upgrade screen (worded slightly differently if a trial lapsed).
  const trialEnded = profile && profile.subscription_status === "trialing";
  const heading = trialEnded
    ? "Your free trial has ended"
    : `${feature} is a premium feature`;
  const subtext = trialEnded
    ? `Subscribe to keep using ${feature.toLowerCase()} and the rest of your premium tools.`
    : `Upgrade to unlock ${feature.toLowerCase()} and every premium tool in Peptide Tracker.`;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-emerald-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white">{heading}</h1>
        <p className="text-sm text-slate-400 mt-2">{subtext}</p>
        <Link
          href="/pricing"
          className="inline-block mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg"
        >
          See plans
        </Link>
      </div>
    </div>
  );
}