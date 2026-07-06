// ============================================================
// STRIPE BILLING PORTAL  —  app/api/portal/route.js
//
// Creates a Stripe Customer Portal session for the signed-in user and
// returns its URL. The browser redirects there so the user can cancel,
// update their card, or view invoices. Requires the Customer Portal to
// be configured+saved once in the Stripe Dashboard (per sandbox).
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return Response.json({ error: "You're not signed in." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return Response.json(
        { error: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return Response.json(
        { error: "Could not read your profile: " + profileError.message },
        { status: 500 }
      );
    }
    if (!profile || !profile.stripe_customer_id) {
      return Response.json(
        { error: "No subscription to manage yet." },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}