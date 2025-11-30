import {
  createFAQPageSchema,
  createMetadata,
  serializeSchema,
} from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

/** SEO */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "helpCenter.metadata" });

  return createMetadata({
    title: t("title"),
    description: t("description"),
    keywords: [
      "help center",
      "faq",
      "booking help",
      "fishing charter questions",
    ],
    canonicalUrl: "https://www.fishon.my/support/help",
  });
}

export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "helpCenter" });

  const lastUpdated = t("hero.lastUpdated", { date: "27 October 2025" });

  // FAQ Schema data extracted from page content
  const faqKeys = [
    "changeDate",
    "badWeather",
    "deposits",
    "noConfirmation",
    "modifyBooking",
    "cancellationPolicy",
    "approvalTime",
    "whenCharged",
  ];

  const faqItems = faqKeys.map((key) => ({
    question: t(`faq.items.${key}.q`),
    answer: t(`faq.items.${key}.a`),
  }));

  const faqSchema = createFAQPageSchema(faqItems);

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
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link href={`/${locale}/home`} className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-neutral-700">{t("hero.title")}</span>
          </nav>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            {t("hero.title")}{" "}
            <span className="text-[#EC2227]">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="max-w-3xl mt-3 text-neutral-700">
            {t("hero.description")}
          </p>
          <p className="mt-1 text-sm text-neutral-500">{lastUpdated}</p>

          {/* Quick categories */}
          <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
            <CategoryCard
              title={t("categories.gettingStarted.title")}
              icon="🎣"
              href="#getting-started"
              items={[
                t("categories.gettingStarted.items.createAccount"),
                t("categories.gettingStarted.items.findCharter"),
                t("categories.gettingStarted.items.makeBooking"),
              ]}
              exploreText={t("categories.explore")}
            />
            <CategoryCard
              title={t("categories.account.title")}
              icon="👤"
              href="#account"
              items={[
                t("categories.account.items.profile"),
                t("categories.account.items.password"),
                t("categories.account.items.notifications"),
              ]}
              exploreText={t("categories.explore")}
            />
            <CategoryCard
              title={t("categories.payments.title")}
              icon="💳"
              href="#payments"
              items={[
                t("categories.payments.items.methods"),
                t("categories.payments.items.deposits"),
                t("categories.payments.items.refunds"),
              ]}
              exploreText={t("categories.explore")}
            />
            <CategoryCard
              title={t("categories.safety.title")}
              icon="🛟"
              href="#safety"
              items={[
                t("categories.safety.items.verification"),
                t("categories.safety.items.checklist"),
                t("categories.safety.items.report"),
              ]}
              exploreText={t("categories.explore")}
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
              <p className="text-sm font-semibold">{t("toc.title")}</p>
              <ul className="mt-3 space-y-2 text-sm">
                <TocItem
                  href="#getting-started"
                  label={t("toc.gettingStarted")}
                />
                <TocItem href="#account" label={t("toc.account")} />
                <TocItem href="#payments" label={t("toc.payments")} />
                <TocItem href="#safety" label={t("toc.safety")} />
                <TocItem href="#faq" label={t("toc.faq")} />
              </ul>
              <a
                className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#EC2227] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95"
                href={`/${locale}/contact`}
              >
                {t("toc.contactSupport")}
              </a>
            </div>
          </aside>

          {/* Main */}
          <article className="prose max-w-none prose-neutral">
            <Section
              id="getting-started"
              title={t("sections.gettingStarted.title")}
            >
              <h3 id="create-account" className="!mt-0">
                {t("sections.gettingStarted.createAccount.title")}
              </h3>
              <p>{t("sections.gettingStarted.createAccount.content")}</p>
              <h3 id="search-charters">
                {t("sections.gettingStarted.findCharter.title")}
              </h3>
              <p>{t("sections.gettingStarted.findCharter.content")}</p>
              <h3 id="make-booking">
                {t("sections.gettingStarted.makeBooking.title")}
              </h3>
              <p>{t("sections.gettingStarted.makeBooking.content")}</p>
            </Section>

            <Section id="account" title={t("sections.account.title")}>
              <h3 id="update-profile" className="!mt-0">
                {t("sections.account.profile.title")}
              </h3>
              <p>{t("sections.account.profile.content")}</p>
              <h3 id="change-password">
                {t("sections.account.password.title")}
              </h3>
              <p>{t("sections.account.password.content")}</p>
              <h3 id="notifications">
                {t("sections.account.notifications.title")}
              </h3>
              <p>{t("sections.account.notifications.content")}</p>
            </Section>

            <Section id="payments" title={t("sections.payments.title")}>
              <h3 id="payment-methods" className="!mt-0">
                {t("sections.payments.methods.title")}
              </h3>
              <p>{t("sections.payments.methods.content")}</p>
              <h3 id="cancellations">
                {t("sections.payments.deposits.title")}
              </h3>
              <p>{t("sections.payments.deposits.content")}</p>
              <h3 id="refunds">{t("sections.payments.refunds.title")}</h3>
              <p>{t("sections.payments.refunds.content")}</p>
            </Section>

            <Section id="safety" title={t("sections.safety.title")}>
              <h3 id="captain-verification" className="!mt-0">
                {t("sections.safety.verification.title")}
              </h3>
              <p>{t("sections.safety.verification.content")}</p>
              <h3 id="safety-checklist">
                {t("sections.safety.checklist.title")}
              </h3>
              <ul>
                <li>{t("sections.safety.checklist.items.confirm")}</li>
                <li>{t("sections.safety.checklist.items.bring")}</li>
                <li>{t("sections.safety.checklist.items.follow")}</li>
              </ul>
              <h3 id="report-issue">{t("sections.safety.report.title")}</h3>
              <p>
                {t.rich("sections.safety.report.content", {
                  email: (chunks) => (
                    <a href="mailto:support@fishon.my">{chunks}</a>
                  ),
                  contact: (chunks) => (
                    <a href={`/${locale}/contact`}>{chunks}</a>
                  ),
                })}
              </p>
            </Section>

            {/* Top FAQs accordion */}
            <div id="faq" className="mt-12 not-prose">
              <h2 className="text-2xl font-semibold">{t("faq.title")}</h2>
              <div className="mt-4 border divide-y rounded-xl border-neutral-200">
                {faqItems.slice(0, 4).map((item, i) => (
                  <Faq key={i} q={item.question} a={item.answer} />
                ))}
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
                  {t("contact.email.title")}
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  {t("contact.email.description")}
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
                  {t("contact.whatsapp.title")}
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  {t("contact.whatsapp.description")}
                </p>
                <a
                  href="https://wa.me/60165304304"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                >
                  {t("contact.whatsapp.cta")}
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
                  {t("contact.liveChat.title")}
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  {t("contact.liveChat.description")}
                </p>
                <button
                  disabled
                  className="w-full px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border rounded-md cursor-not-allowed border-neutral-200"
                >
                  {t("contact.liveChat.cta")}
                </button>
              </div>
            </div>

            {/* Additional Common Questions from Account Support */}
            <div className="mt-10 not-prose">
              <h2 className="text-2xl font-semibold">
                {t("moreQuestions.title")}
              </h2>
              <div className="mt-4 border divide-y rounded-xl border-neutral-200">
                {faqItems.slice(4).map((item, i) => (
                  <Faq key={i} q={item.question} a={item.answer} />
                ))}
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
  exploreText,
}: {
  title: string;
  icon: string;
  href: string;
  items: string[];
  exploreText: string;
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
        {exploreText}
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
