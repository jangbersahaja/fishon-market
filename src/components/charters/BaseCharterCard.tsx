// components/charters/BaseCharterCard.tsx
"use client";

import { FavoriteButton } from "@/components/account";
import ImageMosaic from "@/components/charters/ImageMosaic";
import StarRating from "@/components/ratings/StarRating";
import PriceTag from "@/components/shared/PriceTag";
import SafeImage from "@/components/shared/SafeImage";
import { Charter } from "@/data/mock/charter";
import { getAverageRating, getCharterReviews } from "@/lib/helpers/ratings";
import {
  capitalize,
  formatCharterName,
  formatLocation,
} from "@/lib/helpers/text-formatters";
import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";

/**
 * Unified CharterCard component with multiple variants
 *
 * Variants:
 * - full: Comprehensive card for search/listing pages (default)
 * - compact: Smaller card for sidebars/related sections
 * - nearby: Card with distance display for geolocation-based results
 * - favorite: Dashboard favorite card with notes
 *
 * Image Aspect Ratios:
 * - square: 1:1 (best for portrait images, prevents cropping)
 * - landscape: 16:9 (traditional card layout)
 */

export type CharterCardVariant = "full" | "compact" | "nearby" | "favorite";
export type ImageAspect = "square" | "landscape";

export interface CharterCardProps {
  charter: Charter;
  variant?: CharterCardVariant;
  imageAspect?: ImageAspect;
  context?: {
    date?: string;
    adults?: number;
    children?: number;
    guestsParam?: number;
  };
  // Nearby variant specific
  distance?: number; // in km
  // Favorite variant specific
  notes?: string;
  savedAt?: Date;
  // Common
  showFavoriteButton?: boolean;
  initialIsFavorited?: boolean;
  className?: string;
}

