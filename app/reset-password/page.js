"use client";

// ============================================================
// RESET PASSWORD (set a new password)
//   goes in:  app/reset-password/page.js   (public route "/reset-password")
//
// This is the page the email link opens. When the user arrives, Supabase has
// placed a one-time recovery token in the URL, and the Supabase client reads
// it automatically and establishes a temporary session. We wait until that
// session exists, then let the user choose a new password (updateUser).
//
// States shown:
//   • "Verifying…"         while the recovery session is being established
//   • "Link invalid"       if no session shows up (bad or expired link)
//   • the new-password form once the session is ready
//   • "Password updated"   after a successful change
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [checking, setChecking] = useState(true); // verifying the link
  const [ready, setReady] = useState(false); // recovery session established
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // When the recovery token in the URL is processed, the client fires an
    // auth event carrying a session. Any session here means the link worked.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setReady(true);
        setChecking(false);
      }
    });

    // In case the token was processed before the listener attached, check for
    // an existing session too.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
        setChecking(false);
      }
    });

    // Safety net: if no session appears within a few seconds, the link is bad
    // or expired — stop "verifying" and show the error state.
    const timer = setTimeout(() => setChecking(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleUpdate() {
    setLoading(true);
    setError("");

    if (!password || !confirm) {
      setError("Please fill in both fields.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Sign out the temporary recovery session so they log in fresh with the
    // new password.
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  }

  // --- success ---
  if (done) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Password updated</h1>
          <p className="text-slate-400 mb-6">
            You can now log in with your new password.
          </p>
          <a
            href="/login"
            className="block w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600"
          >
            Continue to log in
          </a>
        </div>
      </main>
    );
  }

  // --- verifying the link ---
  if (checking) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md text-center">
          <p className="text-slate-400">Verifying your reset link…</p>
        </div>
      </main>
    );
  }

  // --- bad / expired link ---
  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Link invalid or expired
          </h1>
          <p className="text-slate-400 mb-6">
            This password reset link is no longer valid. Request a new one and
            try again.
          </p>
          <a
            href="/forgot-password"
            className="block w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600"
          >
            Request a new link
          </a>
        </div>
      </main>
    );
  }

  // --- set-new-password form ---
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Set a new password</h1>
        <p className="text-slate-400 mb-6">Choose a new password for your account.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-slate-400 text-sm mb-1 block">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mb-6">
          <label className="text-slate-400 text-sm mb-1 block">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </div>
    </main>
  );
}