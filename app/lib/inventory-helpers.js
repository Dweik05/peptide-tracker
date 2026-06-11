// ============================================================
// SHARED INVENTORY HELPERS  —  goes in:
// app/lib/inventory-helpers.js
// (NEW FILE — create it next to peptides.js and supabase.js)
//
// The auto-deduct logic, moved out of /log so the dashboard's
// quick-log modal runs the EXACT same code. One implementation,
// two places that log doses, zero drift.
// ============================================================

import { supabase } from "./supabase";
import { convertAmount } from "./peptides";

// Turns 0.30000000000000004 into "0.3" for friendly messages.
function trimNumber(value) {
  return parseFloat(value.toFixed(4)).toString();
}

// After a dose saves, find this user's inventory products with
// the same peptide name (case-insensitive) and subtract the
// dose — oldest product first, spilling into the next vial if
// the first runs out. Returns { message, warning } describing
// what happened. The dose itself is ALWAYS saved first —
// inventory hiccups never block logging.
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

  // No matching product at all → stay silent (inventory is optional)
  if (!products || products.length === 0) {
    return { message: "", warning: "" };
  }

  // Keep only products whose unit we can convert this dose into
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

  let leftToDeduct = amount; // tracked in the dose's unit
  const messages = [];
  let lowStock = null;

  for (const product of withStock) {
    if (leftToDeduct <= 0) break;

    const inProductUnit = convertAmount(leftToDeduct, doseUnit, product.unit);
    const available = parseFloat(product.quantity_remaining);
    const take = Math.min(inProductUnit, available);
    const newRemaining = parseFloat(Math.max(0, available - take).toFixed(6));

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ quantity_remaining: newRemaining })
      .eq("id", product.id)
      .eq("user_id", userId);

    if (updateError) {
      return {
        message: messages.join(" "),
        warning: `Dose saved, but updating inventory failed: ${updateError.message}`,
      };
    }

    messages.push(
      `Deducted ${trimNumber(take)} ${product.unit} from "${product.peptide_name}" — ${trimNumber(newRemaining)} ${product.unit} left.`
    );

    const total = parseFloat(product.quantity_total);
    if (total > 0 && (newRemaining / total) * 100 <= 20) {
      lowStock = {
        name: product.peptide_name,
        percent: Math.round((newRemaining / total) * 100),
      };
    }

    // reduce what's left to deduct (converted back to dose units)
    leftToDeduct = leftToDeduct - convertAmount(take, product.unit, doseUnit);
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