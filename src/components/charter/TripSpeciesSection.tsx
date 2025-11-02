import Image from "next/image";
import React from "react";
import { SPECIES_BY_ID, SpeciesItem } from "../../data/species";

interface TripSpeciesSectionProps {
  species: string[];
}

export const TripSpeciesSection: React.FC<TripSpeciesSectionProps> = ({
  species,
}) => {
  if (!species.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
        Target Species
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {species.map((id) => {
          const s: SpeciesItem | undefined = SPECIES_BY_ID[id];
          if (!s) return null;
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-2 p-2 transition-transform bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:scale-105 hover:shadow-md"
            >
              <Image
                src={s.image}
                alt={s.english_name}
                width={72}
                height={72}
                className="object-contain w-16 h-16 rounded"
                loading="lazy"
              />
              <div className="flex flex-col px-2 py-1 leading-tight">
                <span className="text-xs font-semibold text-center text-gray-800">
                  {s.local_name}
                </span>
                <span className="text-xs italic text-center text-gray-500">
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
