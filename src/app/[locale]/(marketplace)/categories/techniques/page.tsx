// src/app/categories/techniques/page.tsx
import FishingTechniqueGrid from "@/components/marketing/FishingTechniqueGrid";
import { getFishingTechniqueImage } from "@/lib/helpers/image-helpers";
import { getCharters } from "@/lib/services/charter-service";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

function normalizeLabel(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function TechniquesCategoriesPage() {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "categories.techniques",
  });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const charters = await getCharters();

  // Build a unique list of techniques with counts (case-insensitive)
  const map = new Map<string, number>();

  charters.forEach((c) => {
    (c.techniques || []).forEach((raw: string) => {
      let key = (raw || "").toLowerCase().trim();
      if (!key) return;

      // Merge "bottom" into "bottom fishing"
      if (key === "bottom") {
        key = "bottom fishing";
      }

      map.set(key, (map.get(key) || 0) + 1);
    });
  });

  const items = Array.from(map.entries())
    .map(([key, count]) => ({
      key,
      label: normalizeLabel(key),
      count,
      image: getFishingTechniqueImage(key),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="w-full px-5 py-8 mx-auto max-w-7xl md:px-5">
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

      {items.length === 0 ? (
        <p className="text-gray-600">{t("noTechniquesFound")}</p>
      ) : (
        <FishingTechniqueGrid
          techniques={items}
          gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        />
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
          href={`/${locale}/categories/types`}
          className="text-[#ec2227] hover:underline font-medium"
        >
          {t("seeAllTypes")}
        </Link>
      </div>
    </div>
  );
}
