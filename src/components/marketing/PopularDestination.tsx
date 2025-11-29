"use client";

import DestinationGrid from "@/components/marketing/DestinationGrid";
import { getDestinationImage } from "@/lib/helpers/location-image-helpers";
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
  // Get all popular destinations
  const allDestinations = getPopularDestinations(charters, 50);

  // Filter destinations that have either landmark image or charter image, limit to top 10
  const destinationsWithImages = allDestinations
    .filter(
      (d) => getDestinationImage(d.name, d.state, d.charterImage) !== undefined
    )
    .slice(0, 10);

  if (destinationsWithImages.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-gray-50 py-16 md:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex flex-col w-full">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {t("title")}
              </h2>
              <p className="text-lg text-gray-600">{t("subtitle")}</p>
            </div>
            <Link
              href={`/${locale}/categories/destinations`}
              className="hidden items-center gap-1 text-sm font-semibold text-[#ec2227] transition-colors hover:text-red-700 md:inline-flex"
            >
              {t("seeAll")} <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <DestinationGrid destinations={destinationsWithImages} />

          <div className="mt-8 flex justify-center md:hidden">
            <Link
              href={`/${locale}/categories/destinations`}
              className="inline-flex items-center justify-center rounded-full bg-[#ec2227] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-red-700"
            >
              {t("seeAll")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularDestination;
