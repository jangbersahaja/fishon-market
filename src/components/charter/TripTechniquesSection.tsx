"use client";

import { useTranslations } from "next-intl";
import React from "react";

const TECHNIQUE_LABELS: Record<string, string> = {
  casting: "Casting",
  trolling: "Trolling",
  jigging: "Jigging",
  popping: "Popping",
  bottom: "Bottom Fishing",
  fly: "Fly Fishing",
  handline: "Handline",
  net: "Netting",
  squid: "Squid Jigging",
  bait: "Live Bait",
  lure: "Lure",
  other: "Other",
};

interface TripTechniquesSectionProps {
  techniques: string[];
}

export const TripTechniquesSection: React.FC<TripTechniquesSectionProps> = ({
  techniques,
}) => {
  const t = useTranslations("charter.techniques");

  if (!techniques.length) return null;

  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
        {t("title")}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {techniques.map((tech) => (
          <span
            key={tech}
            title={TECHNIQUE_LABELS[tech] || tech}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#ec2227] transition border border-[#ec2227]/30 rounded-full shadow bg-gradient-to-r from-[#ec2227]/10 to-[#ec2227]/20 hover:shadow-md"
          >
            {TECHNIQUE_LABELS[tech] || tech}
          </span>
        ))}
      </div>
    </div>
  );
};
