"use client";

// ============================================================
// SIDEBAR (v9)  —  goes in:  app/components/Sidebar.js
// (FULL REPLACEMENT of v8.)
//
// Mobile-friendly navigation:
//   • Desktop (md and up): the same fixed left sidebar as before — unchanged.
//   • Mobile (below md): the sidebar is hidden. Instead there's a slim top bar
//     with a hamburger button that slides open a menu drawer. Tapping a link,
//     the X, or the dimmed background closes it. Body scroll locks while open.
//
// Same links, same logout. The links list is shared between the desktop
// sidebar and the mobile drawer via the <NavList> helper, so there's only
// one place to edit them.
// ============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/gym", label: "Gym PRs", icon: "🏋️" },
  { href: "/peptides", label: "Peptide Encyclopedia", icon: "📚" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// shared nav list (used by both the desktop sidebar and the mobile drawer)
function NavList({ pathname, onNavigate }) {
  return (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* ---------- DESKTOP SIDEBAR (unchanged look) ---------- */}
      <aside className="hidden md:flex w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 border-b border-slate-800">
          <span className="text-white font-bold text-xl">Peptide Tracker</span>
        </div>

        <nav className="flex-1 p-4">
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

        <nav className="flex-1 p-4 overflow-y-auto">
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