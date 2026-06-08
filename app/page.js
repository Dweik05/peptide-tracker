export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-white mb-4">
        Peptide Tracker
      </h1>
      <p className="text-gray-400 text-lg mb-8">
        Track your peptide protocols, progress, and results
      </p>
      <button className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700">
        Get Started
      </button>
    </main>
  )
}