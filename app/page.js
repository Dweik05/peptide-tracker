import Link from 'next/link';

export default function Page() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* --- NAVIGATION --- */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Simple geometric logo */}
            <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <span className="font-semibold text-neutral-100 tracking-tight">Peptide Tracker</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/login" className="text-neutral-400 hover:text-neutral-100 transition-colors">Log in</Link>
            <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 rounded-md transition-colors">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* --- HERO SECTION --- */}
        <section className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="mb-6 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-emerald-500 text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Private Protocol Dashboard
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-50 mb-6 leading-tight">
            Precision tracking for <br className="hidden md:block" />
            your peptide protocols.
          </h1>
          
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Log every dose, follow your schedule, and track your progress — weight, measurements, photos, and inventory — in one private dashboard built specifically for optimizers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              Start free trial
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 font-semibold rounded-lg transition-colors flex items-center justify-center">
              Log in
            </Link>
          </div>
          <p className="text-sm text-neutral-500 mt-6">14-day free trial · Cancel anytime</p>

          {/* Slek, Ultra-Simple Mockup Card */}
          <div className="mt-16 w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl text-left overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <span className="font-semibold text-neutral-200">Today's Schedule</span>
              <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">100% On Track</span>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Completed Dose */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/30">
                <div className="mt-0.5 shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-neutral-200">BPC-157</span>
                    <span className="text-xs text-neutral-500">8:00 AM</span>
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">250mcg (0.10ml) • SubQ • Right Abdomen</div>
                </div>
              </div>
              {/* Pending Dose */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-neutral-800">
                <div className="mt-0.5 shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-neutral-200">TB-500</span>
                    <span className="text-xs text-neutral-500">8:00 PM</span>
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">2.5mg (0.25ml) • SubQ • Left Thigh</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="py-24 px-6 border-t border-neutral-900 bg-neutral-950">
          <div className="max-w-6xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-50 mb-4 text-center">Everything you need. Nothing you don't.</h2>
            <p className="text-neutral-400 max-w-2xl text-center mb-16 text-lg">A clean, purpose-built dashboard replacing your scattered spreadsheets and notes apps.</p>

            {/* Bulletproof Flex Layout */}
            <div className="flex flex-row flex-wrap justify-center gap-6 w-full">
              
              {/* Feature 1 */}
              <div className="flex-1 min-w-[300px] max-w-[350px] bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">Precision Dose Logging</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Log compound, amount, injection site, and time effortlessly. Includes an interactive body map to ensure safe site rotation.</p>
              </div>

              {/* Feature 2 */}
              <div className="flex-1 min-w-[300px] max-w-[350px] bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">Schedules & Reminders</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Set up your protocol once and let the app manage it. Support for complex titration schedules and email reminders.</p>
              </div>

              {/* Feature 3 */}
              <div className="flex-1 min-w-[300px] max-w-[350px] bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">Progress Tracking</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Map results to your protocol. Log weight, record body measurements, and securely store before/after photos on one timeline.</p>
              </div>

              {/* Feature 4 */}
              <div className="flex-1 min-w-[300px] max-w-[350px] bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">Smart Inventory</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Never miss a dose due to empty supplies. Track vials, syringes, and get low-stock awareness alerts before you run out.</p>
              </div>

              {/* Feature 5 */}
              <div className="flex-1 min-w-[300px] max-w-[350px] bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">Reference Library</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Access an organized reference guide for ~90 common compounds. Quickly check standard storage requirements and math.</p>
              </div>

              {/* Feature 6 */}
              <div className="flex-1 min-w-[300px] max-w-[350px] bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
                <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">Private by Default</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">Your data is securely tied to your account. No public profiles, no social sharing, and no external tracking. Built for privacy.</p>
              </div>

            </div>
          </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <section className="py-24 px-6 border-t border-neutral-900 bg-neutral-950">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-50 mb-4">Simple, transparent pricing</h2>
              <p className="text-neutral-400 text-lg">Start tracking today. 14-day free trial on both plans.</p>
            </div>

            {/* Flexbox row for pricing to prevent grid collapse */}
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              
              {/* Monthly Plan */}
              <div className="w-full md:w-1/2 max-w-sm bg-neutral-900 border border-neutral-800 p-8 rounded-2xl flex flex-col h-full">
                <h3 className="text-xl font-medium text-neutral-200 mb-2">Monthly</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-neutral-50">$9.99</span>
                  <span className="text-neutral-500">/mo</span>
                </div>
                <p className="text-neutral-400 text-sm mb-8">Perfect for shorter cycles or trying out the dashboard workflow.</p>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {['All tracking features', 'Unlimited logs', 'Schedules & Reminders', 'Secure data storage'].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-neutral-300">
                      <div className="mt-0.5 shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-center text-neutral-200 font-medium rounded-lg transition-colors">
                  Start 14-Day Free Trial
                </Link>
              </div>

              {/* Yearly Plan */}
              <div className="w-full md:w-1/2 max-w-sm bg-neutral-900 border-2 border-emerald-500/50 p-8 rounded-2xl relative flex flex-col h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-neutral-950 text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full">
                  Best Value (Save ~33%)
                </div>
                <h3 className="text-xl font-medium text-neutral-200 mb-2">Yearly</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-neutral-50">$79.99</span>
                  <span className="text-neutral-500">/yr</span>
                </div>
                <p className="text-neutral-400 text-sm mb-8">The ideal choice for continuous, year-round optimization.</p>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {['All tracking features', 'Unlimited logs', 'Schedules & Reminders', 'Secure data storage'].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-neutral-300">
                      <div className="mt-0.5 shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-center font-bold rounded-lg transition-colors">
                  Start 14-Day Free Trial
                </Link>
              </div>

            </div>
            
            <p className="text-center text-neutral-500 text-sm mt-8">
              A valid credit card is required to begin your free trial. You can cancel anytime.
            </p>
          </div>
        </section>

        {/* --- MEDICAL DISCLAIMER --- */}
        <section className="px-6 pb-24 max-w-3xl mx-auto">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex gap-4 items-start">
            <div className="shrink-0 mt-0.5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <h4 className="text-neutral-300 font-medium mb-1">Important Notice</h4>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Peptide Tracker is a personal tracking tool — not a pharmacy or medical provider. It does not sell, supply, or recommend any compounds, and nothing in it constitutes medical advice. Always work with a qualified healthcare professional before beginning or modifying any health protocol.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <span className="font-semibold text-neutral-300">Peptide Tracker</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-neutral-500">
            <Link href="/login" className="hover:text-neutral-300 transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-neutral-300 transition-colors">Get started</Link>
            <a href="mailto:support@peptidetracker.com" className="hover:text-neutral-300 transition-colors">Contact</a>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-neutral-900 text-center text-xs text-neutral-600">
          &copy; {new Date().getFullYear()} Peptide Tracker. All rights reserved.
        </div>
      </footer>
    </div>
  );
}