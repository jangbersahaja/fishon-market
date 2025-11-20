import CategoryCard from "@/components/marketing/CategoryCard";
import { getFishingTechniqueImage } from "@/lib/helpers/image-helpers";
import { getPopularTechniques } from "@/lib/helpers/popularity-helpers";
import type { Charter } from "@fishon/ui";
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

export default function TopTechniques({ charters }: { charters: Charter[] }) {
  const topTechniques = getPopularTechniques(
    charters,
    TECHNIQUE_DEFS as unknown as string[],
    5
  );

  if (topTechniques.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-2 md:px-0">
      <div className="w-full px-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Top Fishing Techniques</h2>
          <Link
            href="/categories/techniques"
            className="hidden text-sm font-medium text-[#ec2227] hover:underline md:inline"
          >
            See all fishing techniques
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5">
          {topTechniques.map(({ name, count }) => {
            const image = getFishingTechniqueImage(name);
            return (
              <CategoryCard
                key={name}
                href={`/search/category/technique/${encodeURIComponent(
                  name.toLowerCase()
                )}`}
                label={name}
                count={count}
                subtitle={`Charters using ${name.toLowerCase()}`}
                image={image}
                alt={`${name} technique`}
              />
            );
          })}
        </div>

        <div className="mt-4 flex justify-start md:hidden">
          <Link
            href="/categories/techniques"
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            See all fishing techniques
          </Link>
        </div>
      </div>
    </section>
  );
}
