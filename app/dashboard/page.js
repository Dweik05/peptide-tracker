"use client";

import { useState, useEffect } from "react";
import Card from "../components/Card";

export default function Dashboard() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-2xl font-bold text-white mb-8">
          {greeting}, Mohammad 👋
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            title="Current Weight"
            value="185 lbs"
            subtitle="↓ 4 lbs from start"
            color="text-white"
          />
          <Card
            title="Current Peptide"
            value="Semaglutide"
            subtitle="0.5mg — Weekly"
            color="text-white"
          />
          <Card
            title="Logging Streak"
            value="7 days 🔥"
            subtitle="Keep it up!"
            color="text-emerald-500"
          />
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
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