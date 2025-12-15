import {
  createFAQPageSchema,
  createMetadata,
  serializeSchema,
} from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

type RouteParams = Promise<{ locale: string }>;

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ms" }];
}

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
  params: RouteParams;
}) {
  noStore();
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
      <Hero locale={locale} t={t} lastUpdated={lastUpdated} />

      {/* Quick category cards */}
      <QuickCategories locale={locale} t={t} />

      {/* Content with sticky TOC */}
      <ContentSection locale={locale} t={t} faqItems={faqItems} />
    </main>
  );
}

/* ---- UI Components ---- */

/**
 * Hero Section - Page header with title and description
 */
interface HeroProps {
  locale: string;
  t: (key: string, values?: Record<string, string>) => string;
  lastUpdated: string;
}

function Hero({ locale, t, lastUpdated }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,34,39,0.08),transparent_55%)]" />
      <div className="relative px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 mb-6 text-sm">
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
      </div>
    </section>
  );
}

/**
 * Quick Categories Section - Navigation cards to main topics
 */
interface QuickCategoriesProps {
  locale: string;
  t: (key: string) => string;
}

function QuickCategories({ locale, t }: QuickCategoriesProps) {
  const categories = [
    {
      titleKey: "categories.gettingStarted.title",
      icon: "🎣",
      href: "#getting-started",
      itemKeys: [
        "categories.gettingStarted.items.createAccount",
        "categories.gettingStarted.items.findCharter",
        "categories.gettingStarted.items.makeBooking",
      ],
    },
    {
      titleKey: "categories.account.title",
      icon: "👤",
      href: "#account",
      itemKeys: [
        "categories.account.items.profile",
        "categories.account.items.password",
        "categories.account.items.notifications",
      ],
    },
    {
      titleKey: "categories.payments.title",
      icon: "💳",
      href: "#payments",
      itemKeys: [
        "categories.payments.items.methods",
        "categories.payments.items.deposits",
        "categories.payments.items.refunds",
      ],
    },
    {
      titleKey: "categories.safety.title",
      icon: "🛟",
      href: "#safety",
      itemKeys: [
        "categories.safety.items.verification",
        "categories.safety.items.checklist",
        "categories.safety.items.report",
      ],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.titleKey}
              title={t(category.titleKey)}
              icon={category.icon}
              href={category.href}
              items={category.itemKeys.map((key) => t(key))}
              exploreText={t("categories.explore")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Content Section - Main help content with TOC and FAQ
 */
interface ContentSectionProps {
  locale: string;
  t: any;
  faqItems: Array<{ question: string; answer: string }>;
}

function ContentSection({ locale, t, faqItems }: ContentSectionProps) {
  return (
    <section className="w-full px-4 pt-6 pb-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        {/* Sticky Table of Contents */}
        <TableOfContents locale={locale} t={t} />

        {/* Main Content */}
        <article>
          <Section
            id="getting-started"
            title={t("sections.gettingStarted.title")}
          >
            <div className="space-y-6">
              <div>
                <h3
                  id="create-account"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.gettingStarted.createAccount.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.gettingStarted.createAccount.content")}
                </p>
              </div>
              <div>
                <h3
                  id="search-charters"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.gettingStarted.findCharter.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.gettingStarted.findCharter.content")}
                </p>
              </div>
              <div>
                <h3
                  id="make-booking"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.gettingStarted.makeBooking.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.gettingStarted.makeBooking.content")}
                </p>
              </div>
            </div>
          </Section>

          <Section id="account" title={t("sections.account.title")}>
            <div className="space-y-6">
              <div>
                <h3
                  id="update-profile"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.account.profile.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.account.profile.content")}
                </p>
              </div>
              <div>
                <h3
                  id="change-password"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.account.password.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.account.password.content")}
                </p>
              </div>
              <div>
                <h3
                  id="notifications"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.account.notifications.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.account.notifications.content")}
                </p>
              </div>
            </div>
          </Section>

          <Section id="payments" title={t("sections.payments.title")}>
            <div className="space-y-6">
              <div>
                <h3
                  id="payment-methods"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.payments.methods.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.payments.methods.content")}
                </p>
              </div>
              <div>
                <h3
                  id="cancellations"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.payments.deposits.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.payments.deposits.content")}
                </p>
              </div>
              <div>
                <h3
                  id="refunds"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.payments.refunds.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.payments.refunds.content")}
                </p>
              </div>
            </div>
          </Section>

          <Section id="safety" title={t("sections.safety.title")}>
            <div className="space-y-6">
              <div>
                <h3
                  id="captain-verification"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.safety.verification.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t("sections.safety.verification.content")}
                </p>
              </div>
              <div>
                <h3
                  id="safety-checklist"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.safety.checklist.title")}
                </h3>
                <ul className="mt-3 space-y-2 list-disc list-inside text-neutral-700">
                  <li>{t("sections.safety.checklist.items.confirm")}</li>
                  <li>{t("sections.safety.checklist.items.bring")}</li>
                  <li>{t("sections.safety.checklist.items.follow")}</li>
                </ul>
              </div>
              <div>
                <h3
                  id="report-issue"
                  className="text-lg font-semibold text-gray-900"
                >
                  {t("sections.safety.report.title")}
                </h3>
                <p className="mt-2 text-neutral-700">
                  {t.rich("sections.safety.report.content", {
                    email: (chunks: React.ReactNode) => (
                      <a
                        href="mailto:support@fishon.my"
                        className="text-[#EC2227] hover:underline"
                      >
                        {chunks}
                      </a>
                    ),
                    contact: (chunks: React.ReactNode) => (
                      <a
                        href={`/${locale}/support/contact`}
                        className="text-[#EC2227] hover:underline"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              </div>
            </div>
          </Section>

          {/* Combined FAQ Section */}
          <FAQSection
            title={t("faq.title")}
            description={t("faq.description")}
            faqItems={faqItems}
          />

          {/* Contact Options */}
          <ContactOptions t={t} />
        </article>
      </div>
    </section>
  );
}

/**
 * Table of Contents - Sticky navigation sidebar
 */
interface TableOfContentsProps {
  locale: string;
  t: any;
}

function TableOfContents({ locale, t }: TableOfContentsProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky p-4 bg-white border top-20 rounded-xl border-neutral-200">
        <p className="text-sm font-semibold text-gray-900">{t("toc.title")}</p>
        <nav className="mt-3 space-y-2">
          <TocItem href="#getting-started" label={t("toc.gettingStarted")} />
          <TocItem href="#account" label={t("toc.account")} />
          <TocItem href="#payments" label={t("toc.payments")} />
          <TocItem href="#safety" label={t("toc.safety")} />
          <TocItem href="#faq" label={t("toc.faq")} />
        </nav>
        <a
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#EC2227] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95 transition-opacity"
          href={`/${locale}/support/contact`}
        >
          {t("toc.contactSupport")}
        </a>
      </div>
    </aside>
  );
}

/**
 * Combined FAQ Section - All FAQs in one organized section
 */
interface FAQSectionProps {
  title: string;
  description: string;
  faqItems: Array<{ question: string; answer: string }>;
}

function FAQSection({ title, description, faqItems }: FAQSectionProps) {
  return (
    <div id="faq" className="mb-12">
      <h2 className="mb-3 text-2xl font-bold text-gray-900">{title}</h2>
      <p className="mb-6 text-neutral-600">{description}</p>
      <div className="overflow-hidden border divide-y shadow-sm rounded-xl border-neutral-200">
        {faqItems.map((item, index) => (
          <FAQItem key={index} q={item.question} a={item.answer} />
        ))}
      </div>
    </div>
  );
}

/**
 * Contact Options Grid - Email, WhatsApp, Live Chat
 */
interface ContactOptionsProps {
  t: any;
}

function ContactOptions({ t }: ContactOptionsProps) {
  const contactChannels = [
    {
      icon: (
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
      ),
      bgColor: "bg-blue-50",
      title: t("contact.email.title"),
      description: t("contact.email.description"),
      cta: "support@fishon.my",
      href: "mailto:support@fishon.my",
      isPrimary: false,
    },
    {
      icon: (
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
      ),
      bgColor: "bg-green-50",
      title: t("contact.whatsapp.title"),
      description: t("contact.whatsapp.description"),
      cta: t("contact.whatsapp.cta"),
      href: "https://wa.me/60165304304",
      isPrimary: true,
    },
    {
      icon: (
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
      ),
      bgColor: "bg-purple-50",
      title: t("contact.liveChat.title"),
      description: t("contact.liveChat.description"),
      cta: t("contact.liveChat.cta"),
      href: null,
      isDisabled: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 mt-12 md:grid-cols-3">
      {contactChannels.map((channel) => (
        <ContactCard
          key={channel.title}
          icon={channel.icon}
          bgColor={channel.bgColor}
          title={channel.title}
          description={channel.description}
          cta={channel.cta}
          href={channel.href}
          isPrimary={channel.isPrimary}
          isDisabled={channel.isDisabled}
        />
      ))}
    </div>
  );
}

/**
 * Category Card - Individual category navigation card
 */
interface CategoryCardProps {
  title: string;
  icon: string;
  href: string;
  items: string[];
  exploreText: string;
}

function CategoryCard({
  title,
  icon,
  href,
  items,
  exploreText,
}: CategoryCardProps) {
  return (
    <a
      href={href}
      className="p-5 transition border group rounded-2xl border-neutral-200 hover:shadow-md hover:border-neutral-300"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EC2227]/10">
          <span className="text-lg">{icon}</span>
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-600">
        {items.map((item) => (
          <li key={item} className="truncate">
            {item}
          </li>
        ))}
      </ul>
      <span className="mt-3 inline-block text-sm font-medium text-[#EC2227] group-hover:underline">
        {exploreText}
      </span>
    </a>
  );
}

/**
 * Table of Contents Item - Individual TOC link
 */
interface TocItemProps {
  href: string;
  label: string;
}

function TocItem({ href, label }: TocItemProps) {
  return (
    <li className="list-none ">
      <a
        href={href}
        className="text-sm text-neutral-700 hover:text-[#EC2227] hover:underline transition-colors"
      >
        {label}
      </a>
    </li>
  );
}

/**
 * Section - Main content section wrapper
 */
interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

/**
 * FAQ Item - Individual FAQ accordion item
 */
interface FAQItemProps {
  q: string;
  a: string;
}

function FAQItem({ q, a }: FAQItemProps) {
  return (
    <details className="cursor-pointer group">
      <summary className="flex items-center justify-between px-4 py-4 list-none transition-colors hover:bg-neutral-50">
        <span className="flex-1 font-medium text-gray-900">{q}</span>
        <span className="ml-2 transition text-neutral-400 group-open:rotate-90 shrink-0">
          ›
        </span>
      </summary>
      <div className="px-4 pb-4 border-t text-neutral-700 bg-neutral-50 border-neutral-100">
        <p>{a}</p>
      </div>
    </details>
  );
}

/**
 * Fallback for legacy Faq component (if used elsewhere)
 */
function Faq({ q, a }: { q: string; a: string }) {
  return <FAQItem q={q} a={a} />;
}

/**
 * Contact Card - Individual contact method card
 */
interface ContactCardProps {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  description: string;
  cta: string;
  href: string | null;
  isPrimary?: boolean;
  isDisabled?: boolean;
}

function ContactCard({
  icon,
  bgColor,
  title,
  description,
  cta,
  href,
  isPrimary = false,
  isDisabled = false,
}: ContactCardProps) {
  return (
    <div className="p-6 transition-shadow bg-white border rounded-lg border-neutral-200 hover:shadow-md">
      <div
        className={`flex items-center justify-center w-12 h-12 mb-4 rounded-full ${bgColor}`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mb-4 text-sm text-neutral-600">{description}</p>
      {isDisabled ? (
        <button
          disabled
          className="w-full px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border rounded-md cursor-not-allowed border-neutral-200"
        >
          {cta}
        </button>
      ) : (
        <a
          href={href || "#"}
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all ${
            isPrimary
              ? "text-white bg-green-600 border border-transparent hover:bg-green-700"
              : "text-gray-700 bg-white border border-neutral-300 hover:bg-gray-50"
          }`}
        >
          {cta}
        </a>
      )}
    </div>
  );
}
