"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";
import { SPECIES_BY_ID, SpeciesItem } from "../../data/species";

interface TripSpeciesSectionProps {
  species: string[];
}

export const TripSpeciesSection: React.FC<TripSpeciesSectionProps> = ({
  species,
}) => {
  const t = useTranslations("charter.species");

  if (!species.length) return null;

  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
        {t("title")}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {species.map((id) => {
          const s: SpeciesItem | undefined = SPECIES_BY_ID[id];
          if (!s) return null;
          return (
            <div key={id} className="flex flex-col items-center gap-2 group">
              <div className="relative h-18 w-28">
                <Image
                  src={s.image}
                  alt={s.english_name}
                  fill
                  className="object-contain transition-transform ease-in-out group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col items-center px-2 py-1 -mt-20 leading-tight w-fit">
                <div className="w-16 h-16 bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f] rounded-full shadow-md" />
                <span className="mt-2 text-xs font-semibold text-center text-gray-800">
                  {s.local_name}
                </span>
                <span className="text-xs italic text-center text-gray-500 w-fit">
                  {s.english_name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
