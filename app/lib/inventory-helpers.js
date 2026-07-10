// ============================================================
// SHARED INVENTORY HELPERS  —  goes in:  app/lib/inventory-helpers.js
// (FULL REPLACEMENT — updated for the explicit open-vials model.)
//
// The auto-deduct logic used by BOTH /log and the dashboard quick-log.
// One implementation, zero drift.
//
// New behaviour (matches the inventory page):
//   • A dose drains the OLDEST open vial first (by opened_at; unknown = oldest),
//     spilling into the next-oldest as needed.
//   • When all open vials are dry, it AUTO-OPENS a sealed vial (dated today) and
//     keeps draining — so logging a dose from all-sealed stock "just works" and
//     stamps the opened date for you.
//   • Emptied vials are removed; sealed_vials / open_vials and the mirror fields
//     (quantity_remaining, quantity_total, vial_count) are all kept in sync.
//   • Legacy rows with no vial_size fall back to the old single-number drain.
//
// The dose is ALWAYS saved first by the caller — inventory hiccups never block
// logging. Signature and return shape are unchanged: { message, warning }.
// ============================================================

import { supabase } from "./supabase";
import { convertAmount } from "./peptides";

const LOW_STOCK_PERCENT = 20;

function trimNumber(value) {
  return parseFloat(value.toFixed(4)).toString();
}

function round4(n) {
  return parseFloat(parseFloat(n).toFixed(4));
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Recompute the mirror fields from the source of truth. Must match the
// inventory page's syncFields exactly.
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

// Index of the oldest open vial by opened_at. A null/unknown date counts as
// oldest (drain the mystery-age vial first).
function oldestOpenIndex(openVials) {
  let bestIdx = -1;
  let bestKey = Infinity;
  for (let i = 0; i < openVials.length; i++) {
    const oa = openVials[i].opened_at;
    const key = oa
      ? new Date(oa.length === 10 ? `${oa}T12:00:00` : oa).getTime()
      : -Infinity;
    if (key < bestKey) {
      bestKey = key;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Drain `need` (in the product's unit) from one product's vials, oldest open
// first, auto-opening sealed vials as needed. Returns how much was actually
// taken plus the new sealed count and open-vial list.
function drainProduct(product, need, size, todayStr) {
  let sealed = product.sealed_vials ?? 0;
  let open = Array.isArray(product.open_vials)
    ? product.open_vials.map((v) => ({
        remaining: parseFloat(v.remaining) || 0,
        opened_at: v.opened_at ?? null,
      }))
    : [];
  let taken = 0;
  let guard = 0;

  while (need > 1e-9 && guard < 10000) {
    guard++;

    // make sure a vial is open to draw from
    if (open.length === 0) {
      if (sealed > 0) {
        sealed -= 1;
        open.push({ remaining: size, opened_at: todayStr });
      } else {
        break; // nothing left in this product
      }
    }

    const idx = oldestOpenIndex(open);
    if (idx === -1) break;

    const avail = open[idx].remaining;
    const take = Math.min(avail, need);
    open[idx].remaining = round4(avail - take);
    taken = round4(taken + take);
    need = round4(need - take);

    if (open[idx].remaining <= 1e-9) {
      open.splice(idx, 1); // vial emptied — it's gone
    }
  }

  return { taken, sealed, open };
}

// After a dose saves, subtract it from this user's inventory products with the
// same peptide name (case-insensitive), oldest product first.
export async function deductFromInventory(userId, name, amount, doseUnit) {
  const { data: products, error: invError } = await supabase
    .from("inventory")
    .select("*")
    .eq("user_id", userId)
    .ilike("peptide_name", name)
    .order("created_at", { ascending: true });

  if (invError) {
    return {
      message: "",
      warning: `Dose saved, but inventory couldn't be checked: ${invError.message}`,
    };
  }

  if (!products || products.length === 0) {
    return { message: "", warning: "" };
  }

  const compatible = products.filter(
    (product) => convertAmount(1, doseUnit, product.unit) !== null
  );

  if (compatible.length === 0) {
    return {
      message: "",
      warning: `Heads up: "${name}" is in your inventory in ${products[0].unit}, but this dose is in ${doseUnit} — couldn't auto-deduct.`,
    };
  }

  const withStock = compatible.filter(
    (product) => parseFloat(product.quantity_remaining) > 0
  );

  if (withStock.length === 0) {
    return {
      message: "",
      warning: `Your "${name}" inventory is empty — dose logged, but there was nothing left to deduct.`,
    };
  }

  const todayStr = getTodayString();
  let leftToDeduct = amount; // tracked in the dose's unit
  const messages = [];
  let lowStock = null;

  for (const product of withStock) {
    if (leftToDeduct <= 1e-9) break;

    const size = parseFloat(product.vial_size);
    const hasVials = size && size > 0;
    const needInProductUnit = convertAmount(leftToDeduct, doseUnit, product.unit);

    let patch;
    let takenInProductUnit;

    if (hasVials) {
      const { taken, sealed, open } = drainProduct(
        product,
        needInProductUnit,
        size,
        todayStr
      );
      takenInProductUnit = taken;
      patch = {
        sealed_vials: sealed,
        open_vials: open,
        ...syncFields(sealed, open, size),
      };
    } else {
      // legacy row (no vial model): drain the single remaining number
      const available = parseFloat(product.quantity_remaining);
      takenInProductUnit = Math.min(available, needInProductUnit);
      patch = {
        quantity_remaining: round4(Math.max(0, available - takenInProductUnit)),
      };
    }

    if (takenInProductUnit <= 1e-9) continue; // took nothing here

    const { error: updateError } = await supabase
      .from("inventory")
      .update(patch)
      .eq("id", product.id)
      .eq("user_id", userId);

    if (updateError) {
      return {
        message: messages.join(" "),
        warning: `Dose saved, but updating inventory failed: ${updateError.message}`,
      };
    }

    const newRemaining = patch.quantity_remaining;
    messages.push(
      `Deducted ${trimNumber(takenInProductUnit)} ${product.unit} from "${product.peptide_name}" — ${trimNumber(newRemaining)} ${product.unit} left.`
    );

    const total = parseFloat(
      patch.quantity_total !== undefined
        ? patch.quantity_total
        : product.quantity_total
    );
    if (total > 0 && (newRemaining / total) * 100 <= LOW_STOCK_PERCENT) {
      lowStock = {
        name: product.peptide_name,
        percent: Math.round((newRemaining / total) * 100),
      };
    }

    // reduce what's left (convert what we took back into the dose's unit)
    leftToDeduct =
      leftToDeduct - convertAmount(takenInProductUnit, product.unit, doseUnit);
  }

  let warning = "";
  if (leftToDeduct > 0.000001) {
    warning = `Your "${name}" inventory didn't have enough to cover the full dose (${trimNumber(leftToDeduct)} ${doseUnit} uncovered).`;
  }
  if (lowStock) {
    warning =
      (warning ? warning + " " : "") +
      `⚠️ Low stock: "${lowStock.name}" is at ${lowStock.percent}% — time to reorder.`;
  }

  return { message: messages.join(" "), warning };
}