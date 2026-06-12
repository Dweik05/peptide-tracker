"use client";

// ============================================================
// INVENTORY PAGE  —  goes in:  app/(app)/inventory/page.js
// (replaces the Step 1 version — paste over it all)
//
// Day 12, Step 2 changes:
//   - Peptide name is now a real dropdown showing the FULL
//     list (same "SM — Semaglutide" format as /log), imported
//     from the shared app/lib/peptides.js — guaranteed name
//     match for auto-deduct
//   - Tap-to-fill vial-size presets: pick a peptide and its
//     catalogue vial sizes appear as buttons; tapping fills
//     the quantity AND sets the right unit
//
// Everything else from Step 1 is unchanged: progress bars,
// LOW STOCK at ≤20%, days/doses-left and cost-per-dose math
// from your real dose history, lowest-stock-first sorting.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  PEPTIDES,
  UNITS,
  VIAL_SIZES,
  convertAmount,
} from "../../lib/peptides";
import StackSummary from "../../components/StackSummary";

const LOW_STOCK_PERCENT = 20;

// ---------------- helper functions ----------------

// Today's date as "YYYY-MM-DD" in YOUR timezone.
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Turns a database timestamp/date into e.g. "Jun 10, 2026"
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Case-insensitive name match so "Semaglutide" = "semaglutide"
function sameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Shared styling for inputs (matches the design system)
const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function InventoryPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // inventory rows
  const [doses, setDoses] = useState([]); // last 90 days of dose logs

  // form fields
  const [peptideName, setPeptideName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [invUnit, setInvUnit] = useState("mg");
  const [cost, setCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");

  // ui feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------- load session + data when the page opens ----------
  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUserId(session.user.id);
      await fetchInventory(session.user.id);
      await fetchRecentDoses(session.user.id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fetch this user's inventory ----------
  async function fetchInventory(uid) {
    const { data, error: fetchError } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(
        `Couldn't load inventory: ${fetchError.message} | Code: ${
          fetchError.code || "?"
        }`
      );
    } else {
      setItems(data || []);
    }
  }

  // ---------- fetch the last 90 days of doses (for the math) ----------
  async function fetchRecentDoses(uid) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error: fetchError } = await supabase
      .from("dose_logs")
      .select("peptide_name, dose_amount, unit, logged_at")
      .eq("user_id", uid)
      .gte("logged_at", ninetyDaysAgo.toISOString())
      .order("logged_at", { ascending: false });

    if (fetchError) {
      // Not fatal — the page works without estimates
      console.error("Couldn't load dose history:", fetchError.message);
      setDoses([]);
    } else {
      setDoses(data || []);
    }
  }

  // ---------- save a new product ----------
  async function handleSaveItem() {
    setError("");
    setSuccess("");

    const name = peptideName.trim();
    if (!name) {
      setError("Select a peptide.");
      return;
    }

    const quantityNumber = parseFloat(quantity);
    if (!quantity || isNaN(quantityNumber) || quantityNumber <= 0) {
      setError("Enter a valid quantity above 0.");
      return;
    }

    const costNumber = cost === "" ? null : parseFloat(cost);
    if (costNumber !== null && (isNaN(costNumber) || costNumber < 0)) {
      setError("Cost must be a number (or leave it blank).");
      return;
    }

    if (purchaseDate && purchaseDate > today) {
      setError("Purchase date can't be in the future.");
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from("inventory").insert({
      user_id: userId,
      peptide_name: name,
      quantity_total: quantityNumber,
      quantity_remaining: quantityNumber, // starts full
      unit: invUnit,
      cost: costNumber,
      purchase_date: purchaseDate || null,
      notes: notes.trim() === "" ? null : notes.trim(),
    });

    setSaving(false);

    if (insertError) {
      setError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    setSuccess("Product added!");
    setPeptideName("");
    setQuantity("");
    setCost("");
    setNotes("");
    setPurchaseDate(getTodayString());
    fetchInventory(userId);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ---------- delete a product ----------
  async function handleDeleteItem(id) {
    const sure = window.confirm(
      "Delete this product from your inventory? This can't be undone."
    );
    if (!sure) return;

    setError("");
    const { error: deleteError } = await supabase
      .from("inventory")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(
        `Couldn't delete: ${deleteError.message} | Code: ${
          deleteError.code || "?"
        }`
      );
    } else {
      setItems((previous) => previous.filter((item) => item.id !== id));
    }
  }

  // ---------- per-product math from real dose history ----------
  function statsForItem(item) {
    const total = parseFloat(item.quantity_total);
    const remaining = parseFloat(item.quantity_remaining);
    const percentRemaining = total > 0 ? (remaining / total) * 100 : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let usedLast30 = 0;
    let doseSum = 0;
    let doseCount = 0;

    for (const dose of doses) {
      if (!sameName(dose.peptide_name, item.peptide_name)) continue;
      const converted = convertAmount(
        parseFloat(dose.dose_amount),
        dose.unit,
        item.unit
      );
      if (converted === null) continue; // incompatible units, skip

      doseSum = doseSum + converted;
      doseCount = doseCount + 1;
      if (new Date(dose.logged_at) >= thirtyDaysAgo) {
        usedLast30 = usedLast30 + converted;
      }
    }

    const dailyRate = usedLast30 / 30;
    const daysLeft =
      dailyRate > 0 ? Math.floor(remaining / dailyRate) : null;

    const averageDose = doseCount > 0 ? doseSum / doseCount : null;
    const dosesLeft =
      averageDose && averageDose > 0
        ? Math.floor(remaining / averageDose)
        : null;

    let costPerDose = null;
    if (item.cost !== null && item.cost !== undefined && averageDose) {
      const totalDoses = total / averageDose;
      if (totalDoses > 0) {
        costPerDose = parseFloat(item.cost) / totalDoses;
      }
    }

    return { percentRemaining, daysLeft, dosesLeft, costPerDose };
  }

  // sort lowest-stock first so urgent products surface
  const sortedItems = [...items].sort(
    (a, b) =>
      statsForItem(a).percentRemaining - statsForItem(b).percentRemaining
  );

  // vial-size presets for the currently selected peptide (if any)
  const presets = peptideName ? VIAL_SIZES[peptideName] : null;

  // summary numbers
  const lowStockCount = items.filter(
    (item) => statsForItem(item).percentRemaining <= LOW_STOCK_PERCENT
  ).length;
  const totalSpent = items.reduce(
    (sum, item) =>
      sum +
      (item.cost !== null && item.cost !== undefined
        ? parseFloat(item.cost)
        : 0),
    0
  );

  // ---------- page ----------

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Loading your inventory...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-slate-400 mt-1">
          Know exactly how much you have left and when to reorder.
        </p>
      </div>

      {/* ---------- summary cards ---------- */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Products tracked</p>
            <p className="text-2xl font-bold text-white mt-1">
              {items.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Low stock</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                lowStockCount > 0 ? "text-red-400" : "text-white"
              }`}
            >
              {lowStockCount}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Total spent</p>
            <p className="text-2xl font-bold text-white mt-1">
              ${totalSpent.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* ================================================
          SIDE-BY-SIDE: products (left) | add form (right)
          ================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---------- LEFT COLUMN: stack + product cards ---------- */}
        <div className="space-y-4">
          <StackSummary />

          {sortedItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-500">
                Nothing tracked yet — add your first vial or pen with the
                form. Every dose you log subtracts from it automatically.
              </p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const stats = statsForItem(item);
              const isLow = stats.percentRemaining <= LOW_STOCK_PERCENT;

              return (
                <div
                  key={item.id}
                  className={`bg-slate-900 border rounded-xl p-6 ${
                    isLow ? "border-red-500/40" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {item.peptide_name}
                        {isLow && (
                          <span className="ml-2 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 rounded-md px-2 py-0.5 align-middle">
                            LOW STOCK
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {parseFloat(item.quantity_remaining).toFixed(2)} of{" "}
                        {parseFloat(item.quantity_total).toFixed(2)}{" "}
                        {item.unit} remaining (
                        {stats.percentRemaining.toFixed(0)}%)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-500 hover:text-red-400 text-sm"
                      title="Delete product"
                    >
                      ✕
                    </button>
                  </div>

                  {/* progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full ${
                        isLow ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, stats.percentRemaining)
                        )}%`,
                      }}
                    ></div>
                  </div>

                  {/* stats row */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
                    <span>
                      <span className="text-slate-500">Days left </span>
                      <span className="text-white font-semibold">
                        {stats.daysLeft !== null ? `~${stats.daysLeft}` : "—"}
                      </span>
                    </span>
                    <span>
                      <span className="text-slate-500">Doses left </span>
                      <span className="text-white font-semibold">
                        {stats.dosesLeft !== null
                          ? `~${stats.dosesLeft}`
                          : "—"}
                      </span>
                    </span>
                    <span>
                      <span className="text-slate-500">Cost / dose </span>
                      <span className="text-white font-semibold">
                        {stats.costPerDose !== null
                          ? `$${stats.costPerDose.toFixed(2)}`
                          : "—"}
                      </span>
                    </span>
                    {item.purchase_date && (
                      <span>
                        <span className="text-slate-500">Bought </span>
                        <span className="text-white font-semibold">
                          {formatDate(item.purchase_date)}
                        </span>
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-sm text-slate-500 mt-2">
                      {item.notes}
                    </p>
                  )}

                  {stats.daysLeft === null && stats.dosesLeft === null && (
                    <p className="text-xs text-slate-600 mt-2">
                      Estimates appear once you've logged doses of "
                      {item.peptide_name}" (with a compatible unit).
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ---------- RIGHT COLUMN: add product form ---------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Add a product
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Same list as your dose log — auto-deduct matches by name
            automatically.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-4 py-3 text-sm mb-4">
              {success}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">
              Peptide
            </label>
            <select
              value={peptideName}
              onChange={(event) => setPeptideName(event.target.value)}
              className={inputClasses}
            >
              <option value="">Select a peptide...</option>
              {PEPTIDES.map((p) => (
                <option key={p.full} value={p.full}>
                  {p.short} — {p.full}
                </option>
              ))}
            </select>
          </div>

          {/* tap-to-fill vial sizes (from the supplier catalogue) */}
          {presets && (
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-2">
                Common vial sizes{" "}
                <span className="text-slate-500">(tap to fill — per vial)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setQuantity(String(size));
                      setInvUnit(presets.unit);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700"
                  >
                    {size} {presets.unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* unit toggle */}
          <div className="flex gap-2 mb-4">
            {UNITS.map((unitOption) => (
              <button
                key={unitOption}
                type="button"
                onClick={() => setInvUnit(unitOption)}
                className={
                  unitOption === invUnit
                    ? "px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold"
                    : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                }
              >
                {unitOption}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Quantity ({invUnit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.0"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Cost ($CAD){" "}
                <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 350.00"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Purchase date
              </label>
              <input
                type="date"
                value={purchaseDate}
                max={today}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className={`${inputClasses} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Notes <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. pharmacy refill"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveItem}
            disabled={saving}
            className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}