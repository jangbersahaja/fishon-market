"use client";

import type { SpeciesWithCount } from "@/lib/helpers/species-helpers";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface SpeciesCardProps {
  species: SpeciesWithCount;
}

/**
 * Individual species card with image, names, and charter count
 * Links to search filtered by this species
 */
export function SpeciesCard({ species }: SpeciesCardProps) {
  const locale = useLocale();
  const t = useTranslations("categories.species");

  // Create search URL with species filter
  const searchUrl = `/${locale}/search?species=${encodeURIComponent(species.id)}`;

  return (
    <Link
      href={searchUrl}
      className="group relative flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-[#ec2227]/30 hover:shadow-md"
    >
      {/* Species image */}
      <div className="relative h-20 w-32 overflow-hidden">
        <Image
          src={species.image}
          alt={species.english_name}
          fill
          className="object-contain transition-transform duration-300 group-hover:scale-110"
          sizes="128px"
        />
      </div>

      {/* Names */}
      <div className="flex flex-col items-center text-center">
        <span className="font-semibold text-gray-800 text-sm">
          {species.local_name}
        </span>
        <span className="text-xs text-gray-500 italic">
          {species.english_name}
        </span>
      </div>

      {/* Charter count badge */}
      <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-[#ec2227]/10 px-2 py-0.5 text-xs font-medium text-[#ec2227]">
        {t("charterCount", { count: species.charterCount })}
      </span>
    </Link>
  );
}

interface SpeciesCategoryGroupProps {
  category: {
    category: string;
    label: string;
    labelMy: string;
    species: SpeciesWithCount[];
    totalCount: number;
  };
  locale: string;
}

/**
 * Category section with header and species grid
 */
export function SpeciesCategoryGroup({
  category,
  locale,
}: SpeciesCategoryGroupProps) {
  const t = useTranslations("categories.species");

  return (
    <section className="mb-8">
      {/* Category header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">
            {locale === "ms" ? category.labelMy : category.label}
          </h2>
          <span className="text-sm text-gray-500">
            ({category.species.length} {t("speciesAvailable")})
          </span>
        </div>
      </div>

      {/* Species grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {category.species.map((species) => (
          <SpeciesCard key={species.id} species={species} />
        ))}
      </div>
    </section>
  );
}

interface SpeciesGridProps {
  categories: Array<{
    category: string;
    label: string;
    labelMy: string;
    species: SpeciesWithCount[];
    totalCount: number;
  }>;
}

/**
 * Full species grid organized by category
 */
export default function SpeciesGrid({ categories }: SpeciesGridProps) {
  const locale = useLocale();

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <SpeciesCategoryGroup
          key={category.category}
          category={category}
          locale={locale}
        />
      ))}
    </div>
  );
}
