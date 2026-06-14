"use client";

// ============================================================
// SIDEBAR (v6)  —  goes in:  app/components/Sidebar.js
// (FULL REPLACEMENT of v5.)
//
// ONE change vs v5: the nav links are reordered to follow the
// flow a new user actually moves through — overview, then set
// up a protocol, then stock it, then the daily logging, then
// tracking, then reference, then settings. No links added or
// removed; only their order changed.
// ============================================================

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
  { href: "/goals", label: "Goals & Streaks", icon: "🏆" },
  { href: "/lab-results", label: "Lab Results", icon: "🧪" },
  { href: "/side-effects", label: "Side Effects", icon: "⚠️" },
  { href: "/gym", label: "Gym PRs", icon: "🏋️" },
  { href: "/peptides", label: "Peptide Encyclopedia", icon: "📚" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <span className="text-white font-bold text-xl">Peptide Tracker</span>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
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
  );
}