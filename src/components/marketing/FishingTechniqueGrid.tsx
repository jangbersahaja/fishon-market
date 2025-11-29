import { getFishingTechniqueImage } from "@/lib/helpers/image-helpers";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface FishingTechnique {
  key?: string;
  name?: string;
  label?: string;
  count: number;
  image?: string;
}

interface FishingTechniqueGridProps {
  techniques: FishingTechnique[];
  gridClassName?: string;
}

export default function FishingTechniqueGrid({
  techniques,
  gridClassName, // Ignored in favor of internal styling for the new design
}: FishingTechniqueGridProps) {
  const locale = useLocale();
  const t = useTranslations("home.topTechniques");

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {techniques.map((tech) => {
        const name = tech.name || tech.label || "";
        const key = tech.key || name.toLowerCase();
        const image = tech.image || getFishingTechniqueImage(name);

        return (
          <Link
            key={key}
            href={`/${locale}/search?techniques=${encodeURIComponent(name)}`}
            className="group flex flex-col items-center text-center"
          >
            <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-transparent shadow-md transition-all duration-300 group-hover:border-[#ec2227] group-hover:shadow-xl sm:h-32 sm:w-32">
              {image ? (
                <Image
                  src={image}
                  alt={t("altText", { technique: name })}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 96px, 128px"
                />
              ) : (
                <div className="h-full w-full bg-gray-100" />
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-[#ec2227]">
              {name}
            </h3>
            <span className="mt-1 text-xs font-medium text-gray-500">
              {tech.count} charters
            </span>
          </Link>
        );
      })}
    </div>
  );
}
