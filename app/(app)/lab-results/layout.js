import PremiumGate from "../../components/PremiumGate";

export default function LabResultsLayout({ children }) {
  return <PremiumGate feature="Lab tracking">{children}</PremiumGate>;
}