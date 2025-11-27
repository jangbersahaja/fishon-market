"use client";

import DestinationGrid from "@/components/marketing/DestinationGrid";
import { getPopularDestinations } from "@/lib/helpers/popularity-helpers";
import type { Charter } from "@fishon/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

interface PopularDestinationProps {
  charters: Charter[];
}

const PopularDestination = ({ charters }: PopularDestinationProps) => {
  const locale = useLocale();
  const t = useTranslations("home.popularDestinations");
  // Get all popular destinations with charter images
  const allDestinations = getPopularDestinations(charters, 50);

  // Use charter images for all destinations, limit to top 10
  const destinationsWithImages = allDestinations
    .filter((d) => d.charterImage)
    .slice(0, 10);

  if (destinationsWithImages.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center w-full px-2 mx-auto md:px-0 max-w-7xl">
      <div className="flex flex-col w-full px-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <Link
            href={`/${locale}/categories/destinations`}
            className="hidden text-sm font-medium text-[#ec2227] hover:underline md:inline"
          >
            {t("seeAll")}
          </Link>
        </div>
        <DestinationGrid destinations={destinationsWithImages} />
        <div className="flex justify-start mt-4 md:hidden">
          <Link
            href={`/${locale}/categories/destinations`}
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PopularDestination;
