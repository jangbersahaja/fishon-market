import { getFishingTypeImage } from "@/lib/helpers/image-helpers";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface FishingType {
  key: string;
  label: string;
  labelMy: string;
  count: number;
}

interface FishingTypeGridProps {
  types: FishingType[];
}

export default function FishingTypeGrid({ types }: FishingTypeGridProps) {
  const locale = useLocale();
  const t = useTranslations("home.browseByType");

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {types.map((fishingType) => {
        if (fishingType.count === 0) {
          return null;
        }
        const image = getFishingTypeImage(fishingType.key);
        // Use localized label based on current locale
        const displayLabel =
          locale === "ms" ? fishingType.labelMy : fishingType.label;
        return (
          <Link
            key={fishingType.key}
            href={`/${locale}/search?fishing_type=${encodeURIComponent(
              fishingType.key
            )}`}
            className="relative flex flex-col overflow-hidden transition-all bg-white shadow-sm group rounded-2xl hover:-translate-y-1 hover:shadow-lg"
          >
            {/* Image Container */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              {image ? (
                <Image
                  src={image}
                  alt={t("altText", { type: displayLabel })}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-100" />
              )}
              {/* Badge */}
              <div className="absolute px-3 py-1 text-xs font-bold text-gray-900 rounded-full right-3 top-3 bg-white/90 backdrop-blur-sm">
                {fishingType.count}
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col justify-between flex-1 p-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#ec2227] transition-colors">
                  {displayLabel}
                </h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {t("exploreTrips", { type: displayLabel.toLowerCase() })}
                </p>
              </div>
              <div className="mt-4 flex items-center text-sm font-semibold text-[#ec2227]">
                {t("explore")}{" "}
                <span className="ml-1 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
