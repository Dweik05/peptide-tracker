"use client";

// ============================================================
// TOUR HELP BUTTON  —  goes in:  app/components/TourHelpButton.js
//
// A small "?" that replays the guided tour for whatever page it's on.
// It fires the same "pt:start-tour" event the onboarding modal uses, and
// the <PageTour /> already mounted on that page picks it up and runs from
// step 1.
//
// HOW A PAGE USES IT
//   Put it next to the page heading:
//
//     <div className="flex items-center gap-1">
//       <h1 className="text-2xl font-bold text-white">Dashboard</h1>
//       <TourHelpButton />
//     </div>
//
//   The page must already have a <PageTour /> mounted somewhere, or there
//   is no tour for the button to start.
//
// MOBILE NOTE
//   The visible circle is 22px, but the button is padded out to a ~44px
//   tap target (Apple's and Google's minimum) and pulled back in with a
//   negative margin, so it stays easy to hit without pushing the heading
//   around. Don't remove the -m-2.5 / p-2.5 pair — they cancel out.
// ============================================================

export default function TourHelpButton({ className = "" }) {
  function handleClick() {
    window.dispatchEvent(new Event("pt:start-tour"));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Show me around this page"
      title="Show me around this page"
      className={`-m-2.5 p-2.5 inline-flex items-center justify-center shrink-0 text-slate-500 hover:text-emerald-400 focus:text-emerald-400 focus:outline-none transition-colors ${className}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>
  );
}