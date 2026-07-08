// ============================================================
// SUPPLIES  —  goes in:  app/(app)/supplies/page.js  (route "/supplies")
//
// A simple list of recommended protocol supplies with Amazon links. This is
// an AFFILIATE page:
//   1. Once you're approved for Amazon Associates, set AMAZON_AFFILIATE_TAG
//      below — every link then carries your tag and earns commission.
//   2. The URLs below are Amazon SEARCH links so the page is useful right now;
//      swap them for specific affiliate PRODUCT links whenever you like.
//
// Amazon Associates REQUIRES the disclosure shown on the page — keep it.
// This is a normal server component (no "use client") so it can set a title.
// ============================================================

import Link from "next/link";

export const metadata = {
  title: "Supplies — Peptide Tracker",
  description: "Recommended supplies for a clean, safe protocol.",
};

// Set this once you're approved, e.g. "peptidetrackr-20". Leave "" until then —
// links still work, just un-monetized.
const AMAZON_AFFILIATE_TAG = "";

function amazonUrl(base) {
  if (!AMAZON_AFFILIATE_TAG) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}tag=${AMAZON_AFFILIATE_TAG}`;
}

const SUPPLIES = [
  {
    name: "Insulin syringes (31G)",
    detail:
      "Fine-gauge syringes for subcutaneous injections. 0.5 mL and 1 mL barrels are the common choices.",
    url: "https://www.amazon.com/s?k=insulin+syringes+31g",
  },
  {
    name: "Bacteriostatic water",
    detail:
      "Used to reconstitute lyophilized (powdered) peptides; keeps a mixed vial usable for weeks refrigerated.",
    url: "https://www.amazon.com/s?k=bacteriostatic+water",
  },
  {
    name: "Alcohol prep pads",
    detail: "Sterilize the vial top and the injection site before every use.",
    url: "https://www.amazon.com/s?k=alcohol+prep+pads",
  },
  {
    name: "Sharps disposal container",
    detail:
      "Dispose of used needles safely — never put loose needles in household trash.",
    url: "https://www.amazon.com/s?k=sharps+container",
  },
  {
    name: "Adhesive bandages",
    detail: "For the occasional spot of bleeding after an injection.",
    url: "https://www.amazon.com/s?k=adhesive+bandages",
  },
];

export default function SuppliesPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Supplies
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          The basics for a clean, safe protocol. These links open on Amazon.
        </p>
      </div>

      {/* affiliate disclosure (required by Amazon Associates) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-xs text-slate-500">
        As an Amazon Associate, Peptide Tracker earns from qualifying purchases.
        It costs you nothing extra and helps keep the app running.
      </div>

      <div className="space-y-3">
        {SUPPLIES.map((item) => (
          <div
            key={item.name}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div>
              <h2 className="text-base font-semibold text-white">{item.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{item.detail}</p>
            </div>
            <a
              href={amazonUrl(item.url)}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold text-sm px-4 h-10 rounded-lg transition-colors whitespace-nowrap"
            >
              View on Amazon
            </a>
          </div>
        ))}
      </div>

      {/* safety note, consistent with the app's stance */}
      <p className="text-xs text-slate-600">
        Peptide Tracker isn't a pharmacy or a medical provider and doesn't sell
        these items — these are general supply suggestions, not medical advice.
        Use proper sterile technique and consult a qualified professional with
        any health questions.
      </p>

      <div className="pt-2">
        <Link
          href="/inventory"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          &larr; Back to inventory
        </Link>
      </div>
    </div>
  );
}