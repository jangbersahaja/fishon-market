"use client";

import { AMENITIES_OPTIONS } from "@/data/amenities";
import {
  Apple,
  Coffee,
  CupSoda,
  Fish,
  Package,
  ShieldCheck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

export interface AmenitiesCardProps {
  /**
   * List of included amenities (case-insensitive match to AMENITIES_OPTIONS).
   */
  includes: string[];
  /**
   * Optional: custom className for the card container.
   */
  className?: string;
  /**
   * Optional: locale for label display ("en" or "my").
   */
  locale?: string;
}

function getAmenityIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("live bait")) return <Fish className="w-5 h-5 text-primary" />;
  if (l.includes("lures")) return <Package className="w-5 h-5 text-primary" />;
  if (l.includes("rod") || l.includes("reel"))
    return <Wrench className="w-5 h-5 text-primary" />;
  if (l.includes("terminal tackle"))
    return <Wrench className="w-5 h-5 text-primary" />;
  if (l.includes("snack")) return <Apple className="w-5 h-5 text-primary" />;
  if (l.includes("drinks")) return <CupSoda className="w-5 h-5 text-primary" />;
  if (l.includes("meals"))
    return <UtensilsCrossed className="w-5 h-5 text-primary" />;
  if (l.includes("life jacket"))
    return <ShieldCheck className="w-5 h-5 text-primary" />;
  return <Coffee className="w-5 h-5 text-primary" />;
}

/**
 * AmenitiesCard
 * Displays a list of included amenities as icons and labels.
 */
export const AmenitiesCard = React.memo(function AmenitiesCard({
  includes,
  className,
  locale = "en",
}: AmenitiesCardProps) {
  const t = useTranslations("charter.amenities");

  const charterIncludes = Array.isArray(includes)
    ? includes.map((a: string) => a.toLowerCase())
    : [];

  // Match amenities by label (case-insensitive)
  const included = AMENITIES_OPTIONS.filter((amenity) =>
    charterIncludes.some(
      (inc) =>
        amenity.label.toLowerCase().includes(inc) ||
        inc.includes(amenity.label.toLowerCase())
    )
  );

  if (included.length === 0) return null;

  return (
    <section
      className={
        "mt-6 rounded-2xl border border-black/10 bg-white p-5 sm:p-6 " +
        (className || "")
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold sm:text-lg">{t("title")}</h3>
        <p className="text-xs text-gray-500 sm:text-sm">
          {t("included", { count: included.length })}
        </p>
      </div>
      <div className="mt-3">
        <h4 className="text-sm font-semibold text-gray-700">
          {t("includedLabel")}
        </h4>
        <ul className="grid grid-cols-2 mt-2 text-sm text-gray-800 gap-x-4 gap-y-4 sm:grid-cols-2">
          {included.map((amenity) => {
            const displayLabel =
              locale === "my" ? amenity.labelMy : amenity.label;
            return (
              <li
                key={`inc-${amenity.key}`}
                className="flex items-center gap-3"
              >
                {getAmenityIcon(amenity.label)}
                <span>{displayLabel}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
});

// For backward compatibility with default import
export default AmenitiesCard;
