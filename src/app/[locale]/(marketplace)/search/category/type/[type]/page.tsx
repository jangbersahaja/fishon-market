// src/app/search/category/type/[type]/page.tsx
import { getChartersByType } from "@/lib/services/charter-service";
import { getCharterRatingsBatch } from "@/lib/services/ratings-service";
import { buildMapItems } from "@/utils/mapItems";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import TypeResultsClient from "./TypeResultsClient";

type Params = { type?: string };

function prettyCase(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const t = decodeURIComponent(params.type || "");
  const pretty = prettyCase(t);
  return {
    title: `${pretty} Fishing Charters | Fishon`,
    description: `Browse ${pretty.toLowerCase()} fishing charters near you. Compare prices, read reviews, and book a trip on Fishon.`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const locale = await getLocale();
  const rawType = decodeURIComponent(params.type || "");
  const key = rawType.toLowerCase().trim();

  // Fetch charters by type
  const items = await getChartersByType(key);

  // Fetch ratings for all charters in batch (server-side)
  const charterIds = items.map((c) => (c as any).backendId ?? String(c.id));
  const ratingsMap = await getCharterRatingsBatch(charterIds);

  // Map items for the price pins (with locale and ratings)
  const mapItems = buildMapItems(items, { locale, ratingsMap });

  const prettyType = prettyCase(rawType);
  const title = `${prettyType} Charters`;

  // Calculate fallback center from charters
  const chartersWithCoords = items.filter(
    (c) => c.coordinates?.lat && c.coordinates?.lng
  );
  const fallbackCenter =
    chartersWithCoords.length > 0
      ? {
          lat:
            chartersWithCoords.reduce((sum, c) => sum + c.coordinates!.lat, 0) /
            chartersWithCoords.length,
          lng:
            chartersWithCoords.reduce((sum, c) => sum + c.coordinates!.lng, 0) /
            chartersWithCoords.length,
        }
      : { lat: 3.139, lng: 101.6869 };

  // Convert ratingsMap to a plain object for serialization
  const ratingsMapObj = Object.fromEntries(ratingsMap);

  return (
    <TypeResultsClient
      prettyType={prettyType}
      items={items}
      mapItems={mapItems}
      fallbackCenter={fallbackCenter}
      title={title}
      ratingsMap={new Map(Object.entries(ratingsMapObj))}
    />
  );
}
