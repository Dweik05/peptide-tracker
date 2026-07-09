"use client";

// ============================================================
// TOP NAV  —  goes in:  app/components/TopNav.js
//
// Horizontal top navigation that replaces the sidebar. The 13 pages are
// grouped into a few menus so the nav reads as ~5 ideas, not 13 links.
//
//   • Desktop (md+): a sticky top bar. Dashboard is a direct link; Protocol,
//     Progress, Insights, and Learn are click-to-open dropdown menus. Settings
//     and Log out sit on the right.
//   • Mobile (below md): a slim top bar with a hamburger that opens a drawer,
//     with the same groups shown as labelled sections.
//
// Respects profiles.uses_peptides — items marked peptideOnly are hidden for
// non-peptide users, and a group with no visible items hides entirely.
//
// NOTE: the guided tour is NOT wired in here yet — it's being re-attached to
// the top nav as a separate step. (The onboarding pop-up still dispatches
// "pt:start-tour"; nothing listens for it until the tour is added back, which
// is a harmless no-op in the meantime.)
//
// Mount it in app/(app)/layout.js in place of <Sidebar /> (see chat).
// ============================================================

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

// Nav model: standalone links + grouped menus. Order here = display order.
// To move a page between groups, move its entry. To change what non-peptide
// users see, toggle `peptideOnly` on the item.
const NAV = [
  { type: "link", href: "/dashboard", label: "Dashboard" },
  {
    type: "group",
    key: "protocol",
    label: "Protocol",
    items: [
      { href: "/inventory", label: "Inventory", icon: "📦", peptideOnly: true },
      { href: "/planner", label: "Planner", icon: "🧮", peptideOnly: true },
      { href: "/log", label: "Log Dose", icon: "💉", peptideOnly: true },
      { href: "/calendar", label: "Calendar", icon: "📅", peptideOnly: true },
    ],
  },
  {
    type: "group",
    key: "progress",
    label: "Progress",
    items: [
      { href: "/progress", label: "Progress", icon: "📊" },
      { href: "/goals", label: "Goals & Streaks", icon: "🏆" },
      { href: "/lab-results", label: "Lab Results", icon: "🧪", peptideOnly: true },
      { href: "/side-effects", label: "Side Effects", icon: "⚠️", peptideOnly: true },
    ],
  },
  {
    type: "group",
    key: "insights",
    label: "Insights",
    items: [
      { href: "/insights", label: "Insights", icon: "🎯", peptideOnly: true },
      { href: "/report", label: "Doctor Report", icon: "📄", peptideOnly: true },
    ],
  },
  {
    type: "group",
    key: "learn",
    label: "Learn",
    items: [
      { href: "/peptides", label: "Peptide Encyclopedia", icon: "📚", peptideOnly: true },
      { href: "/supplies", label: "Supplies", icon: "🛒", peptideOnly: true },
    ],
  },
];

function itemsFor(items, usesPeptides) {
  return items.filter((i) => usesPeptides || !i.peptideOnly);
}

function groupIsActive(items, pathname) {
  return items.some((i) => i.href === pathname);
}

const linkBase =
  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [usesPeptides, setUsesPeptides] = useState(true);
  const [openGroup, setOpenGroup] = useState(null); // desktop dropdown key
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer
  const navRef = useRef(null);

  // load peptide mode
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("uses_peptides")
        .eq("id", session.user.id)
        .single();
      if (!cancelled && data) setUsesPeptides(data.uses_peptides ?? true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // close menus on route change
  useEffect(() => {
    setOpenGroup(null);
    setDrawerOpen(false);
  }, [pathname]);

  // close the desktop dropdown when clicking outside the nav
  useEffect(() => {
    function onDocMouseDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // lock background scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const groups = NAV.filter((n) => n.type === "group");

  return (
    <>
      {/* ---------- DESKTOP TOP BAR ---------- */}
      <header className="hidden md:flex sticky top-0 z-40 items-center h-14 px-4 bg-slate-900 border-b border-slate-800">
        <Link
          href="/dashboard"
          className="text-white font-bold text-lg mr-6 whitespace-nowrap"
        >
          Peptide Tracker
        </Link>

        <nav ref={navRef} className="flex items-center gap-1 flex-1">
          {NAV.map((entry) => {
            if (entry.type === "link") {
              const active = pathname === entry.href;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {entry.label}
                </Link>
              );
            }

            const visible = itemsFor(entry.items, usesPeptides);
            if (visible.length === 0) return null;

            const active = groupIsActive(entry.items, pathname);
            const isOpen = openGroup === entry.key;
            return (
              <div key={entry.key} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : entry.key)}
                  aria-expanded={isOpen}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors inline-flex items-center gap-1.5 ${
                    active || isOpen
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {entry.label}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 mt-1 w-60 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl z-50">
                    {visible.map((item) => {
                      const itemActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`${linkBase} ${
                            itemActive
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "text-slate-300 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 transition-colors ${
              pathname === "/settings"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* ---------- MOBILE TOP BAR ---------- */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => setDrawerOpen(true)}
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

      {/* ---------- MOBILE DRAWER: backdrop ---------- */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ---------- MOBILE DRAWER: panel ---------- */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[82%] bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-white font-bold text-lg">Peptide Tracker</span>
          <button
            onClick={() => setDrawerOpen(false)}
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
          {/* Dashboard (standalone) */}
          <Link
            href="/dashboard"
            className={`${linkBase} ${
              pathname === "/dashboard"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>

          {/* grouped sections */}
          {groups.map((group) => {
            const visible = itemsFor(group.items, usesPeptides);
            if (visible.length === 0) return null;
            return (
              <div key={group.key}>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 px-4 pt-5 pb-1">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {visible.map((item) => {
                    const itemActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`${linkBase} ${
                            itemActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Settings (standalone) */}
          <div className="mt-5 pt-3 border-t border-slate-800">
            <Link
              href="/settings"
              className={`${linkBase} ${
                pathname === "/settings"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </div>
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