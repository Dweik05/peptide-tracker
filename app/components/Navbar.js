export default function Navbar() {
  return (
    <nav className="w-full bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <span className="text-white font-bold text-xl">
        Peptide Tracker
      </span>
      <div className="flex gap-4">
        <a href="/login" className="text-slate-400 hover:text-white text-sm">
          Login
        </a>
        <a href="/signup" className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600">
          Sign Up
        </a>
      </div>
    </nav>
  )
}