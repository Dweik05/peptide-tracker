// ============================================================
// SITEMAP  —  goes in:  app/sitemap.js
//
// Lists your PUBLIC pages for search engines. Signed-in app pages are left out
// on purpose (they're private). Add or remove routes here to match the public
// pages you actually have.
//
// Uses NEXT_PUBLIC_SITE_URL when set (add it in Vercel with your real domain),
// otherwise falls back to the current Vercel URL — so this works today.
// ============================================================

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://peptide-tracker-beta.vercel.app";

export default function sitemap() {
  const now = new Date();

  // Public marketing/legal routes only. Adjust to match what you actually have.
  const routes = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}