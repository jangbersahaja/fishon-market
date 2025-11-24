"use client";
import CategoryCard from "@/components/marketing/CategoryCard";
import { getFishingTypeImage } from "@/lib/helpers/image-helpers";
import { getFishingTypesWithCounts } from "@/lib/helpers/popularity-helpers";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

interface BrowseByTypeProps {
  charters: any[];
}

export default function BrowseByType({ charters }: BrowseByTypeProps) {
  const locale = useLocale();
  const t = useTranslations("home.browseByType");
  const types = getFishingTypesWithCounts(charters);

  return (
    <section className="w-full px-2 mx-auto max-w-7xl md:px-0">
      <div className="w-full px-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <Link
            href={`/${locale}/categories/types`}
            className="hidden text-sm font-medium text-[#ec2227] hover:underline md:inline"
          >
            {t("seeAll")}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {types.map((fishingType) => {
            const image = getFishingTypeImage(fishingType.key);
            return (
              <CategoryCard
                key={fishingType.key}
                href={`/${locale}/search/category/type/${fishingType.key}`}
                label={fishingType.label}
                count={fishingType.count}
                subtitle={t("exploreTrips", {
                  type: fishingType.label.toLowerCase(),
                })}
                image={image}
                alt={t("altText", { type: fishingType.label })}
              />
            );
          })}
        </div>
        <div className="flex justify-start mt-4 md:hidden">
          <Link
            href={`/${locale}/categories/types`}
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
