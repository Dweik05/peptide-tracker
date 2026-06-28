"use client";

// ============================================================
// SHARE MANAGER (Day 37b)  —  goes in:  app/components/ShareManager.js
//
// Same as before, but now it SHOWS errors instead of failing silently.
// If creating or revoking a link fails, a red message appears in the card
// with the actual reason — so problems are visible, not invisible.
//
// Lets the signed-in owner create, copy, and revoke read-only share links.
// Talks to the share_links table directly; row-level security guarantees a
// user only ever sees and manages their OWN links. The token is generated
// by the database, never by the client.
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmtShort(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function linkStatus(link) {
  if (link.revoked) return { label: "Revoked", cls: "text-red-400" };
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { label: "Expired", cls: "text-slate-500" };
  }
  return { label: "Active", cls: "text-emerald-400" };
}

function shareUrl(token) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/share/${token}`;
  }
  return `/share/${token}`;
}

export default function ShareManager() {
  const [userId, setUserId] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      await loadLinks(session.user.id);
      setLoading(false);
    }
    init();
  }, []);

  async function loadLinks(uid) {
    const { data, error: loadErr } = await supabase
      .from("share_links")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (loadErr) {
      setError(`Couldn't load your links: ${loadErr.message}`);
      return;
    }
    setLinks(data || []);
  }

  function computeExpiry(days) {
    if (days === "never") return null;
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days, 10));
    return d.toISOString();
  }

  async function createLink() {
    setError("");

    if (creating) return;

    // make a "not signed in" situation visible instead of doing nothing
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError(
          "You don't appear to be signed in right now. Refresh the page and try again."
        );
        return;
      }
      setUserId(session.user.id);
    }

    const uid = userId || (await supabase.auth.getSession()).data.session?.user?.id;
    if (!uid) {
      setError(
        "You don't appear to be signed in right now. Refresh the page and try again."
      );
      return;
    }

    setCreating(true);
    const { data, error: insertErr } = await supabase
      .from("share_links")
      .insert({
        user_id: uid,
        label: label.trim() || null,
        expires_at: computeExpiry(expiry),
      })
      .select()
      .single();
    setCreating(false);

    if (insertErr) {
      setError(`Couldn't create the link: ${insertErr.message}`);
      return;
    }
    if (!data) {
      setError(
        "The link was sent but nothing came back. Check your connection and try again."
      );
      return;
    }

    setLinks((prev) => [data, ...prev]);
    setLabel("");
  }

  async function revokeLink(id) {
    setError("");
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Revoke this link? Anyone currently using it will immediately lose access. This can't be undone."
      )
    ) {
      return;
    }
    const { error: revokeErr } = await supabase
      .from("share_links")
      .update({ revoked: true })
      .eq("id", id);
    if (revokeErr) {
      setError(`Couldn't revoke the link: ${revokeErr.message}`);
      return;
    }
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, revoked: true } : l))
    );
  }

  async function copyLink(link) {
    const url = shareUrl(link.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard may be blocked; ignore silently
    }
  }

  return (
    <div className="max-w-[820px] mx-auto mb-5 print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white">Share this report</h2>
        <p className="text-sm text-slate-400 mt-1">
          Create a read-only link you can send to your doctor. Anyone with the
          link can view this report until you revoke it — only share it with
          people you trust.
        </p>

        {/* error banner — only shows when something failed */}
        {error && (
          <div className="mt-4 border border-red-500/40 bg-red-500/10 rounded-lg px-3 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* create row */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional, e.g. Dr. Smith)"
            maxLength={60}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="never">No expiry</option>
            <option value="7">Expires in 7 days</option>
            <option value="30">Expires in 30 days</option>
            <option value="90">Expires in 90 days</option>
          </select>
          <button
            onClick={createLink}
            disabled={creating}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 text-sm font-semibold rounded-lg px-4 py-2 whitespace-nowrap"
          >
            {creating ? "Creating…" : "Create link"}
          </button>
        </div>

        {/* list */}
        <div className="mt-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading your links…</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-slate-500">
              No share links yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {links.map((link) => {
                const status = linkStatus(link);
                const active = status.label === "Active";
                return (
                  <li
                    key={link.id}
                    className="border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {link.label || "Untitled link"}
                          <span className={`ml-2 text-xs font-normal ${status.cls}`}>
                            {status.label}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Created {fmtShort(link.created_at)}
                          {link.expires_at && (
                            <> · expires {fmtShort(link.expires_at)}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {active && (
                          <button
                            onClick={() => copyLink(link)}
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-md px-2.5 py-1.5"
                          >
                            {copiedId === link.id ? "Copied!" : "Copy link"}
                          </button>
                        )}
                        {!link.revoked && (
                          <button
                            onClick={() => revokeLink(link.id)}
                            className="text-xs font-medium text-slate-400 hover:text-red-400 border border-slate-700 rounded-md px-2.5 py-1.5"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                    {active && (
                      <p className="text-xs text-slate-600 mt-2 font-mono break-all">
                        {shareUrl(link.token)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}