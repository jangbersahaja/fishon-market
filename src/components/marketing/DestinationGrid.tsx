"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface Destination {
  name: string;
  count: number;
  charterImage?: string;
  state?: string;
}

interface DestinationCardProps {
  destination: Destination;
  locale: string;
}

function DestinationCard({ destination, locale }: DestinationCardProps) {
  const t = useTranslations("home.popularDestinations");

  return (
    <Link
      href={`/${locale}/search?destination=${encodeURIComponent(destination.name)}`}
      className="flex flex-col gap-2 group"
      title={t("findChartersIn", { destination: destination.name })}
    >
      <div className="relative h-48 overflow-hidden bg-gray-200 rounded-lg">
        {destination.charterImage ? (
          <Image
            src={destination.charterImage}
            alt={t("altText", { destination: destination.name })}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold">{destination.name}</span>
        <span className="text-xs">
          {t("chartersAvailable", { count: destination.count })}
        </span>
      </div>
    </Link>
  );
}

interface DestinationGridProps {
  destinations: Destination[];
  gridClassName?: string;
}

export default function DestinationGrid({
  destinations,
  gridClassName = "grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
}: DestinationGridProps) {
  const locale = useLocale();

  return (
    <div className={gridClassName}>
      {destinations.map((dest) => (
        <DestinationCard key={dest.name} destination={dest} locale={locale} />
      ))}
    </div>
  );
}

export function DestinationGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="flex flex-col gap-1">
            <div className="w-24 h-4 bg-gray-300 rounded" />
            <div className="w-16 h-3 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
