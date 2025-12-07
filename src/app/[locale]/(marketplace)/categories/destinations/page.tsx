import {
  DestinationGridSkeleton,
  GroupedDestinationsGrid,
} from "@/components/marketing/DestinationGrid";
import { getDestinationsGroupedByState } from "@/lib/helpers/popularity-helpers";
import { getCharters } from "@/lib/services/charter-service";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

type RouteParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "categories.destinations",
  });

  return {
    title: `${t("title")} | Fishon.my`,
    description: t("description"),
  };
}

async function DestinationsContent() {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "categories.destinations",
  });
  const charters = await getCharters();

  // Get destinations grouped by state
  const stateGroups = getDestinationsGroupedByState(charters);

  if (stateGroups.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t("noDestinationsFound")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Quick jump navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {stateGroups
          .filter((s) => s.state.toLowerCase() !== "other")
          .map((stateGroup) => (
            <a
              key={stateGroup.stateSlug}
              href={`#${stateGroup.stateSlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-[#ec2227] hover:text-white transition-colors"
            >
              {stateGroup.state}
              <span className="text-xs opacity-70">
                ({stateGroup.totalCharters})
              </span>
            </a>
          ))}
      </div>

      <GroupedDestinationsGrid
        stateGroups={stateGroups}
        gridClassName="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      />
    </>
  );
}

export default async function PopularDestinationsPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "categories.destinations",
  });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  return (
    <div className="w-full px-4 py-8 mx-auto max-w-7xl md:px-5">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href={`/${locale}/home`} className="hover:underline">
          {tNav("home")}
        </Link>{" "}
        / <span className="font-medium text-gray-700">{t("breadcrumb")}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("description")}</p>
      </header>

      <Suspense fallback={<DestinationGridSkeleton count={15} />}>
        <DestinationsContent />
      </Suspense>

      {/* Back / Secondary nav */}
      <div className="flex flex-wrap items-center gap-4 mt-8 text-sm">
        <Link
          href={`/${locale}/home`}
          className="text-[#ec2227] hover:underline font-medium"
        >
          ← {t("backToBrowse")}
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href={`/${locale}/categories/types`}
          className="text-[#ec2227] hover:underline font-medium"
        >
          {t("seeAllTypes")}
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href={`/${locale}/categories/techniques`}
          className="text-[#ec2227] hover:underline font-medium"
        >
          {t("seeAllTechniques")}
        </Link>
      </div>
    </div>
  );
}
