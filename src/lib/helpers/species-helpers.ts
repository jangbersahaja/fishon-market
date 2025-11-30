/**
 * Species helper functions for extracting available species from charter data
 */

import {
  ALL_SPECIES,
  SPECIES_BY_CATEGORY,
  SPECIES_BY_ID,
  SPECIES_CATEGORIES,
  type SpeciesCategory,
  type SpeciesItem,
} from "@/data/species";
import type { Charter } from "@fishon/ui";

export interface SpeciesWithCount extends SpeciesItem {
  charterCount: number;
}

export interface SpeciesByCategory {
  category: SpeciesCategory;
  label: string;
  labelMy: string;
  species: SpeciesWithCount[];
  totalCount: number;
}

const CATEGORY_LABELS: Record<
  SpeciesCategory,
  { label: string; labelMy: string }
> = {
  [SPECIES_CATEGORIES.SALTWATER]: { label: "Saltwater", labelMy: "Air Masin" },
  [SPECIES_CATEGORIES.FRESHWATER]: {
    label: "Freshwater",
    labelMy: "Air Tawar",
  },
  [SPECIES_CATEGORIES.SQUID]: { label: "Squid & Octopus", labelMy: "Sotong" },
};

/**
 * Extract all unique species from charters' trips
 * Returns a map of species ID to charter count
 */
export function extractSpeciesFromCharters(
  charters: Charter[]
): Map<string, number> {
  const speciesCount = new Map<string, number>();

  charters.forEach((charter) => {
    // Track species per charter (avoid double counting)
    const charterSpecies = new Set<string>();

    // Get species from all trips
    charter.trip?.forEach((trip) => {
      trip.species?.forEach((speciesId) => {
        // Normalize: try to match by ID first, then by name
        const normalized = normalizeSpeciesId(speciesId);
        if (normalized) {
          charterSpecies.add(normalized);
        }
      });
    });

    // Also check charter-level species
    charter.species?.forEach((speciesId) => {
      const normalized = normalizeSpeciesId(speciesId);
      if (normalized) {
        charterSpecies.add(normalized);
      }
    });

    // Add to count (each charter counts once per species)
    charterSpecies.forEach((id) => {
      speciesCount.set(id, (speciesCount.get(id) || 0) + 1);
    });
  });

  return speciesCount;
}

/**
 * Normalize species identifier to canonical ID
 * Handles ID, English name, or Local name lookups
 */
function normalizeSpeciesId(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim().toLowerCase();

  // Direct ID match
  if (SPECIES_BY_ID[trimmed]) {
    return trimmed;
  }

  // Search by English or Local name
  const found = ALL_SPECIES.find(
    (sp) =>
      sp.id.toLowerCase() === trimmed ||
      sp.english_name.toLowerCase() === trimmed ||
      sp.local_name.toLowerCase() === trimmed
  );

  return found?.id || null;
}

/**
 * Get all available species grouped by category with charter counts
 * Only returns species that have at least one charter
 */
export function getAvailableSpeciesByCategory(
  charters: Charter[]
): SpeciesByCategory[] {
  const speciesCount = extractSpeciesFromCharters(charters);

  const categories: SpeciesCategory[] = [
    SPECIES_CATEGORIES.SALTWATER,
    SPECIES_CATEGORIES.FRESHWATER,
    SPECIES_CATEGORIES.SQUID,
  ];

  return categories
    .map((category) => {
      const categorySpecies = SPECIES_BY_CATEGORY[category];
      const availableSpecies: SpeciesWithCount[] = categorySpecies
        .filter((sp) => speciesCount.has(sp.id))
        .map((sp) => ({
          ...sp,
          charterCount: speciesCount.get(sp.id) || 0,
        }))
        .sort((a, b) => b.charterCount - a.charterCount);

      return {
        category,
        label: CATEGORY_LABELS[category].label,
        labelMy: CATEGORY_LABELS[category].labelMy,
        species: availableSpecies,
        totalCount: availableSpecies.reduce(
          (sum, sp) => sum + sp.charterCount,
          0
        ),
      };
    })
    .filter((cat) => cat.species.length > 0);
}

/**
 * Get flat list of all available species with counts
 */
export function getAvailableSpecies(charters: Charter[]): SpeciesWithCount[] {
  const speciesCount = extractSpeciesFromCharters(charters);

  return ALL_SPECIES.filter((sp) => speciesCount.has(sp.id))
    .map((sp) => ({
      ...sp,
      charterCount: speciesCount.get(sp.id) || 0,
    }))
    .sort((a, b) => b.charterCount - a.charterCount);
}

/**
 * Count charters for a specific species
 */
export function countChartersForSpecies(
  charters: Charter[],
  speciesId: string
): number {
  const normalized = normalizeSpeciesId(speciesId);
  if (!normalized) return 0;

  return charters.filter((charter) => {
    // Check trip-level species
    const tripMatch = charter.trip?.some((trip) =>
      trip.species?.some((s) => normalizeSpeciesId(s) === normalized)
    );

    // Check charter-level species
    const charterMatch = charter.species?.some(
      (s) => normalizeSpeciesId(s) === normalized
    );

    return tripMatch || charterMatch;
  }).length;
}

/**
 * Get species item by ID with graceful fallback
 */
export function getSpeciesById(id: string): SpeciesItem | null {
  const normalized = normalizeSpeciesId(id);
  if (!normalized) return null;
  return SPECIES_BY_ID[normalized] || null;
}
