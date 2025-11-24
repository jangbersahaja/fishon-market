// src/app/search/category/type/[type]/page.tsx
import { buildMapItems } from "@/utils/mapItems";
import { getRatingMap } from "@/utils/ratings";
import type { Metadata } from "next";
import TypeResultsClient from "./TypeResultsClient";
import { getChartersByType } from "@/lib/services/charter-service";

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
  const rawType = decodeURIComponent(params.type || "");
  const key = rawType.toLowerCase().trim();

  // Fetch charters by type
  const items = await getChartersByType(key);

  // Ratings for grid badges / map infowindows
  const ratingMap = getRatingMap();

  // Map items for the price pins
  const mapItems = buildMapItems(items).map((m) => ({
    ...m,
    // enrich with rating for popup (safe even if missing)
    ratingAvg: ratingMap[m.id]?.avg ?? 0,
    ratingCount: ratingMap[m.id]?.count ?? 0,
  }));

  const prettyType = prettyCase(rawType);
  const title = `${prettyType} Charters`;

  // Klang Valley fallback center
  const fallbackCenter = { lat: 3.0738, lng: 101.5183 };

  return (
    <TypeResultsClient
      prettyType={prettyType}
      items={items}
      mapItems={mapItems}
      fallbackCenter={fallbackCenter}
      title={title}
    />
  );
}
