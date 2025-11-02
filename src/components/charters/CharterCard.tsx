// src/components/charters/CharterCard.tsx
// Main CharterCard component - now uses BaseCharterCard under the hood
import BaseCharterCard, { type CharterCardProps } from "./BaseCharterCard";

/**
 * CharterCard - Main card component for search and listing pages
 * Uses BaseCharterCard with "full" variant and square aspect ratio (better for portrait images)
 */
export default function CharterCard({
  charter,
  context,
  showFavoriteButton = true,
  initialIsFavorited = false,
  className = "",
}: Omit<CharterCardProps, "variant" | "imageAspect">) {
  return (
    <BaseCharterCard
      charter={charter}
      variant="full"
      imageAspect="square"
      context={context}
      showFavoriteButton={showFavoriteButton}
      initialIsFavorited={initialIsFavorited}
      className={className}
    />
  );
}
