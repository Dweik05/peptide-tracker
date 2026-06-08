import Navbar from "./components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <span className="bg-emerald-500/10 text-emerald-400 text-sm px-4 py-1 rounded-full mb-6 border border-emerald-500/20">
          Built for GLP-1 & peptide users
        </span>
        <h1 className="text-5xl font-bold text-white mb-6 max-w-2xl leading-tight">
          Track your peptide protocol with confidence
        </h1>
        <p className="text-slate-400 text-lg mb-10 max-w-xl">
          Log doses, track weight, manage inventory, and see your progress — all in one place designed specifically for peptide users.
        </p>
        <div className="flex gap-4">
          <a href="/signup" className="bg-emerald-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-600">
            Get Started Free
          </a>
          <a href="/login" className="bg-slate-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-700">
            Log In
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          Everything you need in one place
        </h2>
        <p className="text-slate-400 text-center mb-12">
          Built specifically for people using legally prescribed peptides
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-4">💉</div>
            <h3 className="text-white font-semibold text-lg mb-2">Dose Logging</h3>
            <p className="text-slate-400 text-sm">Log every dose with peptide name, amount, injection site, and notes. Never lose track again.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-white font-semibold text-lg mb-2">Progress Charts</h3>
            <p className="text-slate-400 text-sm">Visualize your weight and body composition changes over time with beautiful charts.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-4">📦</div>
            <h3 className="text-white font-semibold text-lg mb-2">Inventory Tracking</h3>
            <p className="text-slate-400 text-sm">Know exactly how much supply you have left and get alerts before you run out.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-4">⚠️</div>
            <h3 className="text-white font-semibold text-lg mb-2">Side Effect Tracking</h3>
            <p className="text-slate-400 text-sm">Log side effects and see how they correlate with your dosing patterns over time.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-white font-semibold text-lg mb-2">Peptide Encyclopedia</h3>
            <p className="text-slate-400 text-sm">Reference database of peptides with legal status, dosing protocols, and research notes.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-4">🔔</div>
            <h3 className="text-white font-semibold text-lg mb-2">Email Reminders</h3>
            <p className="text-slate-400 text-sm">Get dose reminders and weekly progress summaries delivered straight to your inbox.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-sm">
        <p>© 2025 Peptide Tracker. For tracking purposes only — not medical advice.</p>
      </footer>
    </main>
  )
}