import {
  createFAQPageSchema,
  createMetadata,
  serializeSchema,
} from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

/** SEO */
export const metadata: Metadata = createMetadata({
  title: "Help Center",
  description:
    "Find answers to common questions about booking fishing charters on Fishon.my",
  keywords: ["help center", "faq", "booking help", "fishing charter questions"],
  canonicalUrl: "https://www.fishon.my/support/help",
  // TODO: Add OG image for help center page
});

const lastUpdated = "27 October 2025";

// FAQ Schema data extracted from page content
const faqItems = [
  {
    question: "Can I change my date after booking?",
    answer:
      "Date changes depend on captain availability and the listing's policy. Use your booking page or contact support.",
  },
  {
    question: "Do trips go out in bad weather?",
    answer:
      "Safety first. Captains may reschedule or cancel according to sea conditions and local advisories.",
  },
  {
    question: "How do deposits work?",
    answer:
      "Some listings require a deposit to secure your date. The policy is shown on the charter page and at checkout.",
  },
  {
    question: "What if my card is charged but I have no confirmation?",
    answer:
      "Check spam/junk. If still missing after 10 minutes, contact us with the last four digits of the card and time of payment.",
  },
  {
    question: "How do I modify my booking?",
    answer:
      "To modify your booking, please contact the captain directly or reach out to our support team. Modification policies vary by charter.",
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Cancellation policies vary by charter. You can cancel PENDING or APPROVED bookings from your bookings page. Check the charter details for specific policies.",
  },
  {
    question: "How long does captain approval take?",
    answer:
      "Captains typically respond within 6-24 hours. Your booking hold expires after 12 hours if not approved. You'll receive an email notification once the captain responds.",
  },
  {
    question: "When will I be charged?",
    answer:
      "You're only charged after the captain approves your booking. Once approved, you'll receive a payment link to complete your booking confirmation.",
  },
];

const faqSchema = createFAQPageSchema(faqItems);

