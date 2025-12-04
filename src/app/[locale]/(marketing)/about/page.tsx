import {
  Anchor,
  Award,
  Calendar,
  CheckCircle2,
  CreditCard,
  Globe2,
  HeartHandshake,
  LifeBuoy,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

// --- SEO metadata ---
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aboutPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: "https://www.fishon.my/about",
    },
    openGraph: {
      title: "About Fishon.my",
      description:
        "Plan, book, and go fishing — safer and easier. Learn how we connect anglers and captains across Malaysia.",
      url: "https://www.fishon.my/about",
      siteName: "Fishon.my",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "About Fishon.my",
      description:
        "Malaysia’s #1 fishing charter booking platform — built by anglers, for anglers.",
    },
  };
}

// --- Structured data (JSON-LD) ---
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fishon.my",
  url: "https://www.fishon.my",
  slogan: "Plan, Book & Go Fishing.",
  sameAs: [
    "https://www.facebook.com/fishon.my",
    "https://www.instagram.com/fishon.my",
  ],
  brand: {
    "@type": "Brand",
    name: "Fishon",
    logo: "/favicon.ico",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@fishon.my",
      availableLanguage: ["en", "ms"],
    },
  ],
};

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");
  const locale = await getLocale();

  return (
    <main className="bg-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* Hero Section */}
      <div className="relative py-24 overflow-hidden isolate bg-slate-900 sm:py-32">
        <div className="absolute inset-0 object-cover w-full h-full -z-10 opacity-20">
          {/* Placeholder for a real hero image - using a gradient for now */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
        </div>

        <div className="px-6 mx-auto text-center max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {t("hero.title")}{" "}
              <span className="text-[#EC2227]">Fishon.my</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              {t("hero.subtitle")}
            </p>
          </div>

          {/* Stats Overlay */}
          <div className="max-w-2xl mx-auto mt-10 lg:mx-0 lg:max-w-none">
            <div className="grid justify-center grid-cols-1 text-base font-semibold leading-7 text-white gap-x-8 gap-y-6 sm:grid-cols-2 md:flex lg:gap-x-10">
              <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-normal text-gray-400">
                  {t("hero.stats.founded.label")}
                </dt>
                <dd className="text-2xl">{t("hero.stats.founded.value")}</dd>
              </div>
              <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-normal text-gray-400">
                  {t("hero.stats.focus.label")}
                </dt>
                <dd className="text-2xl">{t("hero.stats.focus.value")}</dd>
              </div>
              <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-normal text-gray-400">
                  {t("hero.stats.mission.label")}
                </dt>
                <dd className="text-2xl">{t("hero.stats.mission.value")}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <section className="py-24 bg-white sm:py-32">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-[#EC2227]">
              {t("mission.label")}
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("mission.title")}
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t("mission.description")}
            </p>
          </div>

          <div className="max-w-2xl mx-auto mt-16 sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
              <div className="flex flex-col">
                <dt className="flex items-center text-base font-semibold leading-7 text-gray-900 gap-x-3">
                  <LifeBuoy
                    className="h-5 w-5 flex-none text-[#EC2227]"
                    aria-hidden="true"
                  />
                  {t("mission.problem.title")}
                </dt>
                <dd className="flex flex-col flex-auto mt-4 text-base leading-7 text-gray-600">
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <span className="text-red-500">•</span>{" "}
                      {t("mission.problem.list.visibility")}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500">•</span>{" "}
                      {t("mission.problem.list.communication")}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500">•</span>{" "}
                      {t("mission.problem.list.calendar")}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500">•</span>{" "}
                      {t("mission.problem.list.payment")}
                    </li>
                  </ul>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center text-base font-semibold leading-7 text-gray-900 gap-x-3">
                  <CheckCircle2
                    className="h-5 w-5 flex-none text-[#EC2227]"
                    aria-hidden="true"
                  />
                  {t("mission.solution.title")}
                </dt>
                <dd className="flex flex-col flex-auto mt-4 text-base leading-7 text-gray-600">
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />{" "}
                      {t("mission.solution.list.search")}
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />{" "}
                      {t("mission.solution.list.profiles")}
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />{" "}
                      {t("mission.solution.list.calendar")}
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-1 text-green-600 shrink-0" />{" "}
                      {t("mission.solution.list.payment")}
                    </li>
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gray-50 sm:py-32">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto mb-16 lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <StepCard
              icon={Search}
              title={t("howItWorks.steps.discover.title")}
              description={t("howItWorks.steps.discover.description")}
            />
            <StepCard
              icon={Calendar}
              title={t("howItWorks.steps.book.title")}
              description={t("howItWorks.steps.book.description")}
            />
            <StepCard
              icon={Anchor}
              title={t("howItWorks.steps.goFishing.title")}
              description={t("howItWorks.steps.goFishing.description")}
            />
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-24 bg-white sm:py-32">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto mb-16 lg:text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ShieldCheck className="h-8 w-8 text-[#EC2227]" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("safety.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t("safety.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="p-8 transition-shadow border border-gray-200 shadow-sm rounded-2xl hover:shadow-md">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t("safety.verification.title")}
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.verification.list.id")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.verification.list.license")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.verification.list.boat")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.verification.list.insurance")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.verification.list.firstAid")}</span>
                </li>
              </ul>
            </div>

            <div className="p-8 transition-shadow border border-gray-200 shadow-sm rounded-2xl hover:shadow-md">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t("safety.conduct.title")}
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.conduct.list.briefing")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.conduct.list.weather")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.conduct.list.maintenance")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span>{t("safety.conduct.list.crew")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Captains Section */}
      <section className="py-24 bg-slate-900 sm:py-32">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto mb-16 lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("captains.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              {t("captains.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <BenefitCard
              icon={Globe2}
              title={t("captains.benefits.exposure.title")}
              desc={t("captains.benefits.exposure.description")}
            />
            <BenefitCard
              icon={Calendar}
              title={t("captains.benefits.bookings.title")}
              desc={t("captains.benefits.bookings.description")}
            />
            <BenefitCard
              icon={Users}
              title={t("captains.benefits.marketing.title")}
              desc={t("captains.benefits.marketing.description")}
            />
            <BenefitCard
              icon={CreditCard}
              title={t("captains.benefits.payments.title")}
              desc={t("captains.benefits.payments.description")}
            />
            <BenefitCard
              icon={Award}
              title={t("captains.benefits.reputation.title")}
              desc={t("captains.benefits.reputation.description")}
            />
            <BenefitCard
              icon={HeartHandshake}
              title={t("captains.benefits.opportunities.title")}
              desc={t("captains.benefits.opportunities.description")}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white sm:py-32">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto mb-16 lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("pricing.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="relative p-8 overflow-hidden bg-white shadow-lg rounded-3xl ring-1 ring-gray-200 xl:p-10">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-[#EC2227] opacity-10 rounded-full blur-2xl"></div>
              <h3 className="text-lg font-semibold leading-8 text-gray-900">
                {t("pricing.basic.title")}
              </h3>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {t("pricing.basic.description")}
              </p>
              <p className="flex items-baseline mt-6 gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">
                  10%
                </span>
                <span className="text-sm font-semibold leading-6 text-gray-600">
                  {t("pricing.basic.commission")}
                </span>
              </p>
              <ul
                role="list"
                className="mt-8 space-y-3 text-sm leading-6 text-gray-600"
              >
                <li className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-[#EC2227]" />{" "}
                  {t("pricing.basic.features.listing")}
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-[#EC2227]" />{" "}
                  {t("pricing.basic.features.calendar")}
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-[#EC2227]" />{" "}
                  {t("pricing.basic.features.chat")}
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle2 className="h-6 w-5 flex-none text-[#EC2227]" />{" "}
                  {t("pricing.basic.features.tools")}
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl ring-1 ring-gray-200 xl:p-10 bg-gray-50 lg:col-span-2">
              <div className="p-3 mb-4 bg-gray-200 rounded-full">
                <Award className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold leading-8 text-gray-900">
                {t("pricing.premium.title")}
              </h3>
              <p className="max-w-md mt-4 text-sm leading-6 text-gray-600">
                {t("pricing.premium.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section
      <section className="py-24 bg-gray-50 sm:py-32">
        <div className="px-6 mx-auto max-w-7xl lg:px-8">
          <div className="max-w-2xl mx-auto mb-16 lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("team.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t("team.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <TeamMember
              name="Fais Faudzi"
              role={t("team.roles.managingDirector")}
            />
            <TeamMember
              name="Azam Shah"
              role={t("team.roles.operationManager")}
            />
            <TeamMember
              name="Ismail Bob Hasim"
              role={t("team.roles.marketingDirector")}
            />
            <TeamMember
              name="Farhan"
              role={t("team.roles.brandingOperation")}
            />
            <TeamMember name="Jang" role={t("team.roles.platformManager")} />
            <TeamMember
              name="Shafiq Jalil"
              role={t("team.roles.publicRelation")}
            />
            <TeamMember
              name="Adib Zulhatta"
              role={t("team.roles.headOfFinance")}
            />
            <TeamMember name="FZ" role={t("team.roles.customerSupport")} />
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <div className="bg-white">
        <div className="py-24 mx-auto max-w-7xl sm:px-6 sm:py-32 lg:px-8">
          <div className="relative px-6 py-24 overflow-hidden text-center shadow-2xl isolate bg-slate-900 sm:rounded-3xl sm:px-16">
            <h2 className="max-w-2xl mx-auto text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="max-w-xl mx-auto mt-6 text-lg leading-8 text-gray-300">
              {t("cta.description")}
            </p>
            <div className="flex items-center justify-center mt-10 gap-x-6">
              <Link
                href={`/${locale}/home`}
                className="rounded-md bg-[#EC2227] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d61f24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t("cta.browse")}
              </Link>
              <Link
                href="https://captain.fishon.my/ms/list-your-business"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold leading-6 text-white"
              >
                {t("cta.list")} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-8 text-xs text-gray-500">
              {t("cta.footer")} <strong>Kartel Motion Ventures</strong>{" "}
              (202203267096 (003441013-T)).
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- UI Components ---------- */

function StepCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center p-6 text-center transition-all bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md">
      <div className="p-4 mb-4 rounded-full bg-red-50">
        <Icon className="h-8 w-8 text-[#EC2227]" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col p-6 transition-colors border bg-slate-800/50 rounded-2xl border-slate-700 hover:bg-slate-800">
      <div className="mb-4">
        <Icon className="h-6 w-6 text-[#EC2227]" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}

function TeamMember({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-4 p-4 transition-all bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
      <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-gray-400 bg-gray-100 rounded-full">
        {name.charAt(0)}
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{name}</h3>
        <p className="text-xs text-gray-500">{role}</p>
      </div>
    </div>
  );
}
