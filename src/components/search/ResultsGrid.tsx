"use client";

import CharterCard from "@/components/charters/CharterCard";
import type { Charter } from "@fishon/ui";
import { useLocale } from "next-intl";
import Link from "next/link";

interface ResultsGridProps {
  items: Charter[];
  ratingsMap?: Map<
    string,
    { averageRating: number | null; reviewCount: number }
  >;
}

export default function ResultsGrid({ items, ratingsMap }: ResultsGridProps) {
  const locale = useLocale();

  // Helper to get rating for a charter
  const getRating = (c: Charter): number | null => {
    if (!ratingsMap) return null;
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.averageRating ?? null;
  };

  // Helper to get review count for a charter
  const getReviewCount = (c: Charter): number => {
    if (!ratingsMap) return 0;
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.reviewCount ?? 0;
  };

  if (!items.length) {
    return (
      <div className="p-6 text-center border border-gray-200 rounded-xl">
        <h2 className="text-lg font-semibold">No results</h2>
        <p className="mt-1 text-sm text-gray-600">
          We couldn&apos;t find any matches. Try another filter or{" "}
          <Link
            href={`/${locale}/home`}
            className="text-[#ec2227] hover:underline"
          >
            browse all
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
      {items.map((c) => (
        <CharterCard
          key={c.id}
          charter={c}
          averageRating={getRating(c)}
          reviewCount={getReviewCount(c)}
        />
      ))}
    </div>
  );
}
