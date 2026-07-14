// ============================================================
// ROBOTS  —  goes in:  app/robots.js
//
// Tells search engines what to crawl. Your public marketing pages are open;
// the signed-in app pages (which just redirect to /login for a crawler anyway)
// are disallowed so they never show up in search results.
//
// Uses NEXT_PUBLIC_SITE_URL when set (add it in Vercel once your real domain is
// live), otherwise falls back to the current Vercel URL — so this works today.
// ============================================================

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://peptide-tracker-beta.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, signed-in app routes — adjust this list to match your routes.
        disallow: [
          "/dashboard",
          "/inventory",
          "/planner",
          "/log",
          "/calendar",
          "/progress",
          "/goals",
          "/lab-results",
          "/side-effects",
          "/insights",
          "/report",
          "/settings",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}