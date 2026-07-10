"use client";

// ============================================================
// INVENTORY PAGE (v5 — explicit open vials)  —  app/(app)/inventory/page.js
//
// The open vial(s) are now REAL, dated things instead of derived math.
// Each product reads two new columns: sealed_vials (count of unopened) and
// open_vials (a list of { remaining, opened_at }). quantity_remaining and
// quantity_total are kept in sync as mirrors, so the dashboard is untouched.
//
// New per-product controls:
//   • Open a vial      -> moves a sealed vial into the open list, dated today
//                         (capped at 3 open vials)
//   • - / + sealed     -> give one away / add one without deleting the item
//   • Discard (per open vial) -> write off that partial vial
//   • Opened date      -> editable per open vial, with "opened N days ago"
//
// Rows with no vial_size (legacy) fall back to a simple remaining/total view.
// All other logic (fetch, add, delete, dose-history stats) is unchanged.
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
const MAX_OPEN_VIALS = 3;
const STALE_OPEN_DAYS = 28; // gently flag vials open longer than this

// ---------------- icons ----------------
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

// ---------------- helpers ----------------
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

function round4(n) {
  return parseFloat(parseFloat(n).toFixed(4));
}

// whole days since a "YYYY-MM-DD" date, or null
function daysSince(dateStr) {
  if (!dateStr) return null;
  const safe = dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr;
  const then = new Date(safe);
  if (isNaN(then.getTime())) return null;
  const ms = Date.now() - then.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function openedAgeText(days) {
  if (days === null) return "";
  if (days === 0) return "opened today";
  if (days === 1) return "opened 1 day ago";
  return `opened ${days} days ago`;
}

// Recompute the mirror fields from the source of truth (sealed + open list).
function syncFields(sealed, openVials, size) {
  const openSum = openVials.reduce(
    (sum, v) => sum + (parseFloat(v.remaining) || 0),
    0
  );
  const totalVials = sealed + openVials.length;
  return {
    quantity_remaining: round4(sealed * size + openSum),
    quantity_total: round4(totalVials * size),
    vial_count: totalVials,
  };
}

const inputClasses =
  "w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500";

const stepBtn =
  "w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 flex items-center justify-center text-lg leading-none";

export default function InventoryPage() {
  const router = useRouter();
  const today = getTodayString();

  // ---------- state ----------
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [doses, setDoses] = useState([]);
  const [editingId, setEditingId] = useState(null); // which card is in edit mode

  // form fields
  const [itemType, setItemType] = useState("peptide");
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

  // ---------- load ----------
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

  // ---------- add a new product ----------
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
      sealed_vials: countNumber, // everything starts sealed
      open_vials: [], // nothing open yet
      quantity_total: totalAmount,
      quantity_remaining: totalAmount,
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

  // ---------- vial operations (write sealed_vials + open_vials, sync mirrors) ----------
  async function updateVials(item, newSealed, newOpenVials) {
    const size = parseFloat(item.vial_size);
    const synced = syncFields(newSealed, newOpenVials, size);
    const patch = {
      sealed_vials: newSealed,
      open_vials: newOpenVials,
      ...synced,
    };

    // optimistic local update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i))
    );
    setError("");

    const { error: updErr } = await supabase
      .from("inventory")
      .update(patch)
      .eq("id", item.id)
      .eq("user_id", userId);

    if (updErr) {
      setError(`Couldn't update "${item.peptide_name}": ${updErr.message}`);
      fetchInventory(userId); // revert to server truth
    }
  }

  function adjustSealed(item, delta) {
    const current = item.sealed_vials ?? 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    updateVials(item, next, Array.isArray(item.open_vials) ? item.open_vials : []);
  }

  function openAVial(item) {
    const sealed = item.sealed_vials ?? 0;
    const open = Array.isArray(item.open_vials) ? item.open_vials : [];
    if (sealed < 1 || open.length >= MAX_OPEN_VIALS) return;
    const size = parseFloat(item.vial_size);
    const newOpen = [...open, { remaining: size, opened_at: today }];
    updateVials(item, sealed - 1, newOpen);
  }

  function discardOpenVial(item, index) {
    const open = Array.isArray(item.open_vials) ? item.open_vials : [];
    const target = open[index];
    if (!target) return;
    const sure = window.confirm(
      `Discard this open vial? Its remaining ${cleanNum(target.remaining)} ${
        item.unit
      } will be written off and can't be recovered.`
    );
    if (!sure) return;
    const newOpen = open.filter((_, i) => i !== index);
    updateVials(item, item.sealed_vials ?? 0, newOpen);
  }

  function setOpenedDate(item, index, date) {
    const open = Array.isArray(item.open_vials) ? item.open_vials : [];
    const newOpen = open.map((v, i) =>
      i === index ? { ...v, opened_at: date || null } : v
    );
    updateVials(item, item.sealed_vials ?? 0, newOpen);
  }

  // ---------- per-product stats from dose history ----------
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

  // ---------- one card renderer: clean by default, "⋯" expands to edit ----------
  function renderVialCard(item, isBac) {
    const size = parseFloat(item.vial_size);
    const hasVials = size && size > 0;
    const total = parseFloat(item.quantity_total);
    const remaining = parseFloat(item.quantity_remaining);
    const stats = statsForItem(item);
    const isLow = !isBac && stats.percentRemaining <= LOW_STOCK_PERCENT;
    const openVials = Array.isArray(item.open_vials) ? item.open_vials : [];
    const sealed = item.sealed_vials ?? 0;
    const unitWord = isBac ? "bottle" : "vial";
    const editing = editingId === item.id;
    const percentOverall =
      total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;

    // oldest known open-vial age, for the collapsed summary line
    let oldestAge = null;
    for (const v of openVials) {
      const d = daysSince(v.opened_at);
      if (d !== null && (oldestAge === null || d > oldestAge)) oldestAge = d;
    }
    const oldestStale = oldestAge !== null && oldestAge > STALE_OPEN_DAYS;

    return (
      <div
        key={item.id}
        className={`bg-slate-900 border rounded-xl p-6 ${
          isLow ? "border-red-500/40" : "border-slate-800"
        }`}
      >
        {/* header */}
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
            <p className="text-xs text-slate-500 mt-0.5">
              {cleanNum(remaining)} of {cleanNum(total)} {item.unit} total
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingId(editing ? null : item.id)}
            className="text-slate-500 hover:text-white shrink-0"
            title={editing ? "Done editing" : "Edit"}
            aria-label={editing ? "Close editing" : "Edit"}
          >
            {editing ? (
              <Icon name="close" className="w-5 h-5" />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            )}
          </button>
        </div>

        {/* overall stock bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
          <div
            className={`h-2 rounded-full ${isLow ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${percentOverall}%` }}
          ></div>
        </div>

        {!editing ? (
          // ===================== SIMPLE VIEW =====================
          <>
            {hasVials ? (
              <p className="text-sm text-slate-400 mt-3">
                {openVials.length === 0
                  ? `${sealed} sealed ${unitWord}${sealed === 1 ? "" : "s"}`
                  : openVials.length === 1
                  ? `Open ${cleanNum(openVials[0].remaining)}/${cleanNum(size)} ${item.unit} · ${sealed} sealed`
                  : `${openVials.length} open ${unitWord}s · ${sealed} sealed`}
                {oldestAge !== null && (
                  <span className={oldestStale ? "text-amber-400" : "text-slate-500"}>
                    {" · "}
                    {openVials.length > 1 ? "oldest " : ""}
                    {openedAgeText(oldestAge)}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-3">
                {cleanNum(remaining)} of {cleanNum(total)} {item.unit} remaining (
                {stats.percentRemaining.toFixed(0)}%)
              </p>
            )}

            {!isBac && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
                <span>
                  <span className="text-slate-500">Days of supply </span>
                  <span className="text-white font-semibold">
                    {stats.daysLeft !== null ? `~${stats.daysLeft}` : "—"}
                  </span>
                </span>
                <span>
                  <span className="text-slate-500">Doses left </span>
                  <span className="text-white font-semibold">
                    {stats.dosesLeft !== null ? `~${stats.dosesLeft}` : "—"}
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
            )}

            {item.notes && (
              <p className="text-sm text-slate-500 mt-2">{item.notes}</p>
            )}
          </>
        ) : (
          // ===================== EDIT VIEW =====================
          <>
            {hasVials ? (
              <>
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    {openVials.length === 0
                      ? `No open ${unitWord}s`
                      : `Open ${unitWord}${openVials.length === 1 ? "" : "s"}`}
                  </p>

                  {openVials.length > 0 && (
                    <div className="space-y-2">
                      {openVials.map((v, i) => {
                        const vRemaining = parseFloat(v.remaining) || 0;
                        const pct =
                          size > 0
                            ? Math.max(0, Math.min(100, (vRemaining / size) * 100))
                            : 0;
                        const age = daysSince(v.opened_at);
                        const stale = age !== null && age > STALE_OPEN_DAYS;
                        return (
                          <div
                            key={i}
                            className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white font-semibold">
                                {cleanNum(vRemaining)}/{cleanNum(size)} {item.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => discardOpenVial(item, i)}
                                className="text-xs text-slate-500 hover:text-red-400"
                              >
                                Discard
                              </button>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                              <span className="text-slate-500">Opened</span>
                              <input
                                type="date"
                                value={v.opened_at || ""}
                                max={today}
                                onChange={(e) =>
                                  setOpenedDate(item, i, e.target.value)
                                }
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 [color-scheme:dark]"
                              />
                              {age !== null && (
                                <span
                                  className={stale ? "text-amber-400" : "text-slate-500"}
                                >
                                  {openedAgeText(age)}
                                  {stale ? " — check stability" : ""}
                                </span>
                              )}
                              {age === null && (
                                <span className="text-slate-600">set the date</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">
                      Sealed {unitWord}s
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustSealed(item, -1)}
                        disabled={sealed <= 0}
                        className={stepBtn}
                        aria-label={`Remove one sealed ${unitWord}`}
                      >
                        −
                      </button>
                      <span className="text-white font-semibold w-6 text-center">
                        {sealed}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustSealed(item, 1)}
                        className={stepBtn}
                        aria-label={`Add one sealed ${unitWord}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAVial(item)}
                    disabled={sealed < 1 || openVials.length >= MAX_OPEN_VIALS}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-medium text-sm px-4 py-2 rounded-lg border border-slate-700"
                  >
                    Open a {unitWord}
                  </button>
                </div>
                {openVials.length >= MAX_OPEN_VIALS && (
                  <p className="text-xs text-slate-600 mt-1">
                    Max {MAX_OPEN_VIALS} open {unitWord}s — finish or discard one
                    to open another.
                  </p>
                )}
                {sealed < 1 && openVials.length < MAX_OPEN_VIALS && (
                  <p className="text-xs text-slate-600 mt-1">
                    No sealed {unitWord}s left to open.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500 mt-3">
                This item has no vial size, so per-vial controls aren't available
                — you can still delete it below.
              </p>
            )}

            {/* danger + done */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete item
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold text-sm px-5 py-2 rounded-lg"
              >
                Done
              </button>
            </div>

            {item.notes && (
              <p className="text-sm text-slate-500 mt-3">{item.notes}</p>
            )}
          </>
        )}
      </div>
    );
  }

  // ---------- derived lists ----------
  const peptideItems = items.filter(
    (i) => (i.item_type || "peptide") === "peptide"
  );
  const bacItems = items.filter((i) => i.item_type === "bac_water");

  const sortedPeptides = [...peptideItems].sort(
    (a, b) =>
      statsForItem(a).percentRemaining - statsForItem(b).percentRemaining
  );

  const presets =
    itemType === "peptide" && peptideName ? VIAL_SIZES[peptideName] : null;

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
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Inventory
        </h1>
        <p className="text-slate-400 mt-1">
          Know exactly how much you have left and when to reorder.
        </p>
      </div>

      {/* summary cards */}
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

      {/* side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: stack + product cards */}
        <div className="space-y-4">
          <StackSummary />

          {peptideItems.length === 0 && bacItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-500">
                Nothing tracked yet — add your first vials with the form. Every
                dose you log subtracts from your open vial automatically.
              </p>
            </div>
          ) : (
            <>
              {sortedPeptides.map((item) => renderVialCard(item, false))}

              {bacItems.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Icon
                      name="droplet"
                      className="w-[18px] h-[18px] text-slate-400"
                    />
                    Bacteriostatic water
                  </h2>
                  <div className="space-y-4">
                    {bacItems.map((item) => renderVialCard(item, true))}
                  </div>
                  <p className="text-xs text-slate-600 mt-3">
                    Bac water isn't dosed, so it isn't auto-deducted — use the
                    controls above to open bottles or adjust your count.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: add form */}
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
                Cost ($CAD) <span className="text-slate-500">(optional)</span>
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