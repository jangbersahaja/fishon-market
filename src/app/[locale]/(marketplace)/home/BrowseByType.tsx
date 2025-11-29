"use client";
import FishingTypeGrid from "@/components/marketing/FishingTypeGrid";
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
    <section className="w-full bg-gray-50 py-16 md:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex flex-col w-full">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("title")}
            </h2>
            <Link
              href={`/${locale}/categories/types`}
              className="hidden items-center gap-1 text-sm font-semibold text-[#ec2227] transition-colors hover:text-red-700 md:inline-flex"
            >
              {t("seeAll")} <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <FishingTypeGrid types={types} />

          <div className="mt-8 flex justify-center md:hidden">
            <Link
              href={`/${locale}/categories/types`}
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
