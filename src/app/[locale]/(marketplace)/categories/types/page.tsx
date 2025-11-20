// src/app/categories/types/page.tsx
import CategoryCard from "@/components/marketing/CategoryCard";
import { getCharters } from "@/lib/services/charter-service";
import { getFishingTypeImage } from "@/lib/helpers/image-helpers";
import { getFishingTypesWithCounts } from "@/lib/helpers/popularity-helpers";
import Link from "next/link";

export default async function TypesCategoriesPage() {
  const charters = await getCharters();
  const types = getFishingTypesWithCounts(charters);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-5">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/home" className="hover:underline">
          Home
        </Link>{" "}
        / <span className="text-gray-700 font-medium">Fishing Types</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">All Fishing Types</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse every fishing type available on Fishon. Tap a type to see all
          charters.
        </p>
      </header>

      {types.length === 0 ? (
        <p className="text-gray-600">No fishing types found yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {types.map((t) => {
            const image = getFishingTypeImage(t.key);
            return (
              <CategoryCard
                key={t.key}
                href={`/search/category/type/${t.key}`}
                label={t.label}
                count={t.count}
                image={image}
                alt={`${t.label} fishing`}
                subtitle={`Explore ${t.label.toLowerCase()} trips`}
              />
            );
          })}
        </div>
      )}

      {/* Back / Secondary nav */}
      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href="/home"
          className="text-[#ec2227] hover:underline font-medium"
        >
          ← Back to Browse
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href="/categories/techniques"
          className="text-[#ec2227] hover:underline font-medium"
        >
          See all fishing techniques
        </Link>
      </div>
    </div>
  );
}
