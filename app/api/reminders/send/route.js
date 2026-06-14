// ============================================================
// EMAIL REMINDER ROUTE  —  goes in:
//   app/api/reminders/send/route.js
// (FULL REPLACEMENT of the Chunk C / Day 20 version.)
//
// Day 22 · Chunk A: ONE change — the digest now states the dose
// that applies TODAY (via doseOnDate), so a titrated schedule
// emails "0.5 mg" early on and "1 mg" later. Flat schedules are
// unaffected. Everything else (the secret gate, the service-role
// client, the dedupe stamp) is identical to before.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import {
  dateFromString,
  isDoseDay,
  doseOnDate,
} from "../../../lib/schedule-helpers";

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

// today as "YYYY-MM-DD" in the app timezone
function todayStringInAppTimezone() {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

export async function GET(request) {
  // ---------- 1. gatekeeping ----------
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
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    const email = userData && userData.user ? userData.user.email : null;

    if (userError || !email) {
      results.push({ userId, sent: false, reason: "no email found for user" });
      continue;
    }

    // dose that applies TODAY for each schedule (titration-aware)
    const listItems = userSchedules
      .map(
        (s) =>
          `<li style="margin:6px 0;"><strong>${s.peptide_name}</strong> &mdash; ${doseOnDate(
            s,
            today
          )} ${s.unit}</li>`
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

  // ---------- 7. weekly weigh-in reminders ----------
  // Independent of dose reminders. For each opted-in user, send a nudge
  // only if they're overdue (no weigh-in in the last 7 days) AND we
  // haven't already reminded them in the last 7 days (weekly dedupe).
  const weighinResults = [];
  const SEVEN_DAYS_MS = 7 * 86400000;

  const { data: weighinProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, last_weighin_reminder_sent")
    .eq("weekly_weighin_email", true);

  for (const profile of weighinProfiles || []) {
    const uid = profile.id;

    // dedupe: already reminded within the last 7 days? skip.
    if (profile.last_weighin_reminder_sent) {
      const lastSent = dateFromString(profile.last_weighin_reminder_sent);
      if (today.getTime() - lastSent.getTime() < SEVEN_DAYS_MS) continue;
    }

    // not overdue: weighed in within the last 7 days? skip.
    const sevenAgoIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    const { data: recentWeight } = await supabaseAdmin
      .from("weight_logs")
      .select("id")
      .eq("user_id", uid)
      .gte("logged_at", sevenAgoIso)
      .limit(1);
    if (recentWeight && recentWeight.length > 0) continue;

    // look up their email
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(uid);
    const email = userData && userData.user ? userData.user.email : null;
    if (userError || !email) {
      weighinResults.push({ userId: uid, sent: false, reason: "no email found" });
      continue;
    }

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0f172a;margin:0 0 4px;">Time for your weekly weigh-in</h2>
        <p style="color:#475569;margin:0 0 16px;">${prettyDate}</p>
        <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">
          You haven't logged your weight in a little while. A quick weigh-in
          keeps your progress charts accurate.
        </p>
        <p style="color:#64748b;font-size:12px;margin-top:24px;">
          You're receiving this because weekly weigh-in reminders are turned
          on in Peptide Tracker. You can turn them off any time from your
          dashboard. This is a reminder you set up &mdash; not medical advice.
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
        subject: "Your weekly weigh-in reminder",
        html: html,
      }),
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text();
      weighinResults.push({ email, sent: false, reason: body });
      continue;
    }

    weighinResults.push({ email, sent: true });
    await supabaseAdmin
      .from("profiles")
      .update({ last_weighin_reminder_sent: todayString })
      .eq("id", uid);
  }

  return Response.json({
    date: todayString,
    dueSchedules: due.length,
    results: results,
    weighinReminders: weighinResults,
  });
}