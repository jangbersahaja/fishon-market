import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Fishon.my",
  description:
    "How Fishon.my collects, uses, and protects your personal data, and your rights under applicable law.",
  alternates: { canonical: "https://www.fishon.my/privacy" },
  openGraph: {
    title: "Privacy Policy | Fishon.my",
    description: "How we handle your data and privacy on Fishon.my.",
    url: "https://www.fishon.my/privacy",
    type: "article",
    siteName: "Fishon.my",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Fishon.my",
    description: "How we handle your data and privacy on Fishon.my.",
  },
};

const lastUpdated = "18 September 2025";

export default function PrivacyPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,34,39,0.08),transparent_50%)]" />
        <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="text-sm text-neutral-500">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-700">Privacy</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Privacy <span className="text-[#EC2227]">Policy</span>
          </h1>
          <p className="max-w-3xl mt-3 text-neutral-700">
            We respect your privacy. This policy explains what we collect, why
            we collect it, and your choices.
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
                  ["#data-we-collect", "Data we collect"],
                  ["#how-we-use", "How we use your data"],
                  ["#legal-basis", "Legal basis"],
                  ["#sharing", "Sharing your data"],
                  ["#international", "International transfers"],
                  ["#retention", "Data retention"],
                  ["#your-rights", "Your rights"],
                  ["#cookies", "Cookies & similar technologies"],
                  ["#security", "Security"],
                  ["#children", "Children"],
                  ["#changes", "Changes to this policy"],
                  ["#contact", "Contact us"],
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
            <h2 id="data-we-collect">1. Data We Collect</h2>
            <ul>
              <li>
                <strong>Account Data:</strong> name, email, phone, password
                (hashed).
              </li>
              <li>
                <strong>Booking Data:</strong> packages, dates, add-ons,
                payments.
              </li>
              <li>
                <strong>Captain Data:</strong> licences, registrations,
                insurance (where applicable).
              </li>
              <li>
                <strong>Usage Data:</strong> device/browser info, logs, and
                cookies.
              </li>
              <li>
                <strong>Communications:</strong> messages, support, reviews.
              </li>
            </ul>

            <h2 id="how-we-use">2. How We Use Your Data</h2>
            <ul>
              <li>Provide and improve the Platform and support.</li>
              <li>Process bookings, payments, and refunds.</li>
              <li>Verify Captain listings and maintain safety standards.</li>
              <li>
                Send essential service communications and optional updates.
              </li>
              <li>Prevent fraud/abuse and comply with legal obligations.</li>
            </ul>

            <h2 id="legal-basis">3. Legal Basis</h2>
            <p>
              Consent, performance of a contract, legal obligations, and
              legitimate interests (security, improvement).
            </p>

            <h2 id="sharing">4. Sharing Your Data</h2>
            <p>
              We share data with Captains, payment processors, hosting/analytics
              providers under confidentiality, and as required by law.
            </p>

            <h2 id="international">5. International Transfers</h2>
            <p>
              Where data leaves Malaysia, we use appropriate safeguards
              consistent with applicable laws.
            </p>

            <h2 id="retention">6. Data Retention</h2>
            <p>
              We retain data only as long as necessary to provide services and
              meet legal, tax, or accounting requirements.
            </p>

            <h2 id="your-rights">7. Your Rights</h2>
            <ul>
              <li>
                Access, correction, and deletion (subject to legal limits).
              </li>
              <li>Object or restrict certain processing.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>Complain to a relevant data protection authority.</li>
            </ul>

            <h2 id="cookies">8. Cookies & Similar Technologies</h2>
            <p>
              We use cookies to keep you signed in, remember preferences, and
              measure usage. You can control cookies in your browser settings.
            </p>

            <h2 id="security">9. Security</h2>
            <p>
              We use administrative, technical, and physical safeguards. No
              method is 100% secure—please protect your credentials.
            </p>

            <h2 id="children">10. Children</h2>
            <p>
              The Platform is not intended for children under 13. Contact us if
              you believe a child has provided personal data.
            </p>

            <h2 id="changes">11. Changes to this Policy</h2>
            <p>
              We may update this policy. Material changes will be posted here
              with a new “Last updated” date.
            </p>

            <h2 id="contact">12. Contact Us</h2>
            <p>
              Email <a href="mailto:support@fishon.my">support@fishon.my</a> or
              use our <a href="/contact">Contact page</a>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
