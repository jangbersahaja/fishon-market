// src/app/categories/types/page.tsx
import FishingTypeGrid from "@/components/marketing/FishingTypeGrid";
import { getFishingTypesWithCounts } from "@/lib/helpers/popularity-helpers";
import { getCharters } from "@/lib/services/charter-service";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function TypesCategoriesPage() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "categories.types" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const charters = await getCharters();
  const types = getFishingTypesWithCounts(charters);

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

      {types.length === 0 ? (
        <p className="text-gray-600">{t("noTypesFound")}</p>
      ) : (
        <FishingTypeGrid types={types} />
      )}

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
          href={`/${locale}/categories/techniques`}
          className="text-[#ec2227] hover:underline font-medium"
        >
          {t("seeAllTechniques")}
        </Link>
      </div>
    </div>
  );
}
