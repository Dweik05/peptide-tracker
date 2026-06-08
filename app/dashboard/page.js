export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        
        <h1 className="text-2xl font-bold text-white mb-8">
          Good morning, Mohammad 👋
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Current Weight</p>
            <p className="text-white text-3xl font-bold">185 lbs</p>
            <p className="text-emerald-500 text-sm mt-1">↓ 4 lbs from start</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Current Peptide</p>
            <p className="text-white text-3xl font-bold">Semaglutide</p>
            <p className="text-slate-400 text-sm mt-1">0.5mg — Weekly</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Logging Streak</p>
            <p className="text-white text-3xl font-bold">7 days 🔥</p>
            <p className="text-slate-400 text-sm mt-1">Keep it up!</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-300">Logged dose — Semaglutide 0.5mg</span>
              <span className="text-slate-500 text-sm">Today</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-300">Weight logged — 185 lbs</span>
              <span className="text-slate-500 text-sm">Yesterday</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Logged dose — Semaglutide 0.5mg</span>
              <span className="text-slate-500 text-sm">3 days ago</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}