export default function BaseCharterCard({
  charter,
  variant = "full",
  imageAspect = "square",
  context,
  distance,
  notes,
  savedAt,
  showFavoriteButton = true,
  initialIsFavorited = false,
  className = "",
}: CharterCardProps) {
  const c = charter;

  // Image URLs - get all available images
  const allImages =
    c.images && c.images.length > 0
      ? c.images
      : [(c as any).imageUrl || "/placeholder-1.jpg"];
  const img = allImages[0];

  // Min price calculation
  const minPrice =
    c.trip && c.trip.length
      ? Math.min(...c.trip.map((t) => t.price))
      : undefined;

  // Build link params preserving booking context
  const params = new URLSearchParams();
  if (context?.adults) params.set("adults", String(context.adults));
  if (context?.children) params.set("children", String(context.children));
  const total =
    (typeof context?.adults === "number" ? context!.adults : 0) +
      (typeof context?.children === "number" ? context!.children : 0) ||
    context?.guestsParam ||
    0;
  if (total) params.set("booking_persons", String(total));
  if (context?.date) params.set("date", context.date);

  // Captain info (fallback for older shapes)
  const captain = (c as any).captain || null;
  const captainName =
    captain?.name || (c as any).captainName || "Not specified";
  const captainYears =
    typeof captain?.yearsExperience === "number"
      ? captain.yearsExperience
      : undefined;
  const crewCount =
    typeof captain?.crewCount === "number" ? captain.crewCount : undefined;
  const captainAvatar = captain?.image as string | undefined;

  // Fishing type badge
  const fishingType = (c as any).fishingType as string | undefined;

  // Ratings
  const avg = getAverageRating(charter.id);
  const reviews = getCharterReviews(charter.id);

  // Prefer backendId for linking when available
  const idForLink = (c as any).backendId ?? String(c.id);
  const href = `/charters/view/${idForLink}?${params.toString()}`;

  // Image height classes based on aspect ratio
  const imageHeightClasses = {
    square: {
      full: "h-84 md:h-72",
      compact: "h-44",
      nearby: "h-64",
      favorite: "h-48",
    },
    landscape: {
      full: "h-56 md:h-64",
      compact: "h-32",
      nearby: "h-48",
      favorite: "h-40",
    },
  };

  const imageHeight = imageHeightClasses[imageAspect][variant];

  // Image object-fit: contain for square (prevents cropping), cover for landscape
  const imageObjectFit =
    imageAspect === "square" ? "object-cover" : "object-cover";

  // Layout variants
  if (variant === "compact") {
    return (
      <article
        className={`flex gap-3 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow ${className}`}
      >
        {/* Square Image */}
        <Link href={href} className="relative flex-none bg-gray-100 w-44 h-44">
          <SafeImage
            src={img}
            alt={formatCharterName(c.name)}
            fill
            className={imageObjectFit}
          />
        </Link>

        {/* Content */}
        <div className="flex flex-col flex-1 min-w-0 py-3 pr-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                {formatCharterName(c.name)}
              </h3>
            </Link>
            {showFavoriteButton && (
              <FavoriteButton
                captainCharterId={idForLink}
                charterName={c.name}
                location={c.location}
                initialIsFavorited={initialIsFavorited}
                charterData={c as any}
              />
            )}
          </div>

          <p className="mt-1 text-xs text-gray-600 line-clamp-1">
            {formatLocation(c.location)}
          </p>

          <div className="mt-2">
            <StarRating
              value={avg ?? 0}
              size={14}
              reviewCount={reviews.length}
            />
          </div>

          {/* Price pinned to bottom */}
          <div className="pt-2 mt-auto">
            {typeof minPrice === "number" && (
              <PriceTag price={minPrice} variant="from" size="sm" />
            )}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "nearby") {
    return (
      <article
        className={`overflow-hidden bg-white shadow-sm rounded-xl ${className}`}
      >
        <Link href={href}>
          <div className={`relative w-full ${imageHeight} bg-gray-100`}>
            <SafeImage
              src={img}
              alt={formatCharterName(c.name)}
              fill
              className={imageObjectFit}
            />
            {showFavoriteButton && (
              <div className="absolute z-10 top-3 right-3">
                <FavoriteButton
                  captainCharterId={idForLink}
                  charterName={c.name}
                  location={c.location}
                  initialIsFavorited={initialIsFavorited}
                  charterData={c as any}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 p-3">
            <div className="flex gap-1">
              <StarRating
                value={avg ?? 0}
                size={16}
                reviewCount={reviews.length}
              />
            </div>

            <h3 className="text-base font-semibold line-clamp-1">
              {formatCharterName(c.name)}
            </h3>

            <p className="text-xs text-gray-600 line-clamp-1">
              {formatLocation(c.location)}
            </p>

            <div className="flex items-center justify-between mt-1 text-xs text-gray-700">
              {distance !== undefined && (
                <span className="font-medium">{distance.toFixed(1)} km</span>
              )}
              {typeof minPrice === "number" && (
                <PriceTag price={minPrice} variant="from" size="sm" />
              )}
            </div>

            {Array.isArray(c.trip) && c.trip.length > 0 && (
              <div className="mt-1 text-xs text-gray-700 line-clamp-1">
                {c.trip.map((t) => t.name).join(" • ")}
              </div>
            )}
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "favorite") {
    return (
      <article
        className={`overflow-hidden transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md ${className}`}
      >
        {/* Charter Image */}
        <Link href={href}>
          <div className={`relative w-full ${imageHeight} bg-gray-100`}>
            <SafeImage
              src={img}
              alt={formatCharterName(c.name)}
              fill
              className={imageObjectFit}
            />
          </div>
        </Link>

        {/* Content */}
        <div className="p-4">
          {/* Header with Favorite Button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link href={href} className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-[#ec2227] truncate">
                {formatCharterName(c.name)}
              </h3>
            </Link>
            {showFavoriteButton && (
              <FavoriteButton
                captainCharterId={idForLink}
                charterName={c.name}
                location={c.location}
                initialIsFavorited={true}
                charterData={c as any}
                className="flex-shrink-0"
              />
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mb-3 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{formatLocation(c.location)}</span>
          </div>

          {/* Notes (if any) */}
          {notes && (
            <p className="mb-3 text-sm text-gray-600 line-clamp-2">{notes}</p>
          )}

          {/* Saved Date */}
          {savedAt && (
            <div className="flex items-center gap-1 mb-4 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Saved on {new Date(savedAt).toLocaleDateString()}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Link href={`/book/${idForLink}`} className="flex-1">
              <button className="w-full px-4 py-2 bg-[#ec2227] hover:bg-[#d11f24] text-white rounded-lg font-medium transition-colors">
                Book Now
              </button>
            </Link>
            <Link href={href}>
              <button className="px-4 py-2 font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:border-gray-400">
                Details
              </button>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Default: "full" variant
  return (
    <article
      className={`flex flex-col h-full transition-all duration-300 ease-in-out group hover:bg-gray-50 hover:scale-101 rounded-2xl ${className}`}
    >
      {/* Cover image(s) - Use mosaic for multiple images, single for one */}
      <div className="relative">
        <div
          className={`relative w-full ${imageHeight} overflow-hidden rounded-t-2xl`}
        >
          {allImages.length >= 2 ? (
            <ImageMosaic
              images={allImages}
              alt={formatCharterName(c.name)}
              className="rounded-t-2xl"
            />
          ) : (
            <Link href={href}>
              <div className="relative w-full h-full bg-gray-100">
                <SafeImage
                  src={img}
                  alt={formatCharterName(c.name)}
                  fill
                  className={`${imageObjectFit} transition-all duration-300 ease-in-out group-hover:scale-105`}
                />
              </div>
            </Link>
          )}

          {/* Favorite button overlay */}
          {showFavoriteButton && (
            <div className="absolute z-10 top-3 right-3">
              <FavoriteButton
                captainCharterId={idForLink}
                charterName={c.name}
                location={c.location}
                initialIsFavorited={initialIsFavorited}
                charterData={c as any}
              />
            </div>
          )}
        </div>
      </div>

      <Link href={href}>
        {/* Body */}
        <div className="flex flex-col flex-1 gap-3 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold leading-tight truncate lg:text-lg">
                <span className="text-lg">{formatCharterName(c.name)}</span>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <StarRating
                  value={avg ?? 0}
                  size={14}
                  reviewCount={reviews.length}
                  textSize="text-[11px]"
                />
              </div>
            </div>

            {fishingType && (
              <div className="shrink-0">
                <span className="inline-flex items-center rounded-full bg-[#ec2227]/10 text-[#ec2227] px-2.5 py-1 text-[11px] font-medium">
                  {capitalize(fishingType)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {/* Location */}
            <div className="text-xs text-gray-600">
              <MapPin className="inline w-3 h-3 mr-1" />
              {formatLocation(c.location)}
            </div>

            {/* Captain row */}
            <div className="flex items-center gap-2 text-xs text-gray-700">
              {captainAvatar ? (
                <span className="relative w-6 h-6 overflow-hidden border rounded-full border-black/10">
                  <SafeImage
                    src={captainAvatar}
                    alt={`${captainName} avatar`}
                    fill
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-600">
                  {captainName
                    .split(" ")
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              )}
              <span className="truncate">
                <strong>Captain:</strong> {captainName}
                {captainYears !== undefined && (
                  <span className="text-gray-500"> • {captainYears} yrs</span>
                )}
                {crewCount !== undefined && (
                  <span className="text-gray-500"> • {crewCount} crew</span>
                )}
              </span>
            </div>

            {/* Compact meta */}
            <div className="text-xs text-gray-600">
              <strong>Boat:</strong> {c.boat.type}
              <span className="text-gray-400"> • </span>
              {c.boat.capacity} pax
            </div>

            {/* Badges: species / techniques (first few) */}
            <div className="mt-2 flex flex-col gap-2 text-[11px]">
              <div className="flex flex-wrap gap-2">
                {Array.isArray(c.species) &&
                  c.species.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 border rounded-full border-black/10 bg-gray-50"
                    >
                      {s}
                    </span>
                  ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(c.techniques) &&
                  c.techniques.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 border rounded-full border-black/10 bg-gray-50"
                    >
                      {t}
                    </span>
                  ))}
              </div>
            </div>

            {/* Trip list */}
            {Array.isArray(c.trip) && c.trip.length > 0 && (
              <div className="mt-2.5 text-xs text-gray-700">
                <strong>Trips:</strong>{" "}
                {c.trip
                  .map((t) => t.name)
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto">
            {typeof minPrice === "number" && (
              <PriceTag price={minPrice} variant="from" size="md" />
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
