import FishingTechniqueGrid from "@/components/marketing/FishingTechniqueGrid";
import { getPopularTechniques } from "@/lib/helpers/popularity-helpers";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

const TECHNIQUE_DEFS = [
  "Jigging",
  "Trolling",
  "Casting",
  "Bottom Fishing",
  "Topwater",
  "Fly Fishing",
  "Drift Fishing",
  "Squid/Eging",
] as const;

// Define TopTechniquesProps type
interface TopTechniquesProps {
  charters: any[];
}

export default function TopTechniques({ charters }: TopTechniquesProps) {
  const locale = useLocale();
  const t = useTranslations("home.topTechniques");
  const topTechniques = getPopularTechniques(
    charters,
    TECHNIQUE_DEFS as unknown as string[],
    5
  );

  if (topTechniques.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-16 md:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex flex-col w-full">
          <div className="mb-10 flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-2 text-lg text-gray-600 max-w-2xl">
              {t("subtitle")}
            </p>
          </div>

          <FishingTechniqueGrid techniques={topTechniques} />

          <div className="mt-10 flex justify-center">
            <Link
              href={`/${locale}/categories/techniques`}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              {t("seeAll")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
