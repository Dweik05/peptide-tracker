import Sidebar from "../components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 md:flex">
      <Sidebar />
      <div className="flex-1 min-w-0 md:overflow-auto">
        {children}
      </div>
    </div>
  );
}