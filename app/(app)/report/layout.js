import PremiumGate from "../../components/PremiumGate";

export default function ReportLayout({ children }) {
  return <PremiumGate feature="The doctor report">{children}</PremiumGate>;
}