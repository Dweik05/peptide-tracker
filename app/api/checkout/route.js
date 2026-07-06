import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../lib/stripe";

export const dynamic = "force-dynamic";

const PRICE_BY_PLAN = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
};

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

    const body = await request.json().catch(() => ({}));
    const priceId = PRICE_BY_PLAN[body.plan];
    if (!priceId) {
      return Response.json({ error: "Unknown plan." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return Response.json(
        { error: "Could not read your profile: " + profileError.message },
        { status: 500 }
      );
    }

    let customerId = profile ? profile.stripe_customer_id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || (profile ? profile.email : undefined) || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const { error: saveError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (saveError) {
        return Response.json(
          { error: "Could not save your Stripe customer: " + saveError.message },
          { status: 500 }
        );
      }
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
    });

    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}