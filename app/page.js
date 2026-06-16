// ============================================================
// LANDING PAGE  —  goes in:  app/page.js  (your site's root "/")
//
// This REPLACES whatever app/page.js currently does (likely a
// redirect to /login or /dashboard). It's a public marketing
// homepage — the "front door" Stripe's reviewers (and your future
// users) will see. Your actual app pages stay behind login.
//
// It's a plain server component (no "use client") — there's no
// interactivity, just links, so it loads fast and needs no state.
//
// THREE THINGS TO CHECK after you paste it in:
//   1. The buttons link to "/signup" and "/login". If your auth
//      routes use different paths, change them (search this file
//      for href="/signup" and href="/login").
//   2. Make sure "/" is publicly reachable. If you have auth
//      middleware that redirects logged-out visitors, add "/" (and
//      "/signup", "/login") to its public/allowed list, or the
//      homepage will bounce people to login.
//   3. Fill in the support email in the footer (search for
//      "your-support-email").
// ============================================================

import Link from "next/link";

export const metadata = {
  title: "Peptide Tracker — Your protocol, organized",
  description:
    "A private dashboard for people following peptide protocols. Log doses, follow your schedule, and track your progress — weight, measurements, and photos — all in one place.",
};

// Plain-language feature list. Each says what YOU do, not how it's built.
const FEATURES = [
  {
    title: "Dose logging",
    body: "Log every dose in seconds — compound, amount, injection site, and time — with a body map for rotating sites.",
  },
  {
    title: "Schedules & reminders",
    body: "Set your protocol up once and get email reminders on dose days, titration schedules included.",
  },
  {
    title: "Progress tracking",
    body: "Chart your weight, body measurements, and before-and-after photos over time on one timeline.",
  },
  {
    title: "Inventory",
    body: "Keep track of your vials and supplies so you always know what's on hand and when you're running low.",
  },
  {
    title: "Reference library",
    body: "A clear, at-a-glance reference for common compounds, organized so you can find what you need.",
  },
  {
    title: "Private by default",
    body: "Your data stays tied to your account. No public profiles, no sharing you didn't ask for.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ---------- top nav ---------- */}
      <header className="border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">
            Peptide<span className="text-emerald-400">Tracker</span>
          </span>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-300 hover:text-white px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden">
        {/* subtle emerald glow behind the headline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[42rem] max-w-full rounded-full bg-emerald-500/15 blur-3xl"
        />
        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
          <p className="text-sm font-medium text-emerald-400 mb-4">
            Your protocol, organized
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Track your peptide protocol,
            <br className="hidden sm:block" /> all in one place.
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
            Log your doses, follow your schedule, and watch your progress —
            weight, measurements, and photos — in one private dashboard built
            for people on peptide protocols.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold px-8 py-3 rounded-lg border border-slate-800"
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            14-day free trial · cancel anytime
          </p>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Everything in one place
          </h2>
          <p className="mt-3 text-slate-400">
            The bits you'd otherwise juggle across notes apps, spreadsheets,
            and your camera roll — together, and built for this.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Simple pricing
          </h2>
          <p className="mt-3 text-slate-400">
            One plan, everything included. Start with a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* monthly */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col">
            <h3 className="font-semibold text-white">Monthly</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$9.99</span>
              <span className="text-slate-500">/ month</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Billed monthly. Cancel anytime.
            </p>
            <Link
              href="/signup"
              className="mt-6 text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg border border-slate-700"
            >
              Start free trial
            </Link>
          </div>

          {/* yearly — highlighted */}
          <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-8 flex flex-col relative">
            <span className="absolute -top-3 left-8 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Best value
            </span>
            <h3 className="font-semibold text-white">Yearly</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$79.99</span>
              <span className="text-slate-500">/ year</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              About $6.67/month — roughly a third off the monthly price.
            </p>
            <Link
              href="/signup"
              className="mt-6 text-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- compliance / trust ---------- */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-400 leading-relaxed">
            Peptide Tracker is a personal tracking tool — not a pharmacy or a
            medical provider. We don't sell, supply, or recommend any
            compounds, and nothing in the app is medical advice. Always work
            with a qualified healthcare professional about your health.
          </p>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            © {new Date().getFullYear()} Peptide Tracker
          </span>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-300">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-slate-300">
              Get started
            </Link>
            <a
              href="mailto:your-support-email@example.com"
              className="hover:text-slate-300"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}