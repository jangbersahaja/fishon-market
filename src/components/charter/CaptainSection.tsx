"use client";

import { useTranslations } from "next-intl";

// Generic, UI-only charter type to avoid coupling to app-specific models
export type CharterLike = {
  location?: string;
  fishingType?: string;
  captain?: {
    name: string;
    avatarUrl?: string;
    yearsExperience: number;
    crewCount: number;
    intro?: string;
  } | null;
};

export interface CaptainSectionProps {
  charter: CharterLike;
  title?: string;
}

export default function CaptainSection({
  charter,
  title,
}: CaptainSectionProps) {
  const t = useTranslations("charter.captain");

  if (!charter?.captain) return null;
  const c = charter.captain;
  return (
    <section className="p-5 mt-6 bg-white border rounded-2xl border-black/10 sm:p-6">
      <h3 className="text-base font-semibold sm:text-lg">
        {title || t("title")}
      </h3>
      <div className="flex flex-col items-start gap-4 mt-3 lg:flex-row">
        <div className="relative w-24 h-24 overflow-hidden rounded-full shrink-0 ring-1 ring-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.avatarUrl || "/images/captain.svg"}
            alt={c.name}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h4 className="text-base font-semibold">{c.name}</h4>
            <span className="text-xs text-gray-500">
              {t("experience", { years: c.yearsExperience })} •{" "}
              {t("crew", { count: c.crewCount })}
            </span>
          </div>
          {c.intro && (
            <p className="mt-2 text-sm leading-6 text-gray-700">{c.intro}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-600">
            {charter.location && (
              <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2.5 py-1">
                {charter.location}
              </span>
            )}
            {charter.fishingType && (
              <span className="inline-flex items-center rounded-full border border-black/10 bg-gray-50 px-2.5 py-1 capitalize">
                {charter.fishingType} {t("fishing")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
