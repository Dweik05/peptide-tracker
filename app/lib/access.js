// app/lib/access.js
// ------------------------------------------------------------
// Single source of truth for "does this user have premium access?"
//
// Premium access = a paid subscription that's active, OR a trial that hasn't
// run out yet. The 14-day trial is managed in our own database (there is no
// Stripe subscription during a trial), so we check its end date here instead
// of waiting for a webhook to expire it.
// ------------------------------------------------------------

// Postgres timestamps come back like "2027-07-05 15:36:48" (a space, not a
// "T"), which iOS Safari mis-parses. Normalize before handing it to Date().
function parseTimestamp(value) {
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

// Does this profile have premium access right now?
export function hasPremiumAccess(profile) {
  if (!profile) return false;

  const status = profile.subscription_status;

  if (status === "active") return true;

  if (status === "trialing") {
    const end = parseTimestamp(profile.subscription_end_date);
    return end ? end.getTime() > Date.now() : false;
  }

  // free, past_due, canceled -> no access
  return false;
}

// Whole days left in a trial (0 if not trialing or already expired).
// Handy for a "X days left in your trial" banner.
export function trialDaysLeft(profile) {
  if (!profile || profile.subscription_status !== "trialing") return 0;
  const end = parseTimestamp(profile.subscription_end_date);
  if (!end) return 0;
  const ms = end.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
}