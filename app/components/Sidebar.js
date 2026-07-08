"use client";

// ============================================================
// SIDEBAR (v11 — peptide / non-peptide aware)  —  app/components/Sidebar.js
// (FULL REPLACEMENT of v10.)
//
// Everything from v10 is unchanged (desktop sidebar, mobile drawer, guided
// tour, logout). NEW in v11: the nav respects profiles.uses_peptides.
//
//   • Links flagged `peptideOnly: true` are hidden for users who aren't on
//     peptides, so a weight-loss-only user gets a focused nav.
//   • The tour follows whatever links are actually on screen (it filters to
//     steps whose element exists in the DOM), so non-peptide users get a
//     shorter tour of just their features — no dangling steps.
//
// To move a link between "everyone" and "peptide users only", just add or
// remove `peptideOnly: true` on it below. (Nothing else needs changing — the
// nav and the tour both derive from this one list.)
//
// Requires:  npm install driver.js  and a `tour_completed` column on profiles.
// If Next complains about the CSS import, move that one import line to
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
  { href: "/planner", label: "Planner", icon: "🧮", peptideOnly: true },
  { href: "/inventory", label: "Inventory", icon: "📦", peptideOnly: true },
  { href: "/log", label: "Log Dose", icon: "💉", peptideOnly: true },
  { href: "/calendar", label: "Calendar", icon: "📅", peptideOnly: true },
  { href: "/progress", label: "Progress", icon: "📊" },
  { href: "/insights", label: "Insights", icon: "🎯", peptideOnly: true },
  { href: "/report", label: "Doctor Report", icon: "📄", peptideOnly: true },
  { href: "/goals", label: "Goals & Streaks", icon: "🏆" },
  { href: "/lab-results", label: "Lab Results", icon: "🧪", peptideOnly: true },
  { href: "/side-effects", label: "Side Effects", icon: "⚠️", peptideOnly: true },
  { href: "/peptides", label: "Peptide Encyclopedia", icon: "📚", peptideOnly: true },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// One line per section the tour should cover, keyed by href, in visit order.
// Steps whose link isn't currently on screen are skipped automatically, so
// this list can safely include peptide-only sections.
const TOUR_DESCRIPTIONS = {
  "/dashboard":
    "Your home base — today's activity, your streak, and your weight at a glance.",
  "/planner":
    "Build your protocol here: pick peptides, doses, and how often, then save it as a schedule.",
  "/inventory":
    "Track your vials and supplies so you always know exactly what's on hand.",
  "/log": "Record each injection. It updates your streak and draws down your inventory.",
  "/progress":
    "Log your weight and progress photos and watch the trend over time.",
  "/goals": "Set goals and keep your logging streak alive.",
  "/insights": "Charts and correlations that turn your logs into insight.",
  "/report": "Generate a clean PDF summary to share with a doctor.",
  "/peptides": "A reference encyclopedia for every peptide.",
  "/settings":
    "Your account, preferences, data export, and subscription live here.",
};

// Build the driver.js steps for a given nav container (desktop or mobile).
// We keep only steps whose target element is actually rendered right now, so
// the tour matches what the user sees (peptide vs non-peptide) with no dangling
// steps pointing at links that aren't there.
function buildSteps(scopeSelector) {
  const anchored = Object.keys(TOUR_DESCRIPTIONS)
    .map((href) => ({
      href,
      selector: `${scopeSelector} [data-tour="${href}"]`,
    }))
    .filter(
      ({ selector }) =>
        typeof document !== "undefined" && document.querySelector(selector)
    )
    .map(({ href, selector }) => {
      const link = links.find((l) => l.href === href);
      return {
        element: selector,
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
          "That's the tour. A good first move: fill in the \"Get started\" checklist on your dashboard.",
      },
    },
  ];
}

// shared nav list (used by both the desktop sidebar and the mobile drawer)
function NavList({ items, pathname, onNavigate }) {
  return (
    <ul className="space-y-1">
      {items.map((link) => (
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
  const [usesPeptides, setUsesPeptides] = useState(true);
  const tourDoneRef = useRef(false);

  // which links to show for this user
  const visibleLinks = usesPeptides
    ? links
    : links.filter((l) => !l.peptideOnly);

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

  // Fetch the user's mode + tour state; auto-run the tour once; and let the
  // onboarding pop-up trigger it.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("profiles")
        .select("tour_completed, onboarding_completed, uses_peptides")
        .eq("id", session.user.id)
        .single();
      if (cancelled || !data) return;

      setUsesPeptides(data.uses_peptides ?? true);
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
    init();

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
          <NavList items={visibleLinks} pathname={pathname} />
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
          <NavList
            items={visibleLinks}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
          />
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