import Breadcrumbs from "@/components/search/Breadcrumbs";
import ResultsGrid from "@/components/search/ResultsGrid";
import ResultsMap from "@/components/search/ResultsMap";
import SearchResultsHeader from "@/components/search/SearchResultsHeader";
import { buildMapItems } from "@/utils/mapItems";
import type { Charter } from "@fishon/ui";

type Props = {
  rawTechnique: string;
  charters: Charter[];
  locale?: string;
  ratingsMap?: Map<
    string,
    { averageRating: number | null; reviewCount: number }
  >;
};

export default function TechniqueResultsClient({
  rawTechnique,
  charters,
  locale = "en",
  ratingsMap,
}: Props) {
  const raw = rawTechnique || "";
  const filtered = charters;

  const pretty =
    raw
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ") || "Technique";

  const mapItems = buildMapItems(filtered as Charter[], { locale, ratingsMap });

  // Calculate fallback center from charters
  const chartersWithCoords = filtered.filter(
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

  return (
    <main className="mx-auto w-full">
      <SearchResultsHeader
        title={`${pretty} — Fishing Charters`}
        count={filtered.length}
        subtitleSuffix={`${filtered.length === 1 ? "trip" : "trips"}`}
      />

      <section className="mx-auto w-full max-w-7xl mt-10 px-5 sm:px-5 py-3">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/categories/techniques", label: "Fishing Techniques" },
            { label: pretty },
          ]}
        />

        <h3 className="mb-3 md:mb-4 text-base md:text-lg font-semibold text-gray-900">
          {pretty} Trips Nearby You
        </h3>

        <ResultsMap
          idBase="technique"
          items={mapItems}
          initialCenter={fallbackCenter}
          sectionTitle={
            (
              <span className="capitalize">
                {pretty} {filtered.length === 1 ? "Trip" : "Trips"} Nearby You
              </span>
            ) as any
          }
        />

        <ResultsGrid items={filtered as Charter[]} ratingsMap={ratingsMap} />
      </section>
    </main>
  );
}
