// ============================================================
// PRIVACY POLICY  —  goes in:  app/privacy/page.js  (public route "/privacy")
//
// Public page — make sure "/privacy" is reachable without login
// (add it to your middleware's allowed list if you gate routes).
//
// IMPORTANT: this is a solid STARTER template, not legal advice.
// Have a professional review it before relying on it for real users/payments.
// Operator: Mohammad Dweik. Contact: mohammaddweik5002@gmail.com.
// If you later switch to a support@yourdomain address, update it here AND in
// app/terms/page.js.
// ============================================================

import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Peptide Tracker",
  description: "How Peptide Tracker collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          &larr; Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: June 30, 2026</p>

        <div className="mt-8 space-y-8 leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how Peptide Tracker ("we," "us," or
              "the app"), operated by Mohammad Dweik, collects, uses, and protects
              your information when you use our website and services. Peptide
              Tracker is a personal tracking tool. By using it, you agree to the
              practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Information we collect
            </h2>
            <p className="mb-3">We collect only what we need to run the service:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-slate-200">Account information:</strong>{" "}
                your email address and the name you provide at sign-up, used to
                create and secure your account.
              </li>
              <li>
                <strong className="text-slate-200">Tracking data you enter:</strong>{" "}
                the information you choose to log — such as doses, schedules,
                weight, body measurements, progress photos, side effects, lab
                results, inventory, goals, and notes.
              </li>
              <li>
                <strong className="text-slate-200">Limited technical data:</strong>{" "}
                basic information needed to operate and secure the service, such
                as log data and device/browser information.
              </li>
            </ul>
            <p className="mt-3">
              We do not require, and ask that you do not enter, more sensitive
              personal information than the app needs to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              How we use your information
            </h2>
            <p>
              We use your information solely to provide and improve the service:
              to operate your account, store and display the data you log, send
              the reminders and emails you enable, process any payments, and keep
              the service secure. We do not use your tracking data for
              advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              How your data is stored and secured
            </h2>
            <p>
              Your data is stored using established third-party infrastructure
              providers (our database and file storage are hosted on Supabase;
              the app is hosted on Vercel). We rely on industry-standard
              safeguards, including encryption in transit, to protect your
              information. No method of transmission or storage is perfectly
              secure, but we work to protect your data and limit access to it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Sharing and third parties
            </h2>
            <p className="mb-3">
              <strong className="text-slate-200">
                We do not sell your personal data, ever.
              </strong>{" "}
              We share data only with the service providers that help us run the
              app, and only as needed to provide it:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Hosting and database/storage (e.g. Supabase, Vercel)</li>
              <li>Email delivery for reminders and account emails (e.g. Resend)</li>
              <li>
                Payment processing, if you purchase a paid plan (e.g. Stripe) —
                we never see or store your full card details
              </li>
            </ul>
            <p className="mt-3">
              We may also disclose information if required by law or to protect
              the rights, safety, and security of our users and the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your rights</h2>
            <p>
              You can access and update your information from within the app. You
              may request a copy of your data (export), or request that your
              account and associated data be deleted, at any time by contacting
              us at mohammaddweik5002@gmail.com. We will honor applicable data-protection
              rights available to you under the laws of your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Data retention
            </h2>
            <p>
              We keep your information for as long as your account is active.
              When you delete your account, we delete or de-identify your
              associated data, except where we are required to retain certain
              records by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Children's privacy
            </h2>
            <p>
              Peptide Tracker is intended only for adults aged 18 and over. It is
              not directed to children, and we do not knowingly collect
              information from anyone under 18. If you believe a minor has
              provided us information, contact us and we will remove it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do,
              we will revise the "Last updated" date above, and significant
              changes may be communicated within the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact us</h2>
            <p>
              Questions about this policy or your data? Reach us at{" "}
              <a
                href="mailto:mohammaddweik5002@gmail.com"
                className="text-emerald-400 hover:text-emerald-300"
              >
                mohammaddweik5002@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-500">
              Peptide Tracker is a personal tracking tool — not a pharmacy or a
              medical provider. It does not sell, supply, or recommend any
              compounds, and nothing in the app is medical advice.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-5 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}