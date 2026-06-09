"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Card from "../../components/Card";

export default function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    }

    getUser();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-2xl font-bold text-white mb-8">
          {greeting}, {user?.user_metadata?.full_name || "there"} 👋
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            title="Current Weight"
            value="—"
            subtitle="No entries yet"
            color="text-white"
          />
          <Card
            title="Current Peptide"
            value="—"
            subtitle="No doses logged yet"
            color="text-white"
          />
          <Card
            title="Logging Streak"
            value="0 days"
            subtitle="Start logging today!"
            color="text-emerald-500"
          />
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
          <p className="text-slate-500 text-sm">No activity yet. Start by logging a dose!</p>
        </div>

      </div>
    </main>
  );
}