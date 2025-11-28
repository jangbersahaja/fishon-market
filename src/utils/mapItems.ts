//utils/mapItems.ts
// Convert charters to the lightweight data the map needs.
import type { Charter } from "@fishon/ui";

export type MapItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  href: string;
  image: string;
  // Note: ratings should be provided separately via ratingsMap
  // These are placeholders that will be overridden by InfoWindow rendering
  ratingAvg?: number;
  ratingCount?: number;
  // Availability for the selected date
  isUnavailable?: boolean;
};

export interface MapItemsOptions {
  locale?: string;
  ratingsMap?: Map<
    string,
    { averageRating: number | null; reviewCount: number }
  >;
  availabilityMap?: Record<string | number, boolean>;
}

export function buildMapItems(
  charters: Charter[],
  options: MapItemsOptions = {}
): MapItem[] {
  const { locale = "en", ratingsMap, availabilityMap } = options;

  return (charters as any[])
    .filter(
      (c: any) =>
        c?.coordinates &&
        typeof c.coordinates.lat === "number" &&
        typeof c.coordinates.lng === "number"
    )
    .map((c: any) => {
      const minPrice =
        Array.isArray(c.trip) && c.trip.length
          ? Math.min(...c.trip.map((t: any) => Number(t.price || 0)))
          : 0;

      // Use backendId if available (from fishon-captain), otherwise use id
      const charterId = c.backendId ?? String(c.id);

      // Get ratings from ratingsMap if provided
      const ratings = ratingsMap?.get(charterId);

      // Get availability status if availabilityMap is provided
      const isUnavailable = availabilityMap
        ? availabilityMap[charterId] === false
        : undefined;

      return {
        id: charterId,
        name: c.name,
        lat: c.coordinates.lat,
        lng: c.coordinates.lng,
        price: minPrice,
        href: `/${locale}/charters/${charterId}`,
        image:
          (Array.isArray(c.images) && c.images.length > 0 && c.images[0]) ||
          c.imageUrl ||
          "",
        ratingAvg: ratings?.averageRating ?? undefined,
        ratingCount: ratings?.reviewCount ?? 0,
        isUnavailable,
      };
    });
}
