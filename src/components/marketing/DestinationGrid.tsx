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
      className="group relative flex h-64 w-full flex-col overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl sm:h-80"
      title={t("findChartersIn", { destination: destination.name })}
    >
      {/* Image Background */}
      <div className="absolute inset-0 h-full w-full">
        {destination.charterImage ? (
          <Image
            src={destination.charterImage}
            alt={t("altText", { destination: destination.name })}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
            priority={false}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-5 text-white">
        <h3 className="text-xl font-bold tracking-tight md:text-2xl drop-shadow-md">
          {destination.name}
        </h3>
        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white/90">
          <span>{t("chartersAvailable", { count: destination.count })}</span>
          <span className="inline-block opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
            →
          </span>
        </p>
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
        <div
          key={i}
          className="relative h-64 w-full overflow-hidden rounded-2xl bg-gray-200 animate-pulse sm:h-80"
        >
          <div className="absolute bottom-0 left-0 w-full p-5">
            <div className="mb-2 h-6 w-3/4 rounded bg-gray-300" />
            <div className="h-4 w-1/2 rounded bg-gray-300" />
          </div>
        </div>
      ))}
    </div>
  );
}
