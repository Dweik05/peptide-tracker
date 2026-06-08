import Navbar from "./components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex flex-col items-center justify-center flex-1">
        <h1 className="text-4xl font-bold text-white mb-4">
          Peptide Tracker
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          Track your peptide protocols, progress, and results
        </p>
        <button className="bg-emerald-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-emerald-600">
          Get Started
        </button>
      </div>
    </main>
  )
}