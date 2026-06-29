"use client";

// ============================================================
// FORGOT PASSWORD (request a reset link)
//   goes in:  app/forgot-password/page.js   (public route "/forgot-password")
//
// The user enters their email; Supabase emails them a secure reset link.
// That link sends them to /reset-password (built separately) to choose a
// new password. The redirect uses window.location.origin so it works on
// localhost AND on your live site automatically.
//
// IMPORTANT: the reset-password URL must be added to your Supabase project's
// "Redirect URLs" allow-list, or the link will bounce to your homepage.
// (Dashboard step is in the chat.)
// ============================================================

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleReset() {
    setLoading(true);
    setError("");

    if (!email) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase does not reveal whether the email exists (to prevent account
    // enumeration), so we always show the same confirmation.
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-slate-400">
            If an account exists for{" "}
            <span className="text-emerald-400">{email}</span>, we've sent a link
            to reset your password. The link expires in 1 hour.
          </p>
          <p className="text-slate-400 text-sm text-center mt-6">
            <a href="/login" className="text-emerald-500 hover:underline">
              Back to log in
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
        <p className="text-slate-400 mb-6">
          Enter your email and we'll send you a link to set a new password.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="text-slate-400 text-sm mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p className="text-slate-400 text-sm text-center mt-4">
          Remembered it?{" "}
          <a href="/login" className="text-emerald-500 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}