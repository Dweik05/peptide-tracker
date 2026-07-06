"use client";

// ============================================================
// MANAGE SUBSCRIPTION  —  app/components/ManageSubscription.js
//
// A Settings card showing the user's plan. Active/past-due subscribers get
// a "Manage subscription" button that opens the Stripe billing portal
// (cancel / update card). Everyone else gets a link to the pricing page.
// Render it in Settings alongside <ChangePassword />.
// ============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { trialDaysLeft } from "../lib/access";

// iOS-safe parse of a Postgres timestamp ("2027-07-05 15:36:48", space not "T").
function parseTs(value) {
  if (!value) return null;
  if (
    typeof value === "string" &&
    value.includes(" ") &&
    !value.includes("T")
  ) {
    return new Date(value.replace(" ", "T"));
  }
  return new Date(value);
}
function prettyDate(value) {
  const d = parseTs(value);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ManageSubscription() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_end_date, stripe_customer_id")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(data || null);
      setLoading(false);
    }
    load();
  }, []);

  async function openPortal() {
    setError("");
    setPortalLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in again.");
        setPortalLoading(false);
        return;
      }
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't open the billing portal.");
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Subscription</h2>
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  const status = profile ? profile.subscription_status : "free";
  const daysLeft = trialDaysLeft(profile);
  const hasStripeCustomer = profile && profile.stripe_customer_id;

  let statusLabel = "Free plan";
  let statusDetail = "Upgrade to unlock every premium tool.";
  if (status === "active") {
    statusLabel = "Premium — active";
    statusDetail = profile.subscription_end_date
      ? `Renews on ${prettyDate(profile.subscription_end_date)}.`
      : "Your subscription is active.";
  } else if (status === "past_due") {
    statusLabel = "Payment past due";
    statusDetail = "Your last payment failed. Update your card to keep Premium.";
  } else if (status === "trialing" && daysLeft > 0) {
    statusLabel = "Free trial";
    statusDetail = `${daysLeft} ${
      daysLeft === 1 ? "day" : "days"
    } left. Subscribe to keep Premium when it ends.`;
  } else if (status === "canceled") {
    statusLabel = "Canceled";
    statusDetail = profile.subscription_end_date
      ? `Your access runs until ${prettyDate(profile.subscription_end_date)}.`
      : "Your subscription was canceled.";
  }

  const showPortal =
    (status === "active" || status === "past_due") && hasStripeCustomer;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Subscription</h2>
      <p className="text-sm text-slate-500 mb-4">Your plan and billing.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
        <p className="text-sm text-white font-medium">{statusLabel}</p>
        <p className="text-sm text-slate-400 mt-0.5">{statusDetail}</p>
      </div>

      {showPortal ? (
        <button
          type="button"
          onClick={openPortal}
          disabled={portalLoading}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
        >
          {portalLoading ? "Opening..." : "Manage subscription"}
        </button>
      ) : (
        <Link
          href="/pricing"
          className="inline-block w-full sm:w-auto text-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg"
        >
          {status === "canceled" ? "Resubscribe" : "See plans"}
        </Link>
      )}
    </div>
  );
}