export default function HelpCenterPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* JSON-LD Schema for FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeSchema(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,34,39,0.08),transparent_55%)]" />
        <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="text-sm text-neutral-500">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-700">Help Center</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Help <span className="text-[#EC2227]">Center</span>
          </h1>
          <p className="max-w-3xl mt-3 text-neutral-700">
            Find quick answers, how-tos and policies. Still stuck? Our team is
            one click away.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Last updated: {lastUpdated}
          </p>

          {/* Quick categories */}
          <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
            <CategoryCard
              title="Getting Started"
              icon="🎣"
              href="#getting-started"
              items={["Create account", "Find a charter", "Make a booking"]}
            />
            <CategoryCard
              title="Account"
              icon="👤"
              href="#account"
              items={["Profile", "Password", "Notifications"]}
            />
            <CategoryCard
              title="Payments"
              icon="💳"
              href="#payments"
              items={["Methods", "Deposits", "Refunds"]}
            />
            <CategoryCard
              title="Safety"
              icon="🛟"
              href="#safety"
              items={["Captain verification", "Trip checklist", "Report issue"]}
            />
          </div>
        </div>
      </section>

      {/* Content with sticky TOC */}
      <section className="w-full px-4 pt-6 pb-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          {/* TOC (sticky) */}
          <aside className="lg:block">
            <div className="sticky p-4 border top-20 rounded-xl border-neutral-200">
              <p className="text-sm font-semibold">On this page</p>
              <ul className="mt-3 space-y-2 text-sm">
                <TocItem href="#getting-started" label="Getting started" />
                <TocItem href="#account" label="Managing your account" />
                <TocItem href="#payments" label="Payments & refunds" />
                <TocItem href="#safety" label="Safety & verification" />
                <TocItem href="#faq" label="Top FAQs" />
              </ul>
              <a
                className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#EC2227] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95"
                href="/contact"
              >
                Contact Support
              </a>
            </div>
          </aside>

          {/* Main */}
          <article className="prose max-w-none prose-neutral">
            <Section id="getting-started" title="Getting started">
              <h3 id="create-account" className="!mt-0">
                Create an account
              </h3>
              <p>
                Sign up with your email, verify it, and you’re ready to book
                trips.
              </p>
              <h3 id="search-charters">Find a charter</h3>
              <p>
                Filter by location, species, boat type, price, and available
                dates.
              </p>
              <h3 id="make-booking">Make a booking</h3>
              <p>
                Select a package, add gear/bait/meals, then confirm with secure
                checkout.
              </p>
            </Section>

            <Section id="account" title="Managing your account">
              <h3 id="update-profile" className="!mt-0">
                Profile
              </h3>
              <p>
                Keep name/phone up to date for smooth captain communication.
              </p>
              <h3 id="change-password">Password</h3>
              <p>
                Use a strong, unique passphrase. Reset anytime from “Forgot
                password”.
              </p>
              <h3 id="notifications">Notifications</h3>
              <p>
                We send essential trip updates; marketing emails are opt-in.
              </p>
            </Section>

            <Section id="payments" title="Payments & refunds">
              <h3 id="payment-methods" className="!mt-0">
                Accepted methods
              </h3>
              <p>
                Major cards and FPX/online banking (MY). Options appear at
                checkout.
              </p>
              <h3 id="cancellations">Deposits & cancellations</h3>
              <p>
                Policies vary by listing and conditions; see policy on each
                charter page.
              </p>
              <h3 id="refunds">Refund timeline</h3>
              <p>
                Approved refunds return to your original method in ~3–10
                business days.
              </p>
            </Section>

            <Section id="safety" title="Safety & verification">
              <h3 id="captain-verification" className="!mt-0">
                Captain verification
              </h3>
              <p>
                Captains upload licences/registration/insurance before listings
                go live.
              </p>
              <h3 id="safety-checklist">Trip checklist</h3>
              <ul>
                <li>Confirm jetty/time and weather updates.</li>
                <li>
                  Bring sun protection, water, and motion-sickness meds if
                  needed.
                </li>
                <li>
                  Follow safety briefing and crew instructions at all times.
                </li>
              </ul>
              <h3 id="report-issue">Report an issue</h3>
              <p>
                Share your booking reference at{" "}
                <a href="mailto:support@fishon.my">support@fishon.my</a> or{" "}
                <a href="/contact">Contact</a>.
              </p>
            </Section>

            {/* Top FAQs accordion */}
            <div id="faq" className="mt-12 not-prose">
              <h2 className="text-2xl font-semibold">Top FAQs</h2>
              <div className="mt-4 border divide-y rounded-xl border-neutral-200">
                <Faq
                  q="Can I change my date after booking?"
                  a="Date changes depend on captain availability and the listing’s policy. Use your booking page or contact support."
                />
                <Faq
                  q="Do trips go out in bad weather?"
                  a="Safety first. Captains may reschedule or cancel according to sea conditions and local advisories."
                />
                <Faq
                  q="How do deposits work?"
                  a="Some listings require a deposit to secure your date. The policy is shown on the charter page and at checkout."
                />
                <Faq
                  q="What if my card is charged but I have no confirmation?"
                  a="Check spam/junk. If still missing after 10 minutes, contact us with the last four digits of the card and time of payment."
                />
              </div>
            </div>

            {/* CTA */}
            {/* Contact Options Grid */}
            <div className="grid grid-cols-1 gap-6 mt-14 md:grid-cols-3 not-prose">
              <div className="p-6 bg-white border rounded-lg border-neutral-200">
                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-50">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Email Support
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  Send us an email and we&apos;ll respond within 24 hours.
                </p>
                <a
                  href="mailto:support@fishon.my"
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md shadow-sm border-neutral-300 hover:bg-gray-50"
                >
                  support@fishon.my
                </a>
              </div>

              <div className="p-6 bg-white border rounded-lg border-neutral-200">
                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-green-50">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  WhatsApp
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  Chat with our support team on WhatsApp.
                </p>
                <a
                  href="https://wa.me/60165304304"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                >
                  Chat on WhatsApp
                </a>
              </div>

              <div className="p-6 bg-white border rounded-lg border-neutral-200">
                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-purple-50">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Live Chat
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  Chat with our support team in real-time.
                </p>
                <button
                  disabled
                  className="w-full px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border rounded-md cursor-not-allowed border-neutral-200"
                >
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Additional Common Questions from Account Support */}
            <div className="mt-10 not-prose">
              <h2 className="text-2xl font-semibold">More Questions</h2>
              <div className="mt-4 border divide-y rounded-xl border-neutral-200">
                <Faq
                  q="How do I modify my booking?"
                  a="To modify your booking, please contact the captain directly or reach out to our support team. Modification policies vary by charter."
                />
                <Faq
                  q="What is the cancellation policy?"
                  a="Cancellation policies vary by charter. You can cancel PENDING or APPROVED bookings from your bookings page. Check the charter details for specific policies."
                />
                <Faq
                  q="How long does captain approval take?"
                  a="Captains typically respond within 6-24 hours. Your booking hold expires after 12 hours if not approved. You'll receive an email notification once the captain responds."
                />
                <Faq
                  q="When will I be charged?"
                  a="You're only charged after the captain approves your booking. Once approved, you'll receive a payment link to complete your booking confirmation."
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

/* ---- UI bits ---- */
function CategoryCard({
  title,
  icon,
  href,
  items,
}: {
  title: string;
  icon: string;
  href: string;
  items: string[];
}) {
  return (
    <a
      href={href}
      className="p-5 transition border group rounded-2xl border-neutral-200 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EC2227]/10">
          <span className="text-lg">{icon}</span>
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-600">
        {items.map((i) => (
          <li key={i} className="truncate">
            {i}
          </li>
        ))}
      </ul>
      <span className="mt-3 inline-block text-sm font-medium text-[#EC2227]">
        Explore →
      </span>
    </a>
  );
}

function TocItem({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        className="text-neutral-700 hover:text-[#EC2227] hover:underline"
      >
        {label}
      </a>
    </li>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="p-4 group">
      <summary className="flex items-center justify-between list-none cursor-pointer">
        <span className="font-medium">{q}</span>
        <span className="transition text-neutral-400 group-open:rotate-90">
          ›
        </span>
      </summary>
      <p className="mt-2 text-neutral-700">{a}</p>
    </details>
  );
}
