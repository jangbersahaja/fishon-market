import SpeciesGrid from "@/components/categories/SpeciesGrid";
import { getAvailableSpeciesByCategory } from "@/lib/helpers/species-helpers";
import { getCharters } from "@/lib/services/charter-service";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

type RouteParams = Promise<{ locale: string }>;

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ms" }];
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "categories.species" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SpeciesCategoriesPage({
  params,
}: {
  params: RouteParams;
}) {
  noStore();
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);

  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "categories.species" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const charters = await getCharters();
  const speciesByCategory = getAvailableSpeciesByCategory(charters);

  // Calculate total unique species count
  const totalSpecies = speciesByCategory.reduce(
    (sum, cat) => sum + cat.species.length,
    0
  );

  return (
    <div className="w-full px-4 py-8 mx-auto max-w-7xl md:px-5">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href={`/${locale}/home`} className="hover:underline">
          {tNav("home")}
        </Link>{" "}
        / <span className="font-medium text-gray-700">{t("breadcrumb")}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="max-w-2xl mt-2 text-sm text-gray-600">
          {t("description")}
        </p>
        {totalSpecies > 0 && (
          <p className="mt-2 text-sm font-medium text-[#ec2227]">
            {t("totalSpecies", { count: totalSpecies })}
          </p>
        )}
      </header>

      {/* Species Grid */}
      {speciesByCategory.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">{t("noSpeciesFound")}</p>
          <Link
            href={`/${locale}/home`}
            className="mt-4 inline-block text-[#ec2227] hover:underline font-medium"
          >
            {t("backToBrowse")}
          </Link>
        </div>
      ) : (
        <SpeciesGrid categories={speciesByCategory} />
      )}

      {/* Bottom Navigation */}
      <div className="flex flex-wrap items-center gap-4 pt-6 mt-10 text-sm border-t">
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
        <span className="text-gray-300">•</span>
        <Link
          href={`/${locale}/categories/destinations`}
          className="text-[#ec2227] hover:underline font-medium"
        >
          {t("seeAllDestinations")}
        </Link>
      </div>
    </div>
  );
}
