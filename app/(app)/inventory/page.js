"use client";

// ============================================================
// INVENTORY PAGE (v4 — reskinned)  —  goes in:  app/(app)/inventory/page.js
//
// Same Inventory page, restyled to the new design system:
// metric-style summary cards, cohesive line icons in place of
// emoji, and dark text on the emerald buttons for legibility.
// All logic (vial math, per-item stats, fetch, save, delete) is
// unchanged — only the markup changed.
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

// ---------------- icons (cohesive line set, replaces emoji) ----------------
function Icon({ name, className = "w-4 h-4" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    close: <path d="M18 6 6 18M6 6l12 12" />,
    vial: (
      <>
        <path d="M9 2v14a3 3 0 0 0 6 0V2" />
        <path d="M8 2h8M9 10h6" />
      </>
    ),
    droplet: <path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ---------------- helper functions ----------------

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// clean number: 10 -> "10", 8.5 -> "8.5", 9.004 -> "9.004"
function cleanNum(n) {
  return parseFloat(parseFloat(n).toFixed(3)).toString();
}

// derive the open-vial / unopened-vial split from the running
// total. Returns null when there's no vial_size (old rows).
function vialBreakdown(item) {
  const size = parseFloat(item.vial_size);
  const remaining = parseFloat(item.quantity_remaining);
  if (!size || size <= 0 || isNaN(remaining)) return null;
  const unopened = Math.floor((remaining + 1e-9) / size);
  const open = Math.max(0, remaining - unopened * size);
  return { size, remaining, unopened, open };
}

const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

export default function InventoryPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [doses, setDoses] = useState([]);

  // form fields
  const [itemType, setItemType] = useState("peptide"); // peptide | bac_water
  const [peptideName, setPeptideName] = useState("");
  const [vialSize, setVialSize] = useState("");
  const [vialCount, setVialCount] = useState("1");
  const [invUnit, setInvUnit] = useState("mg");
  const [cost, setCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [notes, setNotes] = useState("");

  // ui feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------- load session + data ----------
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

    const sizeNumber = parseFloat(vialSize);
    if (!vialSize || isNaN(sizeNumber) || sizeNumber <= 0) {
      setError(
        itemType === "bac_water"
          ? "Enter a valid bottle size (mL)."
          : "Enter a valid vial size."
      );
      return;
    }

    const countNumber = parseInt(vialCount, 10);
    if (!vialCount || isNaN(countNumber) || countNumber < 1) {
      setError("Enter how many you have (1 or more).");
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

    let name;
    let unit;
    if (itemType === "bac_water") {
      name = "Bacteriostatic Water";
      unit = "mL";
    } else {
      name = peptideName.trim();
      unit = invUnit;
      if (!name) {
        setError("Select a peptide.");
        return;
      }
    }

    const totalAmount = sizeNumber * countNumber;

    setSaving(true);

    const { error: insertError } = await supabase.from("inventory").insert({
      user_id: userId,
      peptide_name: name,
      item_type: itemType,
      vial_size: sizeNumber,
      vial_count: countNumber,
      quantity_total: totalAmount,
      quantity_remaining: totalAmount, // starts full (all vials sealed)
      unit: unit,
      cost: costNumber,
      purchase_date: purchaseDate || null,
      notes: notes.trim() === "" ? null : notes.trim(),
    });

    setSaving(false);

    if (insertError) {
      setError(`${insertError.message} | Code: ${insertError.code || "?"}`);
      return;
    }

    setSuccess(itemType === "bac_water" ? "Bac water added!" : "Product added!");
    setPeptideName("");
    setVialSize("");
    setVialCount("1");
    setCost("");
    setNotes("");
    setPurchaseDate(getTodayString());
    fetchInventory(userId);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ---------- delete a product ----------
  async function handleDeleteItem(id) {
    const sure = window.confirm(
      "Delete this from your inventory? This can't be undone."
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
      if (converted === null) continue;

      doseSum = doseSum + converted;
      doseCount = doseCount + 1;
      if (new Date(dose.logged_at) >= thirtyDaysAgo) {
        usedLast30 = usedLast30 + converted;
      }
    }

    const dailyRate = usedLast30 / 30;
    const daysLeft = dailyRate > 0 ? Math.floor(remaining / dailyRate) : null;

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

  // split peptides from bac water (old rows: null type = peptide)
  const peptideItems = items.filter(
    (i) => (i.item_type || "peptide") === "peptide"
  );
  const bacItems = items.filter((i) => i.item_type === "bac_water");

  // sort peptides lowest-stock first
  const sortedPeptides = [...peptideItems].sort(
    (a, b) =>
      statsForItem(a).percentRemaining - statsForItem(b).percentRemaining
  );

  // vial-size presets for the currently selected peptide (if any)
  const presets =
    itemType === "peptide" && peptideName ? VIAL_SIZES[peptideName] : null;

  // summary numbers (peptides drive low-stock; spend covers all)
  const lowStockCount = peptideItems.filter(
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
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Inventory
        </h1>
        <p className="text-slate-400 mt-1">
          Know exactly how much you have left and when to reorder.
        </p>
      </div>

      {/* ---------- summary cards ---------- */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Peptides tracked
            </p>
            <p className="text-[26px] leading-none font-semibold text-white mt-3">
              {peptideItems.length}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Low stock
            </p>
            <p
              className={`text-[26px] leading-none font-semibold mt-3 ${
                lowStockCount > 0 ? "text-red-400" : "text-white"
              }`}
            >
              {lowStockCount}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total spent
            </p>
            <p className="text-[26px] leading-none font-semibold text-white mt-3">
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

          {peptideItems.length === 0 && bacItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-500">
                Nothing tracked yet — add your first vials with the form. Every
                dose you log subtracts from your stock automatically.
              </p>
            </div>
          ) : (
            <>
              {sortedPeptides.map((item) => {
                const stats = statsForItem(item);
                const isLow = stats.percentRemaining <= LOW_STOCK_PERCENT;
                const vb = vialBreakdown(item);
                const total = parseFloat(item.quantity_total);
                const remaining = parseFloat(item.quantity_remaining);
                // The bar shows how full the CURRENT vial is (per-vial
                // gauge): 9/10 mg open -> 90%. A fresh/unopened next vial
                // reads full; empty reads 0. Old rows fall back to total %.
                const openPct = vb
                  ? vb.open > 0.0001
                    ? (vb.open / vb.size) * 100
                    : remaining > 0
                    ? 100
                    : 0
                  : stats.percentRemaining;

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

                        {vb ? (
                          <>
                            <p className="text-sm text-slate-300 mt-1">
                              {vb.open > 0.0001 && (
                                <>
                                  Open vial:{" "}
                                  <span className="text-white font-semibold">
                                    {cleanNum(vb.open)}/{cleanNum(vb.size)}{" "}
                                    {item.unit}
                                  </span>{" "}
                                  ·{" "}
                                </>
                              )}
                              <span className="text-white font-semibold">
                                {vb.unopened}
                              </span>{" "}
                              unopened {vb.unopened === 1 ? "vial" : "vials"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {cleanNum(remaining)} of {cleanNum(total)}{" "}
                              {item.unit} total
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-400 mt-0.5">
                            {remaining.toFixed(2)} of {total.toFixed(2)}{" "}
                            {item.unit} remaining (
                            {stats.percentRemaining.toFixed(0)}%)
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-500 hover:text-red-400"
                        title="Delete product"
                      >
                        <Icon name="close" className="w-4 h-4" />
                      </button>
                    </div>

                    {/* progress bar (overall stock) */}
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
                      <div
                        className={`h-2 rounded-full ${
                          isLow ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, openPct)
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
              })}

              {/* ---------- bac water section ---------- */}
              {bacItems.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Icon
                      name="droplet"
                      className="w-[18px] h-[18px] text-slate-400"
                    />
                    Bacteriostatic water
                  </h2>
                  <div className="space-y-3">
                    {bacItems.map((item) => {
                      const vb = vialBreakdown(item);
                      const total = parseFloat(item.quantity_total);
                      const remaining = parseFloat(item.quantity_remaining);
                      return (
                        <div
                          key={item.id}
                          className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm text-slate-300">
                              {vb && vb.open > 0.0001 && (
                                <>
                                  Open bottle:{" "}
                                  <span className="text-white font-semibold">
                                    {cleanNum(vb.open)}/{cleanNum(vb.size)} mL
                                  </span>{" "}
                                  ·{" "}
                                </>
                              )}
                              <span className="text-white font-semibold">
                                {vb ? vb.unopened : "?"}
                              </span>{" "}
                              unopened{" "}
                              {vb && vb.unopened === 1 ? "bottle" : "bottles"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {cleanNum(remaining)} of {cleanNum(total)} mL total
                              {item.cost !== null && item.cost !== undefined
                                ? ` · $${parseFloat(item.cost).toFixed(2)}`
                                : ""}
                              {item.purchase_date
                                ? ` · ${formatDate(item.purchase_date)}`
                                : ""}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-slate-500 mt-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Icon name="close" className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-600 mt-3">
                    Bac water isn't dosed, so it isn't auto-deducted — adjust it
                    by deleting and re-adding when a bottle runs out.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------- RIGHT COLUMN: add form ---------- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Add to inventory
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Enter what you bought as vial size × how many vials.
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

          {/* item type toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setItemType("peptide");
                setError("");
              }}
              className={
                itemType === "peptide"
                  ? "flex-1 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-semibold flex items-center justify-center gap-2"
                  : "flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center justify-center gap-2"
              }
            >
              <Icon name="vial" className="w-4 h-4" />
              Peptide
            </button>
            <button
              type="button"
              onClick={() => {
                setItemType("bac_water");
                setError("");
              }}
              className={
                itemType === "bac_water"
                  ? "flex-1 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-semibold flex items-center justify-center gap-2"
                  : "flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center justify-center gap-2"
              }
            >
              <Icon name="droplet" className="w-4 h-4" />
              Bac water
            </button>
          </div>

          {/* peptide selector (peptide mode only) */}
          {itemType === "peptide" && (
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
          )}

          {/* tap-to-fill vial sizes (peptide mode, when known) */}
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
                      setVialSize(String(size));
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

          {/* unit toggle (peptide mode only; bac water is mL) */}
          {itemType === "peptide" && (
            <div className="flex gap-2 mb-4">
              {UNITS.map((unitOption) => (
                <button
                  key={unitOption}
                  type="button"
                  onClick={() => setInvUnit(unitOption)}
                  className={
                    unitOption === invUnit
                      ? "px-4 py-2 rounded-lg bg-emerald-500 text-emerald-950 font-semibold"
                      : "px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }
                >
                  {unitOption}
                </button>
              ))}
            </div>
          )}

          {/* vial size × count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                {itemType === "bac_water"
                  ? "Bottle size (mL)"
                  : `Vial size (${invUnit})`}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={itemType === "bac_water" ? "e.g. 30" : "e.g. 10"}
                value={vialSize}
                onChange={(event) => setVialSize(event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                {itemType === "bac_water" ? "How many bottles" : "How many vials"}
              </label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="1"
                value={vialCount}
                onChange={(event) => setVialCount(event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          {/* live total preview */}
          {vialSize && vialCount && parseFloat(vialSize) > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              ={" "}
              {cleanNum(parseFloat(vialSize) * (parseInt(vialCount, 10) || 0))}{" "}
              {itemType === "bac_water" ? "mL" : invUnit} total across{" "}
              {parseInt(vialCount, 10) || 0}{" "}
              {itemType === "bac_water" ? "bottle(s)" : "vial(s)"}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
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
          </div>

          <div className="mt-4">
            <label className="block text-sm text-slate-400 mb-1">
              Notes <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              placeholder={
                itemType === "bac_water"
                  ? "e.g. brand / size"
                  : "e.g. pharmacy refill"
              }
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClasses}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveItem}
            disabled={saving}
            className="mt-5 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold px-8 py-3 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Saving..."
              : itemType === "bac_water"
              ? "Add bac water"
              : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}