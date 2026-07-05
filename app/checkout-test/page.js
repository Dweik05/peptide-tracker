"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CheckoutTest() {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function startCheckout(plan) {
    setError("");
    setLoading(plan);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You're not logged in. Log in first, then reload this page.");
        setLoading("");
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
        setError(data.error || "Something went wrong.");
        setLoading("");
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setLoading("");
    }
  }

  const btn = {
    padding: "12px 20px",
    borderRadius: 8,
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    background: "#10b981",
    color: "#022c22",
    marginRight: 12,
  };

  return (
    <div
      style={{
        maxWidth: 440,
        margin: "80px auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        color: "#e2e8f0",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Checkout test</h1>
      <p style={{ color: "#94a3b8", marginBottom: 24 }}>
        Temporary page. Click a plan to test Stripe Checkout, then delete this file.
      </p>

      {error && (
        <p
          style={{
            color: "#f87171",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
          }}
        >
          {error}
        </p>
      )}

      <button
        style={{ ...btn, opacity: loading ? 0.5 : 1 }}
        onClick={() => startCheckout("monthly")}
        disabled={!!loading}
      >
        {loading === "monthly" ? "Redirecting…" : "Monthly — $4.99"}
      </button>

      <button
        style={{ ...btn, opacity: loading ? 0.5 : 1 }}
        onClick={() => startCheckout("yearly")}
        disabled={!!loading}
      >
        {loading === "yearly" ? "Redirecting…" : "Yearly — $39.99"}
      </button>
    </div>
  );
}   