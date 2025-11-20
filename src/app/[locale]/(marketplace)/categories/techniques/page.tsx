// src/app/categories/techniques/page.tsx
import CategoryCard from "@/components/marketing/CategoryCard";
import { getCharters } from "@/lib/services/charter-service";
import { getFishingTechniqueImage } from "@/lib/helpers/image-helpers";
import Link from "next/link";

function normalizeLabel(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function TechniquesCategoriesPage() {
  const charters = await getCharters();

  // Build a unique list of techniques with counts (case-insensitive)
  const map = new Map<string, number>();

  charters.forEach((c) => {
    (c.techniques || []).forEach((raw: string) => {
      const key = (raw || "").toLowerCase().trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
  });

  const items = Array.from(map.entries())
    .map(([key, count]) => ({
      key,
      label: normalizeLabel(key),
      count,
      image: getFishingTechniqueImage(key),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-5">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/home" className="hover:underline">
          Home
        </Link>{" "}
        / <span className="text-gray-700 font-medium">Fishing Techniques</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          All Fishing Techniques
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse every technique available on Fishon. Tap a technique to see all
          charters using it.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-gray-600">No techniques found yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((t) => (
            <CategoryCard
              key={t.key}
              href={`/search/category/technique/${encodeURIComponent(
                t.label.toLowerCase()
              )}`}
              label={t.label}
              count={t.count}
              image={t.image}
              alt={`${t.label} technique`}
              subtitle={`Charters using ${t.label.toLowerCase()}`}
            />
          ))}
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
          href="/categories/types"
          className="text-[#ec2227] hover:underline font-medium"
        >
          See all fishing types
        </Link>
      </div>
    </div>
  );
}
