import { getChartersByTechnique } from "@/lib/services/charter-service";
import { getCharterRatingsBatch } from "@/lib/services/ratings-service";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import TechniqueResultsClient from "./TechniqueResultsClient";

type Params = Promise<{ technique: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { technique } = await params;
  const tech = decodeURIComponent(technique || "");
  const pretty =
    tech
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ") || "Technique";
  return {
    title: `${pretty} Charters | Fishon.my`,
    description: `Explore charters using ${pretty.toLowerCase()} in Malaysia.`,
  };
}

export default async function TechniqueResultsPage({
  params,
}: {
  params: Params;
}) {
  const { technique } = await params;
  const locale = await getLocale();
  // pass through the raw segment to the client component
  const raw = decodeURIComponent(technique || "");
  const charters = await getChartersByTechnique(raw);

  // Fetch ratings for all charters in batch (server-side)
  const charterIds = charters.map((c) => (c as any).backendId ?? String(c.id));
  const ratingsMap = await getCharterRatingsBatch(charterIds);

  // Convert ratingsMap to a plain object for serialization
  const ratingsMapObj = Object.fromEntries(ratingsMap);

  return (
    <TechniqueResultsClient
      rawTechnique={raw}
      charters={charters}
      locale={locale}
      ratingsMap={new Map(Object.entries(ratingsMapObj))}
    />
  );
}
