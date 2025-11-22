"use client";
import CategoryCard from "@/components/marketing/CategoryCard";
import { getFishingTypeImage } from "@/lib/helpers/image-helpers";
import { getFishingTypesWithCounts } from "@/lib/helpers/popularity-helpers";

import { useLocale } from "next-intl";
import Link from "next/link";

interface BrowseByTypeProps {
  charters: any[];
}

export default function BrowseByType({ charters }: BrowseByTypeProps) {
  const locale = useLocale();
  const types = getFishingTypesWithCounts(charters);

  return (
    <section className="w-full px-2 mx-auto max-w-7xl md:px-0">
      <div className="w-full px-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Browse By Type</h2>
          <Link
            href={`/${locale}/categories/types`}
            className="hidden text-sm font-medium text-[#ec2227] hover:underline md:inline"
          >
            See all fishing types
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {types.map((t) => {
            const image = getFishingTypeImage(t.key);
            return (
              <CategoryCard
                key={t.key}
                href={`/${locale}/search/category/type/${t.key}`}
                label={t.label}
                count={t.count}
                subtitle={`Explore ${t.label.toLowerCase()} trips`}
                image={image}
                alt={`${t.label} fishing`}
              />
            );
          })}
        </div>
        <div className="flex justify-start mt-4 md:hidden">
          <Link
            href={`/${locale}/categories/types`}
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            See all fishing types
          </Link>
        </div>
      </div>
    </section>
  );
}
