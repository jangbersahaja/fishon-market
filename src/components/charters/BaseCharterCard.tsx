// components/charters/BaseCharterCard.tsx
"use client";

import { FavoriteButton } from "@/components/account";
import ImageMosaic from "@/components/charters/ImageMosaic";
import StarRating from "@/components/ratings/StarRating";
import PriceTag from "@/components/shared/PriceTag";
import SafeImage from "@/components/shared/SafeImage";
import { calculateDisplayPrice } from "@/lib/helpers/pricing-helpers";
import {
  capitalize,
  formatCharterName,
  formatLocation,
} from "@/lib/helpers/text-formatters";
import type { Charter } from "@fishon/ui";
import { ALL_SPECIES } from "@fishon/ui";
import { Calendar, Clock, MapPin, ShipIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  // Ratings (passed from server-side fetch)
  averageRating?: number | null;
  reviewCount?: number;
  // Availability (when date is selected)
  isUnavailable?: boolean;
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
  averageRating,
  reviewCount = 0,
  isUnavailable = false,
}: CharterCardProps) {
  const locale = useLocale();
  const t = useTranslations("charter");
  const c = charter;

  // Image URLs - get all available images
  const allImages =
    c.images && c.images.length > 0
      ? c.images
      : [(c as any).imageUrl || "/placeholder-1.jpg"];
  const img = allImages[0];

  // Min price calculation - use priceOverride if available, then add commission
  const minBasePrice =
    c.trip && c.trip.length
      ? Math.min(...c.trip.map((t) => t.priceOverride ?? t.price))
      : undefined;
  const minPrice = minBasePrice
    ? calculateDisplayPrice(minBasePrice)
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
  const captainAvatar = captain?.avatarUrl as string | undefined;

  // Fishing type badge
  const fishingType = (c as any).fishingType as string | undefined;

  // Ratings - use props passed from server-side fetch
  const avg = averageRating ?? null;
  const reviewCountValue = reviewCount ?? 0;

  // Prefer backendId for linking when available
  const idForLink = (c as any).backendId ?? String(c.id);
  const href = `/${locale}/charters/${idForLink}?${params.toString()}`;

  // Image height classes based on aspect ratio
  const imageHeightClasses = {
    square: {
      full: "h-100 md:h-72",
      compact: "h-44",
      nearby: "h-84",
      favorite: "h-48",
    },
    landscape: {
      full: "h-52 md:h-64",
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
              <h3 className="font-semibold text-gray-900 text-md line-clamp-2 font-oswald">
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
              reviewCount={reviewCountValue}
            />
          </div>

          {/* Price pinned to bottom */}
          <div className="pt-2 mt-auto font-oswald">
            {typeof minPrice === "number" && (
              <PriceTag price={minPrice} variant="from" size="md" />
            )}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "nearby") {
    return (
      <article
        className={`overflow-hidden shadow-sm rounded-xl transition-all duration-300 ease-in-out group hover:shadow-2xl hover:-translate-y-1 ${className}`}
      >
        <div className={`relative w-full ${imageHeight} bg-gray-100`}>
          <SafeImage
            src={img}
            alt={formatCharterName(c.name)}
            fill
            className={imageObjectFit}
          />
          {showFavoriteButton && (
            <div className="absolute top-3 right-3">
              <FavoriteButton
                captainCharterId={idForLink}
                charterName={c.name}
                location={c.location}
                initialIsFavorited={initialIsFavorited}
                charterData={c as any}
              />
            </div>
          )}
          {distance !== undefined && (
            <span className="absolute px-3 py-1 text-xs font-medium bg-white rounded-full top-3 left-3">
              {t("distanceFromYou", { distance: distance.toFixed(1) })}
            </span>
          )}
          <div className="absolute bottom-0 w-full ">
            <div className="bg-gradient-to-t from-[#ec2227] to-[#ec2227]/0 w-full flex flex-col items-center">
              <h3 className="pt-10 text-2xl font-semibold text-center text-white uppercase line-clamp-1 font-oswald">
                {formatCharterName(c.name)}
              </h3>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center px-3 pb-3 bg-gradient-to-b from-[#ec2227] via-[#d11f24] to-[#d11f24] gap-2">
          <p className="text-sm text-gray-200 line-clamp-1">
            {formatLocation(c.location)}
          </p>
          <div className="flex items-center gap-1 text-gray-200">
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {t("experienceYears", { years: c.captain.yearsExperience })}
            </span>
            {" · "}
            <StarRating
              value={avg ?? 0}
              size={14}
              textSize="text-xs"
              variant="chrome"
              reviewCount={reviewCountValue}
            />
            {" · "}
            <span className="text-xs">{c.boat.type}</span>
          </div>

          <div className="flex flex-col items-center w-full gap-2 p-3 text-xs border border-white/20 rounded-2xl font-oswald">
            {typeof minPrice === "number" && (
              <PriceTag
                price={minPrice}
                variant="from"
                size="lg"
                color="chrome"
              />
            )}
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full shadow-md transition-colors hover:from-gray-50 hover:to-gray-100 flex justify-center hover:scale-101"
            >
              <span className="text-xl font-medium text-[#ec2227] uppercase font-oswald">
                {t("bookTrip")}
              </span>
            </Link>
          </div>
        </div>
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
              <h3 className="text-xl font-semibold text-gray-900 hover:text-[#ec2227] truncate font-oswald uppercase">
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
              <span>
                {t("savedOn", { date: new Date(savedAt).toLocaleDateString() })}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Link href={`/${locale}/book/${idForLink}`} className="flex-1">
              <button className="w-full px-4 py-2 bg-[#ec2227] hover:bg-[#d11f24] text-white rounded-lg font-medium transition-colors font-oswald uppercase">
                {t("bookNow")}
              </button>
            </Link>
            <Link href={href}>
              <button className="px-4 py-2 font-medium text-gray-700 uppercase transition-colors border border-gray-300 rounded-lg hover:border-gray-400 font-oswald">
                {t("details")}
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
      className={`flex flex-col h-full transition-all duration-300 ease-in-out group hover:shadow-2xl hover:-translate-y-1 rounded-2xl bg-white border border-slate-200/60 overflow-hidden ${isUnavailable ? "opacity-75" : ""} ${className}`}
    >
      {/* Cover image(s) - Use mosaic for multiple images, single for one */}
      <div className="relative overflow-hidden">
        <div
          className={`relative w-full ${imageHeight} overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200`}
        >
          {allImages.length >= 2 ? (
            <ImageMosaic
              images={allImages}
              alt={formatCharterName(c.name)}
              className="rounded-t-2xl"
            />
          ) : (
            <Link href={href}>
              <div className="relative w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
                <SafeImage
                  src={img}
                  alt={formatCharterName(c.name)}
                  fill
                  className={`${imageObjectFit} transition-all duration-500 ease-in-out group-hover:scale-110 group-hover:rotate-1 ${isUnavailable ? "grayscale-[30%]" : ""}`}
                />
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 transition-opacity duration-300 opacity-0 bg-gradient-to-t from-black/20 via-transparent to-transparent group-hover:opacity-100"></div>
              </div>
            </Link>
          )}

          {/* Unavailable overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 z-5 bg-slate-900/20 pointer-events-none" />
          )}

          {/* Favorite button overlay */}
          {showFavoriteButton && (
            <div className="absolute z-10 transition-transform duration-200 transform top-3 right-3 group-hover:scale-110">
              <FavoriteButton
                captainCharterId={idForLink}
                charterName={c.name}
                location={c.location}
                initialIsFavorited={initialIsFavorited}
                charterData={c as any}
              />
            </div>
          )}

          {/* Top left badge */}
          {fishingType && !isUnavailable && (
            <div className="absolute z-10 top-3 left-3">
              <span className="inline-flex items-center rounded-full bg-[#ec2227] text-white px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm">
                {capitalize(fishingType)}
              </span>
            </div>
          )}

          {/* Unavailable badge */}
          {isUnavailable && (
            <div className="absolute z-10 top-3 left-3">
              <span className="inline-flex items-center rounded-full bg-slate-700 text-white px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm">
                {t("unavailableOnDate")}
              </span>
            </div>
          )}
        </div>
      </div>

      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col"
      >
        {/* Body */}
        <div className="px-3 my-3">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin className="w-4 h-4 text-[#ec2227] flex-shrink-0" />
            <span className="text-xs font-medium truncate">
              {formatLocation(c.location)}
            </span>
          </div>
          <h3 className="mt-1 text-2xl uppercase font-semibold leading-tight truncate lg:text-3xl text-slate-900 group-hover:text-[#ec2227] transition-colors duration-200 font-oswald">
            {formatCharterName(c.name)}
          </h3>
          {/* Trip list - Show first 4 trips with count */}
          {Array.isArray(c.trip) && c.trip.length > 0 && (
            <div className="text-[10px] mt-1">
              <span className="font-semibold text-slate-900"></span>{" "}
              <span className="text-slate-700">
                {(() => {
                  const tripNames = c.trip.map((t) => t.name).filter(Boolean);
                  const shown = tripNames.slice(0, 2);
                  const more = tripNames.length - shown.length;
                  return (
                    <>
                      {shown.join(" • ")}
                      {more > 0 && (
                        <span className="ml-1 font-semibold text-[#ec2227]">
                          {t("moreTrips", { count: more })}
                        </span>
                      )}
                    </>
                  );
                })()}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 px-5 mb-5 bg-gradient-to-br from-white via-slate-50/30 to-white">
          <div className="flex flex-col col-span-2 gap-3 pr-5 border-r-2 border-slate-200/60">
            {/* Captain row */}
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              {captainAvatar ? (
                <span className="relative w-8 h-8 overflow-hidden rounded-full ring-2 ring-[#ec2227]/20">
                  <SafeImage
                    src={captainAvatar}
                    alt={`${captainName} avatar`}
                    fill
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ec2227]/10 text-xs font-bold text-[#ec2227] ring-2 ring-[#ec2227]/20">
                  {captainName
                    .split(" ")
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-semibold capitalize truncate text-slate-900">
                  {captainName.toLowerCase()}
                </span>
                <span className="text-[11px] text-slate-600">
                  {captainYears !== undefined && (
                    <>{t("yearsExp", { years: captainYears })}</>
                  )}
                </span>
              </div>
            </div>

            {/* Compact meta */}
            <div className="flex items-center gap-2 text-xs">
              <ShipIcon className="h-4 w-4 text-[#ec2227]" />
              <span className="font-medium text-slate-700">{c.boat.type}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-slate-900">
                {t("capacity", { count: c.boat.capacity })}
              </span>
            </div>

            {/* Badges: species / techniques (first few) */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {/* Species badges - Blue theme with local names */}
              {Array.isArray(c.species) &&
                c.species.slice(0, 3).map((s) => {
                  const speciesData = ALL_SPECIES.find(
                    (species) => species.id === s
                  );
                  const displayName = speciesData?.local_name || s;
                  return (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200/60 text-blue-700 font-medium hover:border-blue-400 hover:bg-blue-100 transition-all duration-200"
                    >
                      {displayName}
                    </span>
                  );
                })}
              {/* Techniques badges - Green theme */}
              {Array.isArray(c.techniques) &&
                c.techniques.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200/60 text-emerald-700 font-medium hover:border-emerald-400 hover:bg-emerald-100 transition-all duration-200"
                  >
                    {t}
                  </span>
                ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between h-30">
            <StarRating value={avg ?? 0} size={14} textSize="text-[10px]" />
            <div className="flex flex-col items-center w-full gap-1 pl-3">
              {typeof minPrice === "number" && (
                <div className="flex flex-col transition-all duration-200 font-oswald group-hover:scale-105">
                  <PriceTag price={minPrice} variant="per-day" size="md" />
                </div>
              )}
              <button className="px-3 py-1.5 bg-[#ec2227] hover:bg-[#d11f24] text-white font-medium text-sm lg:text-lg uppercase rounded-lg transition-all duration-200 shadow-md hover:shadow-lg group-hover:scale-105 font-oswald">
                {t("bookNow")}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
