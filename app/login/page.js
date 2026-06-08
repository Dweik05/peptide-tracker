export default function Login() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-slate-400 mb-6">Log in to your Peptide Tracker account</p>
        
        <div className="mb-4">
          <label className="text-slate-400 text-sm mb-1 block">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mb-6">
          <label className="text-slate-400 text-sm mb-1 block">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600">
          Log In
        </button>

        <p className="text-slate-400 text-sm text-center mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="text-emerald-500 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  )
}