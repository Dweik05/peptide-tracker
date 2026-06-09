"use client";

import { useState } from "react";

export default function Progress() {
  const today = new Date().toISOString().split("T")[0];
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today);
  const [unit, setUnit] = useState("lbs");
  const [entries, setEntries] = useState([]);

  function handleSave() {
    if (!weight || !date) return;

    const newEntry = {
      weight: weight,
      unit: unit,
      date: date,
      id: Date.now(),
    };

    setEntries([newEntry, ...entries]);
    setWeight("");
    setDate(today);
  }

  return (
    <main className="p-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold text-white mb-8">Progress Tracker</h1>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-8">
          <h2 className="text-white font-semibold mb-4">Log Your Weight</h2>

          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-1 block">Unit</label>
            <div className="flex gap-3">
              <button
                onClick={() => setUnit("lbs")}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
                  unit === "lbs"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                lbs
              </button>
              <button
                onClick={() => setUnit("kg")}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
                  unit === "kg"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                kg
              </button>
              <button
                onClick={() => setUnit("st")}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-colors ${
                  unit === "st"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                st
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-slate-400 text-sm mb-1 block">
              Weight ({unit})
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
              className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="mb-6">
            <label className="text-slate-400 text-sm mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600"
          >
            Save Entry
          </button>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h2 className="text-white font-semibold mb-4">Weight History</h2>

          {entries.length === 0 ? (
            <p className="text-slate-500 text-sm">No entries yet. Log your first weight above!</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center border-b border-slate-800 pb-3"
                >
                  <span className="text-white font-semibold">
                    {entry.weight} {entry.unit}
                  </span>
                  <span className="text-slate-500 text-sm">{entry.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}