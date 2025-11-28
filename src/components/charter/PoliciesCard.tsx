"use client";

import type { CharterFormValues } from "@fishon/schemas";
import {
  Accessibility,
  Baby,
  Beer,
  Car,
  Check,
  Cigarette,
  Fish,
  MapPin,
  StickyNote,
  Waves,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

export interface PoliciesCardProps {
  policies: Policies;
  pickup: CharterFormValues["pickup"];
}

interface Policies {
  catchAndKeep: boolean;
  catchAndRelease: boolean;
  childFriendly: boolean;
  wheelchairAccessible?: boolean | undefined;
  alcoholAllowed?: boolean | undefined;
  smokingAllowed?: boolean | undefined;
}

interface PolicyItemProps {
  icon: React.ReactNode;
  label: string;
  value: boolean | undefined;
  allowedText: string;
  notAllowedText: string;
}

function PolicyItem({
  icon,
  label,
  value,
  allowedText,
  notAllowedText,
}: PolicyItemProps) {
  const isAllowed = value === true;

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-full ${
          isAllowed ? "bg-red-50 text-[#ec2227]" : "bg-gray-100 text-gray-400"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p
          className={`text-xs ${isAllowed ? "text-[#ec2227]" : "text-gray-500"}`}
        >
          {isAllowed ? allowedText : notAllowedText}
        </p>
      </div>
      <div
        className={`flex items-center justify-center w-5 h-5 rounded-full ${
          isAllowed ? "bg-red-100 text-[#ec2227]" : "bg-gray-100 text-gray-400"
        }`}
      >
        {isAllowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
    </div>
  );
}

interface PickupInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function PickupInfoItem({ icon, label, value }: PickupInfoItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-[#ec2227]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{value}</p>
      </div>
    </div>
  );
}

export default function PoliciesCard({ policies, pickup }: PoliciesCardProps) {
  const t = useTranslations("charter.policies");

  if (!policies && !pickup) return null;

  const policyItems = [
    {
      key: "catchAndKeep",
      icon: <Fish className="w-4 h-4" />,
      label: t("catchKeep"),
      value: policies?.catchAndKeep,
      allowedText: t("allowed"),
      notAllowedText: t("notAllowed"),
    },
    {
      key: "catchAndRelease",
      icon: <Waves className="w-4 h-4" />,
      label: t("catchRelease"),
      value: policies?.catchAndRelease,
      allowedText: t("yes"),
      notAllowedText: t("no"),
    },
    {
      key: "childFriendly",
      icon: <Baby className="w-4 h-4" />,
      label: t("childFriendly"),
      value: policies?.childFriendly,
      allowedText: t("yes"),
      notAllowedText: t("no"),
    },
  ];

  // Only add optional policies if they exist and have a boolean value
  if (
    policies &&
    "wheelchairAccessible" in policies &&
    typeof policies.wheelchairAccessible === "boolean"
  ) {
    policyItems.push({
      key: "wheelchairAccessible",
      icon: <Accessibility className="w-4 h-4" />,
      label: t("wheelchairAccessible"),
      value: policies.wheelchairAccessible,
      allowedText: t("yes"),
      notAllowedText: t("no"),
    });
  }

  if (
    policies &&
    "alcoholAllowed" in policies &&
    typeof policies.alcoholAllowed === "boolean"
  ) {
    policyItems.push({
      key: "alcoholAllowed",
      icon: <Beer className="w-4 h-4" />,
      label: t("alcohol"),
      value: policies.alcoholAllowed,
      allowedText: t("allowed"),
      notAllowedText: t("notAllowed"),
    });
  }

  if (
    policies &&
    "smokingAllowed" in policies &&
    typeof policies.smokingAllowed === "boolean"
  ) {
    policyItems.push({
      key: "smokingAllowed",
      icon: <Cigarette className="w-4 h-4" />,
      label: t("smoking"),
      value: policies.smokingAllowed,
      allowedText: t("allowed"),
      notAllowedText: t("notAllowed"),
    });
  }

  return (
    <section className="p-5 bg-white shadow-lg rounded-2xl">
      <h3 className="text-lg font-semibold text-gray-900">{t("title")}</h3>

      {/* Policies Grid */}
      {policies && (
        <div className="mt-4">
          <div className="divide-y divide-gray-100">
            {policyItems.map((item) => (
              <PolicyItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                value={item.value}
                allowedText={item.allowedText}
                notAllowedText={item.notAllowedText}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pickup Section */}
      {pickup && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <h4 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {t("pickup")}
          </h4>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              pickup.available
                ? "bg-red-50 text-[#ec2227]"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {pickup.available ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {pickup.available ? t("available") : t("notAvailable")}
          </div>

          {pickup.available && (
            <div className="mt-3 divide-y divide-gray-100">
              {"fee" in pickup &&
                pickup.fee !== undefined &&
                pickup.fee !== null &&
                pickup.fee > 0 && (
                  <PickupInfoItem
                    icon={<Car className="w-4 h-4" />}
                    label={t("pickupFee")}
                    value={`RM ${pickup.fee}`}
                  />
                )}

              {Array.isArray(pickup.areas) && pickup.areas.length > 0 && (
                <PickupInfoItem
                  icon={<MapPin className="w-4 h-4" />}
                  label={t("areas")}
                  value={pickup.areas.join(", ")}
                />
              )}

              {pickup.notes && (
                <PickupInfoItem
                  icon={<StickyNote className="w-4 h-4" />}
                  label={t("notes")}
                  value={pickup.notes}
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
