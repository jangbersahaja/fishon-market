"use client";

import { BOAT_FEATURE_OPTIONS } from "@/data/boatFeatures";
import type { CharterFormValues } from "@fishon/schemas";
import {
  Anchor,
  Bed,
  Box,
  GripVertical,
  Home,
  Music,
  Navigation,
  Radio,
  Ruler,
  Snowflake,
  Users,
  UtensilsCrossed,
  Wind,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

// Extended boat type to include image fields from the view
type ExtendedBoat = CharterFormValues["boat"] & {
  imageUrl?: string;
  images?: Array<{ id: string; url: string; sortOrder: number }>;
};

export type BoatCardProps = {
  boat: ExtendedBoat;
  locale?: string;
};

function getFeatureIcon(key: string) {
  const iconClass = "w-4 h-4";
  switch (key) {
    case "gps":
      return <Navigation className={iconClass} />;
    case "fishfinder":
      return <Radio className={iconClass} />;
    case "toilet":
      return <Home className={iconClass} />;
    case "ice_box":
      return <Box className={iconClass} />;
    case "trolling_motor":
      return <Zap className={iconClass} />;
    case "sound_system":
      return <Music className={iconClass} />;
    case "thruster":
      return <Wind className={iconClass} />;
    case "kitchen":
      return <UtensilsCrossed className={iconClass} />;
    case "dorm":
      return <Bed className={iconClass} />;
    case "rod_holders":
      return <GripVertical className={iconClass} />;
    case "air_conditioning":
      return <Snowflake className={iconClass} />;
    default:
      return <Box className={iconClass} />;
  }
}

export function BoatCard({ boat, locale = "en" }: BoatCardProps) {
  const t = useTranslations("charter.boat");

  if (!boat) return null;

  // Ensure boat.features is an array
  const featuresArray = Array.isArray(boat.features) ? boat.features : [];

  // Map boat.features array to feature objects with labels
  const featureObjects = featuresArray
    .map((featureKey) => {
      const normalizedKey =
        typeof featureKey === "string" ? featureKey.toLowerCase().trim() : "";
      return BOAT_FEATURE_OPTIONS.find(
        (option) => option.key === normalizedKey
      );
    })
    .filter((feature): feature is NonNullable<typeof feature> =>
      Boolean(feature)
    );

  // Get boat image - prefer main imageUrl, then first from images array
  const boatImageUrl =
    boat.imageUrl ||
    (boat.images && boat.images.length > 0 ? boat.images[0].url : null);

  return (
    <section className="overflow-hidden bg-white shadow-lg rounded-2xl">
      {/* Boat Image */}
      {boatImageUrl && (
        <div className="relative w-full h-48 md:h-56 bg-gray-100">
          <Image
            src={boatImageUrl}
            alt={boat.name || t("title")}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}

      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900">{t("title")}</h3>

        {/* Boat Name & Type */}
        {boat.name && (
          <div className="mt-3">
            <p className="text-xl font-bold text-gray-900">{boat.name}</p>
            {boat.type && <p className="text-sm text-gray-500">{boat.type}</p>}
          </div>
        )}

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          {typeof boat.lengthFeet === "number" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-[#ec2227]">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {boat.lengthFeet} {t("ft")}
                </p>
                <p className="text-xs text-gray-500">{t("length")}</p>
              </div>
            </div>
          )}

          {typeof boat.capacity === "number" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-[#ec2227]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {boat.capacity} {t("pax")}
                </p>
                <p className="text-xs text-gray-500">{t("capacity")}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-[#ec2227]">
              <Anchor className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {boat.type || "Boat"}
              </p>
              <p className="text-xs text-gray-500">{t("type")}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        {featureObjects.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">
              {t("features")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {featureObjects.map((feature) => {
                const displayLabel =
                  locale === "ms" ? feature.labelMy : feature.label;
                return (
                  <div
                    key={feature.key}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
                  >
                    {getFeatureIcon(feature.key)}
                    <span>{displayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default BoatCard;
