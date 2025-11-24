"use client";

import { BOAT_FEATURE_OPTIONS } from "@/data/boatFeatures";
import type { CharterFormValues } from "@fishon/schemas";
import {
  Bed,
  Box,
  GripVertical,
  Home,
  Music,
  Navigation,
  Radio,
  Snowflake,
  UtensilsCrossed,
  Wind,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

export type BoatCardProps = {
  boat: CharterFormValues["boat"];
  locale?: string;
};

function getFeatureIcon(key: string) {
  const iconClass = "w-4 h-4 text-primary";
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

  // Debug: log features to see what we're getting
  if (typeof window !== "undefined" && featuresArray.length > 0) {
    console.log("🚤 Boat features:", featuresArray);
    console.log(
      "🔍 Available options:",
      BOAT_FEATURE_OPTIONS.map((o) => o.key)
    );
  }

  // Map boat.features array to feature objects with labels
  const featureObjects = featuresArray
    .map((featureKey) => {
      // Handle both key strings and full feature key formats
      const normalizedKey =
        typeof featureKey === "string" ? featureKey.toLowerCase().trim() : "";
      return BOAT_FEATURE_OPTIONS.find(
        (option) => option.key === normalizedKey
      );
    })
    .filter((feature): feature is NonNullable<typeof feature> =>
      Boolean(feature)
    );

  // Debug: log matched features
  if (typeof window !== "undefined" && featuresArray.length > 0) {
    console.log(
      "✅ Matched features:",
      featureObjects.map((f) => f.key)
    );
  }
  return (
    <div className="p-5 mt-6 bg-white border rounded-2xl border-black/10 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">{t("title")}</h3>
      <ul className="grid grid-cols-1 gap-2 mt-2 text-sm text-gray-700 sm:grid-cols-2">
        {boat.name && (
          <li>
            <strong>{t("name")}:</strong> {boat.name}
          </li>
        )}
        {boat.type && (
          <li>
            <strong>{t("type")}:</strong> {boat.type}
          </li>
        )}
        {typeof boat.lengthFeet === "number" && (
          <li>
            <strong>{t("length")}:</strong> {boat.lengthFeet} {t("ft")}
          </li>
        )}
        {typeof boat.capacity === "number" && (
          <li>
            <strong>{t("capacity")}:</strong> {boat.capacity} {t("pax")}
          </li>
        )}
        {featureObjects.length > 0 && (
          <li className="sm:col-span-2">
            <strong className="block mb-2">{t("features")}:</strong>
            <ul className="grid grid-cols-2 gap-2 mt-1">
              {featureObjects.map((feature) => {
                const displayLabel =
                  locale === "my" ? feature!.labelMy : feature!.label;
                return (
                  <li
                    key={feature!.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    {getFeatureIcon(feature!.key)}
                    <span>{displayLabel}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}

export default BoatCard;
