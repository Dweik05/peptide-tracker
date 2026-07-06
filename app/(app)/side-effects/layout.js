import PremiumGate from "../../components/PremiumGate";

export default function SideEffectsLayout({ children }) {
  return <PremiumGate feature="Side-effect tracking">{children}</PremiumGate>;
}