"use client";

import type { CharterFormValues } from "@fishon/schemas";
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

export default function PoliciesCard({ policies, pickup }: PoliciesCardProps) {
  const t = useTranslations("charter.policies");

  if (!policies && !pickup) return null;

  return (
    <section className="p-5 bg-white shadow-lg rounded-2xl">
      <h3 className="pb-2 text-base font-semibold border-b border-gray-200 sm:text-lg">
        {t("title")}
      </h3>
      <div className="grid grid-cols-1 gap-4 mt-2 text-sm text-gray-700 sm:grid-cols-2">
        {policies && (
          <ul className="space-y-1">
            <li>
              <strong>{t("catchKeep")}:</strong>{" "}
              {policies.catchAndKeep ? t("allowed") : t("no")}
            </li>
            <li>
              <strong>{t("catchRelease")}:</strong>{" "}
              {policies.catchAndRelease ? t("yes") : t("no")}
            </li>
            <li>
              <strong>{t("childFriendly")}:</strong>{" "}
              {policies.childFriendly ? t("yes") : t("no")}
            </li>
            {"wheelchairAccessible" in policies && (
              <li>
                <strong>{t("wheelchairAccessible")}:</strong>{" "}
                {policies.wheelchairAccessible ? t("yes") : t("no")}
              </li>
            )}
            {"alcoholAllowed" in policies && (
              <li>
                <strong>{t("alcohol")}:</strong>{" "}
                {policies.alcoholAllowed ? t("allowed") : t("notAllowed")}
              </li>
            )}
            {"smokingAllowed" in policies && (
              <li>
                <strong>{t("smoking")}:</strong>{" "}
                {policies.smokingAllowed ? t("allowed") : t("notAllowed")}
              </li>
            )}
          </ul>
        )}
        {pickup && (
          <ul className="space-y-1">
            <li>
              <strong>{t("pickup")}:</strong>{" "}
              {pickup.available ? t("available") : t("notAvailable")}
            </li>
            {"fee" in pickup && pickup.fee !== undefined && (
              <li>
                <strong>{t("pickupFee")}:</strong> RM{pickup.fee}
              </li>
            )}
            {Array.isArray(pickup.areas) && pickup.areas.length > 0 && (
              <li>
                <strong>{t("areas")}:</strong> {pickup.areas.join(", ")}
              </li>
            )}
            {pickup.notes && (
              <li>
                <strong>{t("notes")}:</strong> {pickup.notes}
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
