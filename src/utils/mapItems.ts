//utils/mapItems.ts
// Convert charters to the lightweight data the map needs.
import type { Charter } from "@fishon/ui";
import { getRatingMap } from "./ratings";

export type MapItem = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  price: number;
  href: string;
  image: string;
  ratingAvg: number;
  ratingCount: number;
};

export function buildMapItems(charters: Charter[]): MapItem[] {
  const ratingMap = getRatingMap();
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
      const rr = ratingMap[Number(c.id)] || { avg: 0, count: 0 };
      return {
        id: c.id,
        name: c.name,
        lat: c.coordinates.lat,
        lng: c.coordinates.lng,
        price: minPrice,
        href: `/charters/view/${c.id}`,
        image:
          (Array.isArray(c.images) && c.images.length > 0 && c.images[0]) ||
          c.imageUrl ||
          "",
        ratingAvg: rr.avg,
        ratingCount: rr.count,
      };
    });
}
