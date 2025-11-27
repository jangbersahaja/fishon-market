import CategoryCard from "@/components/marketing/CategoryCard";
import { getFishingTechniqueImage } from "@/lib/helpers/image-helpers";
import { useLocale, useTranslations } from "next-intl";

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
  gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
}: FishingTechniqueGridProps) {
  const locale = useLocale();
  const t = useTranslations("home.topTechniques");

  return (
    <div className={gridClassName}>
      {techniques.map((tech) => {
        const name = tech.name || tech.label || "";
        const key = tech.key || name.toLowerCase();
        const image = tech.image || getFishingTechniqueImage(name);

        return (
          <CategoryCard
            key={key}
            href={`/${locale}/search/category/technique/${encodeURIComponent(
              name.toLowerCase()
            )}`}
            label={name}
            count={tech.count}
            subtitle={t("chartersUsing", { technique: name.toLowerCase() })}
            image={image}
            alt={t("altText", { technique: name })}
          />
        );
      })}
    </div>
  );
}
