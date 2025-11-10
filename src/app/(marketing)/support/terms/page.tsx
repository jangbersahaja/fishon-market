import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Fishon.my",
  description:
    "Terms that govern your use of Fishon.my, including bookings, payments, cancellations, content, and captain requirements.",
  alternates: { canonical: "https://www.fishon.my/terms" },
  openGraph: {
    title: "Terms of Use | Fishon.my",
    description:
      "Terms that govern your use of Fishon.my and our services in Malaysia.",
    url: "https://www.fishon.my/terms",
    type: "article",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Use | Fishon.my",
    description:
      "Terms that govern your use of Fishon.my and our services in Malaysia.",
  },
};

const lastUpdated = "18 September 2025";

export default function TermsPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[conic-gradient(from_120deg_at_10%_10%,rgba(236,34,39,0.06),transparent_30%)]" />
        <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="text-sm text-neutral-500">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-700">Terms</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Terms of <span className="text-[#EC2227]">Use</span>
          </h1>
          <p className="max-w-3xl mt-3 text-neutral-700">
            Please read these Terms carefully. By using Fishon.my, you agree to
            them.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="w-full px-4 pt-6 pb-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          {/* TOC */}
          <aside className="lg:block">
            <div className="sticky p-4 border top-20 rounded-xl border-neutral-200">
              <p className="text-sm font-semibold">Sections</p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  ["#accounts", "Accounts & eligibility"],
                  ["#bookings", "Bookings & charter contracts"],
                  ["#payments", "Payments, deposits & fees"],
                  ["#cancellations", "Cancellations & refunds"],
                  ["#conduct", "User conduct & prohibited activities"],
                  ["#captains", "Captain requirements"],
                  ["#content", "Content & reviews"],
                  ["#liability", "Disclaimer & limitation of liability"],
                  ["#indemnity", "Indemnification"],
                  ["#law", "Governing law & dispute resolution"],
                  ["#changes", "Changes to the Terms"],
                  ["#contact", "Contact"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="text-neutral-700 hover:text-[#EC2227] hover:underline"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Article */}
          <article className="p-6 prose border max-w-none prose-neutral rounded-2xl border-neutral-200">
            <p className="text-sm text-neutral-500">
              This document provides general platform governance and is not
              legal advice.
            </p>

            <h2 id="accounts">1. Accounts & Eligibility</h2>
            <p>
              You must be 18+ and responsible for activity under your account.
            </p>

            <h2 id="bookings">2. Bookings & Charter Contracts</h2>
            <p>
              You enter a direct contract with the Captain for each trip.
              Fishon.my is not a party to that contract.
            </p>

            <h2 id="payments">3. Payments, Deposits & Fees</h2>
            <p>
              Payments are processed by our partners. Deposits and platform fees
              may apply and are disclosed at checkout.
            </p>

            <h2 id="cancellations">4. Cancellations & Refunds</h2>
            <p>
              Each listing shows its policy. Weather/sea-condition cancellations
              follow the listing policy and law.
            </p>

            <h2 id="conduct">5. User Conduct & Prohibited Activities</h2>
            <ul>
              <li>No unlawful, misleading, or harmful content or activity.</li>
              <li>
                No harassment or endangerment of crew, passengers, or wildlife.
              </li>
              <li>No attempts to compromise platform security.</li>
            </ul>

            <h2 id="captains">6. Captain Requirements</h2>
            <p>
              Captains must maintain valid licences, registrations, permits, and
              insurance; provide safe vessels; and follow local law.
            </p>

            <h2 id="content">7. Content & Reviews</h2>
            <p>
              By submitting content, you grant Fishon.my a non-exclusive,
              royalty-free licence to use it in connection with the Platform,
              subject to our Privacy Policy.
            </p>

            <h2 id="liability">8. Disclaimer & Limitation of Liability</h2>
            <p>
              The Platform is provided “as is”. To the maximum extent permitted
              by law, Fishon.my is not liable for indirect, incidental, or
              consequential damages.
            </p>

            <h2 id="indemnity">9. Indemnification</h2>
            <p>
              You agree to indemnify Fishon.my for claims arising from your
              breach of these Terms or violation of law/third-party rights.
            </p>

            <h2 id="law">10. Governing Law & Dispute Resolution</h2>
            <p>
              Governed by the laws of Malaysia; disputes are subject to
              Malaysian courts after good-faith negotiation.
            </p>

            <h2 id="changes">11. Changes to the Terms</h2>
            <p>
              We may update these Terms with notice on this page. Continued use
              means acceptance.
            </p>

            <h2 id="contact">12. Contact</h2>
            <p>
              Questions?{" "}
              <a href="mailto:support@fishon.my">support@fishon.my</a> or{" "}
              <a href="/contact">Contact page</a>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
