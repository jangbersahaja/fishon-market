import CategoryCard from "@/components/marketing/CategoryCard";
import { getFishingTypeImage } from "@/lib/helpers/image-helpers";
import { getFishingTypesWithCounts } from "@/lib/helpers/popularity-helpers";
import type { Charter } from "@fishon/ui";
import Link from "next/link";

export default function BrowseByType({ charters }: { charters: Charter[] }) {
  const types = getFishingTypesWithCounts(charters);

  return (
    <section className="mx-auto w-full max-w-7xl px-2 md:px-0">
      <div className="w-full px-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Browse By Type</h2>
          <Link
            href="/categories/types"
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
                href={`/search/category/type/${t.key}`}
                label={t.label}
                count={t.count}
                subtitle={`Explore ${t.label.toLowerCase()} trips`}
                image={image}
                alt={`${t.label} fishing`}
              />
            );
          })}
        </div>
        <div className="mt-4 flex justify-start md:hidden">
          <Link
            href="/categories/types"
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            See all fishing types
          </Link>
        </div>
      </div>
    </section>
  );
}
