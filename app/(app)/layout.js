import TopNav from "../components/TopNav";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav />
      <main>{children}</main>
    </div>
  );
}