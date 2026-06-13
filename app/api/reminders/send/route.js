// ============================================================
// EMAIL REMINDER ROUTE  —  goes in:
//   app/api/reminders/send/route.js
// (NEW — create the folders:  api  →  reminders  →  send
//  inside app/, then a "route.js" inside "send".
//  NOTE: route.js, NOT page.js — that's what makes it an API
//  route instead of a page.)
//
// Day 20 · Chunk C: your first backend route.
//
// WHAT THIS IS: files at app/api/.../route.js never render in
// the browser. They run ONLY on the server and answer web
// requests at their URL — this one answers GET requests at
//   /api/reminders/send
// Because this code never leaves the server, it can safely use
// secret keys that must never appear in browser code.
//
// WHAT IT DOES when called (by you in dev, by Vercel Cron once
// deployed — once per day):
//   1. Checks the caller knows CRON_SECRET (strangers get 401)
//   2. Finds every ACTIVE schedule with email reminders ON
//      where TODAY is a dose day (same isDoseDay math as the
//      calendar — they can never disagree)
//   3. Skips any schedule already reminded today
//   4. Sends ONE digest email per user via Resend
//   5. Stamps last_reminder_sent = today so a second run the
//      same day sends nothing
//
// It uses the SERVICE ROLE key — the server "master key" that
// bypasses Row Level Security. That's required here because no
// user is logged in (a clock is calling this, not a person) and
// it must read every user's schedules. It's also why this route
// keeps working after we properly re-enable RLS on Days 33–34.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { dateFromString, isDoseDay } from "../../../lib/schedule-helpers";

// Never cache this route — it must run fresh every time.
export const dynamic = "force-dynamic";

// "Today" is computed in THIS timezone no matter where the
// server runs (Vercel servers think in UTC). Per-user timezones
// can come later with the Settings page.
const APP_TIMEZONE = "America/Toronto";

// Until you verify a real domain with Resend (launch week),
// only this sender works — and it only delivers to YOUR OWN
// Resend account email. Swap to your domain at launch.
const FROM_ADDRESS = "Peptide Tracker <onboarding@resend.dev>";

// today as "YYYY-MM-DD" in the app timezone (en-CA formats
// dates exactly that way — handy)
function todayStringInAppTimezone() {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

export async function GET(request) {
  // ---------- 1. gatekeeping ----------
  // Accepted either way:
  //   - Authorization: Bearer <CRON_SECRET>   (how Vercel Cron calls it)
  //   - ?secret=<CRON_SECRET>                 (easy browser testing in dev)
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const authorized =
    secret && (authHeader === `Bearer ${secret}` || querySecret === secret);

  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { error: "Missing RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY in env." },
      { status: 500 }
    );
  }

  // ---------- 2. server-side Supabase client (master key) ----------
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const todayString = todayStringInAppTimezone();
  const today = dateFromString(todayString);

  // ---------- 3. which schedules are due today? ----------
  const { data: schedules, error } = await supabaseAdmin
    .from("reminders")
    .select("*")
    .eq("active", true)
    .eq("email_reminders", true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const due = (schedules || []).filter(
    (schedule) =>
      isDoseDay(schedule, today) &&
      schedule.last_reminder_sent !== todayString // not already reminded today
  );

  if (due.length === 0) {
    return Response.json({
      date: todayString,
      message: "No reminders due today.",
      schedulesChecked: (schedules || []).length,
    });
  }

  // ---------- 4. group due schedules by user ----------
  const byUser = {};
  for (const schedule of due) {
    if (!byUser[schedule.user_id]) byUser[schedule.user_id] = [];
    byUser[schedule.user_id].push(schedule);
  }

  const prettyDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ---------- 5. one digest email per user ----------
  const results = [];
  const sentScheduleIds = [];

  for (const [userId, userSchedules] of Object.entries(byUser)) {
    // look up the user's login email (admin API — service role only)
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData && userData.user ? userData.user.email : null;

    if (userError || !email) {
      results.push({ userId, sent: false, reason: "no email found for user" });
      continue;
    }

    const listItems = userSchedules
      .map(
        (s) =>
          `<li style="margin:6px 0;"><strong>${s.peptide_name}</strong> &mdash; ${s.dose_amount} ${s.unit}</li>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0f172a;margin:0 0 4px;">Today's doses</h2>
        <p style="color:#475569;margin:0 0 16px;">${prettyDate}</p>
        <ul style="color:#0f172a;font-size:15px;padding-left:20px;">${listItems}</ul>
        <p style="color:#64748b;font-size:12px;margin-top:24px;">
          You're receiving this because email reminders are turned on for
          these schedules in Peptide Tracker. You can pause a schedule or
          turn its emails off any time on your Calendar page. This is a
          reminder of a schedule you created &mdash; not medical advice.
        </p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: email,
        subject: `Your doses for ${prettyDate}`,
        html: html,
      }),
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text();
      results.push({ email, sent: false, reason: body });
      continue;
    }

    results.push({ email, sent: true, doses: userSchedules.length });
    for (const s of userSchedules) sentScheduleIds.push(s.id);
  }

  // ---------- 6. stamp them as reminded today ----------
  if (sentScheduleIds.length > 0) {
    await supabaseAdmin
      .from("reminders")
      .update({ last_reminder_sent: todayString })
      .in("id", sentScheduleIds);
  }

  return Response.json({
    date: todayString,
    dueSchedules: due.length,
    results: results,
  });
}