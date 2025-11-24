import type { Metadata } from "next";
import TechniqueResultsClient from "./TechniqueResultsClient";
import { getChartersByTechnique } from "@/lib/services/charter-service";

type Params = { technique: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const tech = decodeURIComponent(params.technique || "");
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

export default async function TechniqueResultsPage({ params }: { params: Params }) {
  // pass through the raw segment to the client component
  const raw = decodeURIComponent(params.technique || "");
  const charters = await getChartersByTechnique(raw);
  return <TechniqueResultsClient rawTechnique={raw} charters={charters} />;
}
