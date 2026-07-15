// ============================================================
// TERMS OF SERVICE  —  goes in:  app/terms/page.js  (public route "/terms")
//
// Public page — make sure "/terms" is reachable without login.
//
// IMPORTANT: this is a solid STARTER template, not legal advice.
// Have a professional review it before relying on it for real users/payments.
// Operator: Mohammad Dweik. Contact: mohammaddweik5002@gmail.com.
// Governing law: Province of Ontario, Canada. If you switch to a
// support@yourdomain contact address, update it here AND in app/privacy/page.js.
//
// Note: the payment/subscription section assumes a freemium model
// (free tier + optional paid plan). Adjust if your model changes.
// ============================================================

import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Peptide Tracker",
  description: "The terms governing your use of Peptide Tracker.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          &larr; Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: July 15, 2026</p>

        {/* prominent medical disclaimer up top */}
        <div className="mt-6 bg-amber-500/5 border border-amber-500/25 rounded-xl p-5">
          <p className="text-sm font-semibold text-amber-300 mb-1">
            Important: not medical advice
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Peptide Tracker is a personal tracking and logging tool only. It is
            not a pharmacy or a medical provider, it does not sell, supply, or
            recommend any compounds, and nothing in it is medical advice,
            diagnosis, or treatment. Always consult a qualified healthcare
            professional before making decisions about your health.
          </p>
        </div>

        <div className="mt-8 space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Acceptance of these terms
            </h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of
              Peptide Tracker (the "service"), operated by Mohammad Dweik. By
              creating an account or using the service, you agree to these Terms.
              If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. What the service is
            </h2>
            <p>
              Peptide Tracker is a tool that lets you log and organize your own
              information — such as doses, schedules, progress, and inventory.
              It is provided for personal informational and organizational
              purposes only. Any reference information in the app is general and
              educational, and is not a recommendation to use any substance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Eligibility
            </h2>
            <p>
              You must be at least 18 years old to use the service. By using it,
              you represent that you are 18 or older and able to enter into these
              Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Your account
            </h2>
            <p>
              You are responsible for the information you enter, for keeping your
              login credentials secure, and for all activity under your account.
              Notify us promptly of any unauthorized use. You are responsible for
              the accuracy of the data you log.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Acceptable use
            </h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the service for any unlawful purpose;</li>
              <li>
                Attempt to disrupt, reverse-engineer, or gain unauthorized access
                to the service or its systems;
              </li>
              <li>
                Use the service to harm others or to distribute harmful or
                unlawful content;
              </li>
              <li>Misrepresent your identity or impersonate others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Medical disclaimer
            </h2>
            <p>
              The service does not provide medical advice. It is not a substitute
              for professional medical care, and we are not responsible for any
              decisions you make based on information you log or view in the app.
              You use the service, and make any health-related decisions, at your
              own risk and in consultation with qualified professionals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Plans, payments, and trials
            </h2>
            <p className="mb-3">
              The service offers a free tier that you can use indefinitely
              without payment and without providing a payment method. It also
              offers an optional paid plan ("Premium") with additional features,
              available on a monthly or annual basis.
            </p>
            <p className="mb-3">
              We may offer a free trial of Premium. The trial does not require a
              credit card or any other payment method. Because we do not collect
              payment information for the trial, you are not charged
              automatically when it ends — instead, your access simply returns to
              the free tier unless you choose to subscribe to Premium.
            </p>
            <p>
              If you subscribe to Premium, you authorize us and our payment
              processor to charge the applicable fees, and your subscription
              renews automatically each billing period until you cancel. You can
              cancel at any time; cancellation stops future charges and takes
              effect at the end of the current billing period, and you keep
              Premium access until then. Except where required by law, fees
              already paid are non-refundable. Prices and plan details may
              change, with notice to active subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Your data
            </h2>
            <p>
              The data you enter is yours. Our handling of it is described in our{" "}
              <Link
                href="/privacy"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Privacy Policy
              </Link>
              . You can export or delete your data as described there.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Intellectual property
            </h2>
            <p>
              The service itself — including its software, design, and content we
              provide — belongs to us or our licensors and is protected by
              applicable laws. You may not copy, modify, or redistribute it
              except as allowed by these Terms or by law. You retain ownership of
              the data you enter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Disclaimers and limitation of liability
            </h2>
            <p className="mb-3">
              The service is provided "as is" and "as available," without
              warranties of any kind, whether express or implied, to the fullest
              extent permitted by law. We do not warrant that the service will be
              uninterrupted, error-free, or that any data will never be lost.
            </p>
            <p>
              To the fullest extent permitted by law, we will not be liable for
              any indirect, incidental, special, or consequential damages, or for
              any loss of data, arising from your use of the service. Where
              liability cannot be excluded, it is limited to the amount you paid
              us (if any) in the twelve months before the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Termination
            </h2>
            <p>
              You may stop using the service and delete your account at any time.
              We may suspend or terminate access if you violate these Terms or to
              protect the service and its users. Provisions that by their nature
              should survive termination will continue to apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              12. Changes to these terms
            </h2>
            <p>
              We may update these Terms from time to time. When we do, we will
              update the "Last updated" date, and continued use of the service
              after changes take effect means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              13. Governing law
            </h2>
            <p>
              These Terms are governed by the laws of the Province of Ontario,
              Canada, without regard to its conflict-of-law rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              14. Contact
            </h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <a
                href="mailto:mohammaddweik5002@gmail.com"
                className="text-emerald-400 hover:text-emerald-300"
              >
                mohammaddweik5002@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-5 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}