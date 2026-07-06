"use client";

// ============================================================
// PRICING / UPGRADE PAGE  —  app/(app)/pricing/page.js
//
// Shows the Monthly and Yearly plans and starts Stripe Checkout for the
// chosen one (reusing /api/checkout). Handles the ?checkout=success and
// ?checkout=cancel returns, and adapts if the user is already subscribed
// or still in their trial.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { hasPremiumAccess, trialDaysLeft } from "../../lib/access";

const PREMIUM_FEATURES = [
  "Insights, analytics & correlations",
  "Cost & spend analytics",
  "Body-diagram injection logging",
  "Side-effect & lab-result tracking",
  "Doctor-ready PDF report",
  "Public share link",
  "Unlimited progress photos",
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PricingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(""); // "monthly" | "yearly" | ""
  const [error, setError] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState(null); // "success" | "cancel" | null

  useEffect(() => {
    // read ?checkout=... from the URL (avoids useSearchParams + Suspense)
    const params = new URLSearchParams(window.location.search);
    setCheckoutStatus(params.get("checkout"));

    async function init() {
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
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCheckout(plan) {
    setError("");
    setCheckoutLoading(plan);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setCheckoutLoading("");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setCheckoutLoading("");
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const isActive = profile && profile.subscription_status === "active";
  const daysLeft = trialDaysLeft(profile);

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Upgrade to Premium
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Unlock every tool in Peptide Tracker. Cancel anytime.
        </p>
      </div>

      {checkoutStatus === "success" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm">
          You're all set — welcome to Premium. Your subscription can take a few
          seconds to activate; refresh if a premium page still looks locked.
        </div>
      )}
      {checkoutStatus === "cancel" && (
        <div className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm">
          Checkout canceled — no charge was made. Pick a plan whenever you're
          ready.
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isActive ? (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white">
            You're subscribed to Premium
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Thanks for supporting Peptide Tracker. You can manage or cancel your
            subscription in Settings.
          </p>
          <Link
            href="/settings"
            className="inline-block mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-6 py-3 rounded-lg border border-slate-700"
          >
            Manage subscription
          </Link>
        </div>
      ) : (
        <>
          {daysLeft > 0 && (
            <div className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm">
              You're on a free trial —{" "}
              <span className="text-white font-medium">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left
              </span>
              . Subscribe now to keep Premium when it ends.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
              <h2 className="text-base font-semibold text-white">Monthly</h2>
              <p className="mt-3">
                <span className="text-3xl font-semibold text-white">$4.99</span>
                <span className="text-sm text-slate-400"> / month</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Billed monthly.</p>
              <button
                type="button"
                onClick={() => startCheckout("monthly")}
                disabled={!!checkoutLoading}
                className="mt-5 w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg border border-slate-700 disabled:opacity-50"
              >
                {checkoutLoading === "monthly"
                  ? "Redirecting..."
                  : "Choose monthly"}
              </button>
            </div>

            {/* Yearly (highlighted) */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-6 flex flex-col relative">
              <span className="absolute -top-2.5 left-6 bg-emerald-500 text-emerald-950 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Best value · Save 33%
              </span>
              <h2 className="text-base font-semibold text-white">Yearly</h2>
              <p className="mt-3">
                <span className="text-3xl font-semibold text-white">
                  $39.99
                </span>
                <span className="text-sm text-slate-400"> / year</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Just $3.33/mo, billed annually.
              </p>
              <button
                type="button"
                onClick={() => startCheckout("yearly")}
                disabled={!!checkoutLoading}
                className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
              >
                {checkoutLoading === "yearly"
                  ? "Redirecting..."
                  : "Choose yearly"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* What's included */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          What's included
        </h2>
        <ul className="space-y-2.5">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <CheckIcon />
              <span className="text-sm text-slate-300">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}