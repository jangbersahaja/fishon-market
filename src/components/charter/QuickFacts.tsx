"use client";

import type { Charter } from "@fishon/ui";
import { Anchor, Car, Check, Clock, Fish, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface QuickFactsProps {
  charter: Charter;
  maxCapacity?: number;
}

interface FactItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function FactItem({ icon, label, value }: FactItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs tracking-wide text-gray-500 uppercase">
          {label}
        </span>
        <span className="font-semibold text-gray-900 truncate">{value}</span>
      </div>
    </div>
  );
}

export function QuickFacts({ charter, maxCapacity }: QuickFactsProps) {
  const t = useTranslations("charter.quickFacts");

  // Calculate values
  const capacity = maxCapacity || charter.boat?.capacity || "-";
  const fishingType = charter.fishingType || "-";
  const amenitiesCount = charter.includes?.length || 0;
  const hasPickup = charter.pickup?.available;
  const pickupFee = charter.pickup?.fee;
  const tripsCount = charter.trip?.length || 0;
  const speciesCount = charter.species?.length || 0;

  // Format fishing type for display
  const formattedFishingType =
    fishingType === "offshore"
      ? t("offshore")
      : fishingType === "inshore"
        ? t("inshore")
        : fishingType === "lake"
          ? t("lake")
          : fishingType === "stream"
            ? t("stream")
            : fishingType === "jungle"
              ? t("jungle")
              : fishingType;

  // Format pickup display
  const pickupDisplay = hasPickup
    ? pickupFee && pickupFee > 0
      ? t("pickupWithFee", { fee: pickupFee })
      : t("pickupFree")
    : t("pickupNotAvailable");

  return (
    <div className="p-5 bg-white shadow-lg rounded-2xl">
      <h2 className="mb-4 text-xl font-bold text-gray-900">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        <FactItem
          icon={<Users className="w-5 h-5" />}
          label={t("maxCapacity")}
          value={
            typeof capacity === "number"
              ? t("anglers", { count: capacity })
              : capacity
          }
        />
        <FactItem
          icon={<Anchor className="w-5 h-5" />}
          label={t("fishingType")}
          value={formattedFishingType}
        />
        <FactItem
          icon={<Clock className="w-5 h-5" />}
          label={t("tripsAvailable")}
          value={t("trips", { count: tripsCount })}
        />
        <FactItem
          icon={<Fish className="w-5 h-5" />}
          label={t("targetSpecies")}
          value={t("species", { count: speciesCount })}
        />
        <FactItem
          icon={<Check className="w-5 h-5" />}
          label={t("amenities")}
          value={t("included", { count: amenitiesCount })}
        />
        <FactItem
          icon={<Car className="w-5 h-5" />}
          label={t("pickup")}
          value={pickupDisplay}
        />
      </div>
    </div>
  );
}
