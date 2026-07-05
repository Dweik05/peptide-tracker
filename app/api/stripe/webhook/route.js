// ============================================================
// STRIPE WEBHOOK  —  app/api/stripe/webhook/route.js
//
// Stripe calls this endpoint when a subscription changes (payment
// completed, renewed, canceled, payment failed). We verify the event is
// genuinely from Stripe using the raw request body + your signing secret,
// then write the subscription's state onto the user's profile. Only the
// service role may touch the billing columns, so this uses the master key.
//
// IMPORTANT: the raw body (await request.text()) is required for signature
// verification -- do NOT parse it as JSON first.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../../lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      return "free";
  }
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function syncSubscriptionToProfile(subscription) {
  const supabaseAdmin = admin();

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
    console.error("[webhook] signature verification failed:", err.message);
    return Response.json(
      { error: "Signature verification failed." },
      { status: 400 }
    );
  }

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
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err.message);
    return Response.json({ error: "Webhook handler error." }, { status: 500 });
  }

  return Response.json({ received: true });
}