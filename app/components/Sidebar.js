"use client";

// ============================================================
// SIDEBAR (v10 — with guided tour)  —  goes in: app/components/Sidebar.js
// (FULL REPLACEMENT of v9.)
//
// Everything from v9 is unchanged: desktop sidebar, mobile hamburger drawer,
// shared NavList, logout. NEW in v10: a guided site tour (driver.js).
//
//   • A "Take a tour" button in both the desktop sidebar and the mobile drawer.
//   • The tour walks down the nav, highlighting each section with a one-liner.
//   • On mobile it opens the drawer first, then tours the drawer links.
//   • It auto-runs ONCE: the onboarding pop-up fires a `pt:start-tour` event
//     when a new user finishes it, and as a backup it auto-starts on the
//     dashboard for anyone who finished onboarding but hasn't toured yet.
//   • Finishing or closing the tour sets profiles.tour_completed = true.
//
// The tour steps are GENERATED FROM the `links` array + a descriptions map, so
// the tour stays in sync with the sidebar automatically: remove a link and its
// step disappears; add a link and you just drop one line in TOUR_DESCRIPTIONS.
//
// Requires:  npm install driver.js   and a `tour_completed` column on profiles.
// If Next complains about the CSS import below, move that one import line to
// app/layout.js instead.
// ============================================================

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "../lib/supabase";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/planner", label: "Planner", icon: "🧮" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/log", label: "Log Dose", icon: "💉" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/progress", label: "Progress", icon: "📊" },
  { href: "/insights", label: "Insights", icon: "🎯" },
  { href: "/report", label: "Doctor Report", icon: "📄" },
  { href: "/goals", label: "Goals & Streaks", icon: "🏆" },
  { href: "/lab-results", label: "Lab Results", icon: "🧪" },
  { href: "/side-effects", label: "Side Effects", icon: "⚠️" },
  { href: "/peptides", label: "Peptide Encyclopedia", icon: "📚" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// One line per section the tour should cover, keyed by href. To include a new
// sidebar link in the tour, add its href here. To drop one, remove it here (or
// just remove the link above — steps for missing links are skipped). Order below
// is the order the tour visits.
const TOUR_DESCRIPTIONS = {
  "/dashboard":
    "Your home base — today's schedule, your streak, weight, and inventory at a glance.",
  "/planner":
    "Build your protocol here: pick peptides, doses, and how often, then save it as a schedule.",
  "/inventory":
    "Track your vials and supplies so you always know exactly what's on hand.",
  "/log": "Record each injection. It updates your streak and draws down your inventory.",
  "/progress":
    "Log your weight and progress photos and watch the trend over time.",
  "/insights":
    "Charts and correlations that turn your logs into insight.",
  "/report": "Generate a clean PDF summary to share with a doctor.",
  "/peptides": "A reference encyclopedia for every peptide.",
  "/settings":
    "Your account, preferences, data export, and subscription live here.",
};

// Build the driver.js steps for a given nav container (desktop or mobile).
// Steps are derived from `links` + TOUR_DESCRIPTIONS, so they can never point at
// a link that no longer exists.
function buildSteps(scopeSelector) {
  const anchored = Object.keys(TOUR_DESCRIPTIONS)
    .filter((href) => links.some((l) => l.href === href))
    .map((href) => {
      const link = links.find((l) => l.href === href);
      return {
        element: `${scopeSelector} [data-tour="${href}"]`,
        popover: {
          title: link.label,
          description: TOUR_DESCRIPTIONS[href],
          side: "right",
          align: "start",
        },
      };
    });

  return [
    {
      popover: {
        title: "Welcome to Peptide Tracker",
        description:
          "A quick tour so you know where everything lives. You can exit anytime with Esc or the X.",
      },
    },
    ...anchored,
    {
      popover: {
        title: "You're all set",
        description:
          "That's the tour. A good first move: add your peptides in Inventory, then build a protocol in the Planner.",
      },
    },
  ];
}

// shared nav list (used by both the desktop sidebar and the mobile drawer)
function NavList({ pathname, onNavigate }) {
  return (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            data-tour={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              pathname === link.href
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// small "Take a tour" button used in both the desktop sidebar and mobile drawer
function TourButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>Take a tour</span>
    </button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const tourDoneRef = useRef(false);

  // close the drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // lock background scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ---- the guided tour ----
  async function markTourDone() {
    tourDoneRef.current = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("profiles")
        .update({ tour_completed: true })
        .eq("id", session.user.id);
    }
  }

  function startTour() {
    const mobile =
      typeof window !== "undefined" && window.innerWidth < 768;
    const scope = mobile ? "#tour-nav-mobile" : "#tour-nav-desktop";

    const run = () => {
      const d = driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        steps: buildSteps(scope),
        onDestroyed: () => {
          markTourDone();
          if (mobile) setOpen(false);
        },
      });
      d.drive();
    };

    if (mobile) {
      setOpen(true); // reveal the drawer so its links can be highlighted
      setTimeout(run, 400); // wait for the slide-in to settle
    } else {
      run();
    }
  }

  // Auto-run the tour once, and let the onboarding pop-up trigger it.
  useEffect(() => {
    let cancelled = false;

    async function maybeAutoRun() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("profiles")
        .select("tour_completed, onboarding_completed")
        .eq("id", session.user.id)
        .single();
      if (cancelled || !data) return;

      tourDoneRef.current = !!data.tour_completed;

      // backup auto-start: finished onboarding, hasn't toured, on the dashboard
      if (
        !data.tour_completed &&
        data.onboarding_completed &&
        pathname === "/dashboard"
      ) {
        setTimeout(() => {
          if (!cancelled && !tourDoneRef.current) startTour();
        }, 900);
      }
    }
    maybeAutoRun();

    // the onboarding pop-up dispatches this when a new user finishes it
    function onStartEvent() {
      if (!tourDoneRef.current) startTour();
    }
    window.addEventListener("pt:start-tour", onStartEvent);

    return () => {
      cancelled = true;
      window.removeEventListener("pt:start-tour", onStartEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* ---------- DESKTOP SIDEBAR ---------- */}
      <aside className="hidden md:flex w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 border-b border-slate-800">
          <span className="text-white font-bold text-xl">Peptide Tracker</span>
        </div>

        <div className="px-4 pt-4">
          <TourButton onClick={startTour} />
        </div>

        <nav id="tour-nav-desktop" className="flex-1 p-4">
          <NavList pathname={pathname} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 w-full"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ---------- MOBILE TOP BAR ---------- */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 p-1 text-slate-300 hover:text-white"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-white font-bold text-lg">Peptide Tracker</span>
      </header>

      {/* ---------- MOBILE DRAWER: dimmed backdrop ---------- */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ---------- MOBILE DRAWER: sliding panel ---------- */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[82%] bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-white font-bold text-lg">Peptide Tracker</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-1 text-slate-400 hover:text-white"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-4">
          <TourButton onClick={startTour} />
        </div>

        <nav id="tour-nav-mobile" className="flex-1 p-4 overflow-y-auto">
          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 w-full"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}