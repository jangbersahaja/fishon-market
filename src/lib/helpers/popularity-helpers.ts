/**
 * Popularity calculation helpers based on charter data
 */

import { expandDestinationSearchTerms } from "@/utils/destinationAliases";
import type { Charter } from "@fishon/ui";

/**
 * Extract location info from charter
 * Charter location format: "{city}, {state}"
 * e.g., "Puchong, Selangor" or "Port Klang, Selangor"
 */
function extractLocationInfo(charter: Charter): {
  city?: string;
  state?: string;
} {
  // Location format: "City, State"
  const locationParts = charter.location
    .split(",")
    .map((part) => part.trim().toLowerCase());

  const city = locationParts[0] || undefined;
  const state = locationParts[1] || undefined;

  return { city, state };
}

/**
 * Check if charter matches a destination
 */
function charterMatchesDestination(
  charter: Charter,
  destination: string
): boolean {
  const searchTerms = expandDestinationSearchTerms(destination);
  const { city } = extractLocationInfo(charter);

  if (!city) return false;

  for (const term of searchTerms) {
    if (term && city.includes(term)) {
      return true;
    }
  }

  return false;
}

/**
 * Count charters for a destination
 */
export function countChartersForDestination(
  charters: Charter[],
  destination: string
): number {
  return charters.filter((charter) =>
    charterMatchesDestination(charter, destination)
  ).length;
}

/**
 * Get popular destinations with charter counts
 */
export interface PopularDestination {
  name: string;
  count: number;
  state?: string;
  /** First available charter image for this destination (fallback when no location image) */
  charterImage?: string;
}

export function getPopularDestinations(
  charters: Charter[],
  limit?: number
): PopularDestination[] {
  // Extract all unique cities from charters
  const cityCounts = new Map<
    string,
    { count: number; state?: string; charterImage?: string }
  >();

  charters.forEach((charter) => {
    const { city, state } = extractLocationInfo(charter);

    if (!city || city.length < 3) return;

    // Use the city name directly for granular grouping
    // e.g., "puchong", "seri kembangan", "port klang"
    const normalized = city.trim();

    const current = cityCounts.get(normalized);
    if (current) {
      current.count += 1;
      // Keep the first charter image we find (prioritize charters with images)
      if (!current.charterImage && charter.imageUrl) {
        current.charterImage = charter.imageUrl;
      }
    } else {
      cityCounts.set(normalized, {
        count: 1,
        state,
        charterImage: charter.imageUrl,
      });
    }
  });

  // Convert to array and sort by count
  const destinations = Array.from(cityCounts.entries())
    .map(([name, data]) => ({
      // Capitalize first letter of each word for display
      name: name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      count: data.count,
      state: data.state,
      charterImage: data.charterImage,
    }))
    .sort((a, b) => b.count - a.count);

  return limit ? destinations.slice(0, limit) : destinations;
}

/**
 * Count charters by fishing type
 */
export function countChartersByType(charters: Charter[], type: string): number {
  return charters.filter(
    (c) => c.fishingType.toLowerCase() === type.toLowerCase()
  ).length;
}

/**
 * Count charters by technique
 */
export function countChartersByTechnique(
  charters: Charter[],
  technique: string
): number {
  const normalized = technique.toLowerCase();
  return charters.filter((c) =>
    c.techniques.some((t) => {
      const tLower = t.toLowerCase();
      // Special handling: "Bottom Fishing" should also match "Bottom"
      if (normalized === "bottom fishing" && tLower === "bottom") {
        return true;
      }
      return tLower.includes(normalized);
    })
  ).length;
}

/**
 * Get popular techniques with charter counts
 */
export interface PopularTechnique {
  name: string;
  count: number;
}

export function getPopularTechniques(
  charters: Charter[],
  techniques: string[],
  limit?: number
): PopularTechnique[] {
  const techniquesWithCounts = techniques
    .map((tech) => ({
      name: tech,
      count: countChartersByTechnique(charters, tech),
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  return limit ? techniquesWithCounts.slice(0, limit) : techniquesWithCounts;
}

/**
 * Get all fishing types with charter counts
 */
export interface FishingTypeWithCount {
  key: string;
  label: string;
  labelMy: string;
  count: number;
}

export function getFishingTypesWithCounts(
  charters: Charter[]
): FishingTypeWithCount[] {
  const types = [
    { key: "lake", label: "Lake", labelMy: "Tasik" },
    { key: "stream", label: "Stream", labelMy: "Sungai" },
    { key: "inshore", label: "Inshore", labelMy: "Persisir" },
    { key: "offshore", label: "Offshore", labelMy: "Laut Dalam" },
    { key: "jungle", label: "Jungle", labelMy: "Hutan" },
  ];

  return types.map((type) => ({
    ...type,
    count: countChartersByType(charters, type.key),
  }));
}

/**
 * State with destinations grouped
 */
export interface StateWithDestinations {
  state: string;
  stateSlug: string;
  totalCharters: number;
  destinations: PopularDestination[];
}

/**
 * Get destinations grouped by state
 * Returns states sorted by total charter count
 */
export function getDestinationsGroupedByState(
  charters: Charter[]
): StateWithDestinations[] {
  const destinations = getPopularDestinations(charters);

  // Group by state
  const stateMap = new Map<string, PopularDestination[]>();

  destinations.forEach((dest) => {
    const state = dest.state || "other";
    const existing = stateMap.get(state) || [];
    existing.push(dest);
    stateMap.set(state, existing);
  });

  // Convert to array and calculate totals
  const statesWithDestinations: StateWithDestinations[] = Array.from(
    stateMap.entries()
  )
    .map(([state, dests]) => ({
      state: toTitleCase(state),
      stateSlug: state.toLowerCase().replace(/\s+/g, "-"),
      totalCharters: dests.reduce((sum, d) => sum + d.count, 0),
      destinations: dests.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.totalCharters - a.totalCharters);

  return statesWithDestinations;
}

/**
 * Get list of available states with charter counts
 */
export interface AvailableState {
  name: string;
  slug: string;
  charterCount: number;
}

export function getAvailableStates(charters: Charter[]): AvailableState[] {
  const stateGroups = getDestinationsGroupedByState(charters);

  return stateGroups
    .filter((s) => s.state.toLowerCase() !== "other")
    .map((s) => ({
      name: s.state,
      slug: s.stateSlug,
      charterCount: s.totalCharters,
    }));
}

/**
 * Helper to convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
