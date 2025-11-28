"use client";

import { Anchor, Award, Clock, Users } from "lucide-react";
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
    <section className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
      {/* Header with gradient accent */}
      <div className="relative px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ec2227]/10">
            <Anchor className="w-4 h-4 text-[#ec2227]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
            {title || t("title")}
          </h3>
        </div>
      </div>

      {/* Captain Profile */}
      <div className="p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar with experience badge */}
          <div className="relative shrink-0">
            <div className="overflow-hidden shadow-md w-28 h-28 rounded-2xl ring-2 ring-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.avatarUrl || "/images/captain.svg"}
                alt={c.name}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Experience badge */}
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-[#ec2227] rounded-lg shadow-md">
              <Clock className="w-3 h-3" />
              <span>{c.yearsExperience}y</span>
            </div>
          </div>

          {/* Captain Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            {/* Name and verified badge */}
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <h4 className="text-xl font-bold text-gray-900">{c.name}</h4>
              <div className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#ec2227] bg-[#ec2227]/10 rounded-full">
                <Award className="w-3 h-3" />
                <span>Verified Captain</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 sm:justify-start">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <span>{t("experience", { years: c.yearsExperience })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <span>{t("crew", { count: c.crewCount })}</span>
              </div>
            </div>

            {/* Bio */}
            {c.intro && (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                {c.intro}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
