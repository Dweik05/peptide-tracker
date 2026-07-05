// ============================================================
// INSIGHTS LAYOUT  —  app/(app)/insights/layout.js
//
// Gates the entire /insights route behind premium access without
// touching the insights page itself. To gate another premium route,
// drop a layout.js like this into that route's folder and change the
// feature label.
// ============================================================

import PremiumGate from "../../components/PremiumGate";

export default function InsightsLayout({ children }) {
  return <PremiumGate feature="Insights">{children}</PremiumGate>;
}