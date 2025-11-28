import CategoryCard from "@/components/marketing/CategoryCard";
import { getFishingTypeImage } from "@/lib/helpers/image-helpers";
import { useLocale, useTranslations } from "next-intl";

interface FishingType {
  key: string;
  label: string;
  count: number;
}

interface FishingTypeGridProps {
  types: FishingType[];
}

export default function FishingTypeGrid({ types }: FishingTypeGridProps) {
  const locale = useLocale();
  const t = useTranslations("home.browseByType");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      {types.map((fishingType) => {
        const image = getFishingTypeImage(fishingType.key);
        return (
          <CategoryCard
            key={fishingType.key}
            href={`/${locale}/search?fishing_type=${encodeURIComponent(
              fishingType.key
            )}`}
            label={fishingType.label}
            count={fishingType.count}
            subtitle={t("exploreTrips", {
              type: fishingType.label.toLowerCase(),
            })}
            image={image}
            alt={t("altText", { type: fishingType.label })}
          />
        );
      })}
    </div>
  );
}
