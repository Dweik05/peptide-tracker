// ============================================================
// STRIPE WEBHOOK  —  app/api/stripe/webhook/route.js
//
// Stripe calls this endpoint when things happen to a subscription
// (payment completed, renewed, canceled, payment failed). We verify
// the event is genuinely from Stripe using the raw request body + your
// signing secret, then write the subscription's state onto the user's
// profile. Only the service role may touch the billing columns, so this
// runs with the master key.
//
// IMPORTANT: the raw body (await request.text()) is required for
// signature verification -- do NOT parse it as JSON first.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../../lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Translate a Stripe subscription status into our own vocabulary.
function mapStatus(stripeStatus) {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      // incomplete, incomplete_expired, paused, etc. -> treat as no access
      return "free";
  }
}

// Server-side (service-role) client -- the only identity allowed to write
// the billing columns your trigger protects.
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Copy a subscription's current state onto the matching profile row.
async function syncSubscriptionToProfile(subscription) {
  const supabaseAdmin = admin();

  // As of recent Stripe API versions the billing period lives on the
  // subscription ITEM, not the subscription itself.
  const item =
    subscription.items && subscription.items.data
      ? subscription.items.data[0]
      : null;

  const priceId = item && item.price ? item.price.id : null;

  const periodEndUnix =
    item && item.current_period_end
      ? item.current_period_end
      : subscription.current_period_end || null;

  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_status: mapStatus(subscription.status),
      subscription_end_date: periodEnd,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
    })
    .eq("stripe_customer_id", subscription.customer);

  if (error) throw new Error("Profile update failed: " + error.message);
}

export async function POST(request) {
  // 1) Verify the event is really from Stripe, using the RAW body.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return Response.json(
      { error: "Signature verification failed: " + err.message },
      { status: 400 }
    );
  }

  // 2) Handle the events we care about.
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );
          await syncSubscriptionToProfile(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscriptionToProfile(event.data.object);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const supabaseAdmin = admin();
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            stripe_subscription_id: null,
            stripe_price_id: null,
          })
          .eq("stripe_customer_id", subscription.customer);
        if (error) throw new Error("Profile update failed: " + error.message);
        break;
      }

      default:
        // Other event types are ignored.
        break;
    }
  } catch (err) {
    // A 500 tells Stripe to retry the event later.
    return Response.json({ error: err.message }, { status: 500 });
  }

  // 3) Acknowledge receipt so Stripe stops resending.
  return Response.json({ received: true });
}