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
    <section className="w-full px-2 mx-auto max-w-7xl md:px-0">
      <div className="w-full px-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <Link
            href={`/${locale}/categories/techniques`}
            className="hidden text-sm font-medium text-[#ec2227] hover:underline md:inline"
          >
            {t("seeAll")}
          </Link>
        </div>

        <FishingTechniqueGrid
          techniques={topTechniques}
          gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5"
        />

        <div className="flex justify-start mt-4 md:hidden">
          <Link
            href={`/${locale}/categories/techniques`}
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
