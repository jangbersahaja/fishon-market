/**
 * Charter data service
 *
 * This service provides a unified interface for fetching charter data.
 * Data sources (in priority order):
 * 1. Direct DB connection (if USE_CAPTAIN_DB=1 and CAPTAIN_DATABASE_URL is set)
 * 2. fishon-captain Public API (if FISHON_CAPTAIN_API_URL is set)
 * 3. Throws error if no data source is configured
 */

import {
  fetchCharterById,
  fetchCharters,
  searchCharters,
} from "@/lib/api/captain-api";
import {
  fetchCharterByIdFromDb,
  fetchChartersFromDb,
  isCaptainDbConfigured,
  searchChartersFromDb,
} from "@/lib/api/captain-db";
import { prismaCaptain } from "@/lib/database/prisma-captain";
import type { Charter } from "@fishon/ui";
import {
  convertBackendChartersToFrontend,
  convertBackendCharterToFrontend,
} from "./charter-adapter";

/**
 * Check if backend API is configured
 */
function isBackendConfigured(): boolean {
  return !!process.env.FISHON_CAPTAIN_API_URL;
}

function isDbPreferred(): boolean {
  return (
    process.env.USE_CAPTAIN_DB === "1" || process.env.USE_CAPTAIN_DB === "true"
  );
}

/**
 * Get all charters
 * Priority: DB (if USE_CAPTAIN_DB=1) → API → Error
 */
export async function getCharters(): Promise<Charter[]> {
  // Preference order: DB (if configured + flag) → API → error
  if (isDbPreferred() && isCaptainDbConfigured()) {
    try {
      const backendCharters = await fetchChartersFromDb();
      if (backendCharters.length)
        return convertBackendChartersToFrontend(backendCharters);
      console.log("Captain DB returned 0 charters; falling back to API");
    } catch (e) {
      console.error("Error reading from Captain DB, falling back to API", e);
    }
  }

  if (!isBackendConfigured()) {
    throw new Error(
      "No data source configured. Please set FISHON_CAPTAIN_API_URL or configure CAPTAIN_DATABASE_URL with USE_CAPTAIN_DB=1"
    );
  }

  try {
    const backendCharters = await fetchCharters();

    if (backendCharters.length === 0) {
      console.warn("No charters from backend API");
      return [];
    }

    return convertBackendChartersToFrontend(backendCharters);
  } catch (error) {
    console.error("Error fetching charters from backend API:", error);
    throw new Error(
      "Failed to fetch charters. Please check backend connection."
    );
  }
}

/**
 * Get a single charter by ID
 * Priority: DB (if USE_CAPTAIN_DB=1) → API → Error
 */
export async function getCharterById(
  id: string | number
): Promise<Charter | undefined> {
  // Try DB first when enabled
  if (isDbPreferred() && isCaptainDbConfigured()) {
    try {
      const backend = await fetchCharterByIdFromDb(String(id));
      if (backend) return convertBackendCharterToFrontend(backend);
    } catch (e) {
      console.error("Error reading charter from Captain DB; will try API", e);
    }
  }

  if (!isBackendConfigured()) {
    throw new Error(
      "No data source configured. Please set FISHON_CAPTAIN_API_URL or configure CAPTAIN_DATABASE_URL with USE_CAPTAIN_DB=1"
    );
  }

  try {
    // Try to fetch from backend using the string ID (backend uses cuid)
    const backendCharter = await fetchCharterById(String(id));

    if (backendCharter) {
      return convertBackendCharterToFrontend(backendCharter);
    }

    // Not found
    console.log(`Charter ${id} not found in backend`);
    return undefined;
  } catch (error) {
    console.error(`Error fetching charter ${id} from backend:`, error);
    throw new Error(
      `Failed to fetch charter ${id}. Please check backend connection.`
    );
  }
}

/**
 * Search charters by various criteria
 * Priority: DB (if USE_CAPTAIN_DB=1) → API → Error
 */
export async function searchChartersByCriteria(criteria: {
  location?: string;
  charterType?: string;
  technique?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<Charter[]> {
  // DB path: currently no filtered search in SQL; fetch all and filter client-side as interim
  if (isDbPreferred() && isCaptainDbConfigured()) {
    try {
      // Use DB search for location/name/type facets
      const backendCharters = await searchChartersFromDb(
        {
          location: criteria.location,
          charterType: criteria.charterType,
          q: criteria.location, // simple text search proxy
        },
        200
      );
      if (backendCharters.length) {
        const converted = convertBackendChartersToFrontend(backendCharters);
        return filterCharters(converted, criteria);
      }
    } catch (e) {
      console.error("Error searching via Captain DB; will try API", e);
    }
  }

  if (!isBackendConfigured()) {
    throw new Error(
      "No data source configured. Please set FISHON_CAPTAIN_API_URL or configure CAPTAIN_DATABASE_URL with USE_CAPTAIN_DB=1"
    );
  }

  try {
    const backendCharters = await searchCharters(criteria);

    if (backendCharters.length === 0) {
      console.log("No results from backend search");
      return [];
    }

    return convertBackendChartersToFrontend(backendCharters);
  } catch (error) {
    console.error("Error searching charters from backend:", error);
    throw new Error(
      "Failed to search charters. Please check backend connection."
    );
  }
}

/**
 * Filter charters based on search criteria
 * Used for client-side filtering when needed
 */
function filterCharters(
  charters: Charter[],
  criteria: {
    location?: string;
    charterType?: string;
    technique?: string;
    minPrice?: number;
    maxPrice?: number;
  }
): Charter[] {
  return charters.filter((charter) => {
    // Filter by location
    if (criteria.location) {
      const locationMatch =
        charter.location
          .toLowerCase()
          .includes(criteria.location.toLowerCase()) ||
        charter.address.toLowerCase().includes(criteria.location.toLowerCase());
      if (!locationMatch) return false;
    }

    // Filter by charter type (fishing type)
    if (criteria.charterType) {
      const typeMatch =
        charter.fishingType.toLowerCase() ===
        criteria.charterType.toLowerCase();
      if (!typeMatch) return false;
    }

    // Filter by technique
    if (criteria.technique) {
      const techniqueMatch = charter.techniques.some((t) =>
        t.toLowerCase().includes(criteria.technique!.toLowerCase())
      );
      if (!techniqueMatch) return false;
    }

    // Filter by price range
    if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
      const prices = charter.trip.map((t) => t.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (criteria.minPrice !== undefined && maxPrice < criteria.minPrice)
        return false;
      if (criteria.maxPrice !== undefined && minPrice > criteria.maxPrice)
        return false;
    }

    return true;
  });
}

/**
 * Get charters by fishing type
 */
export async function getChartersByType(type: string): Promise<Charter[]> {
  const allCharters = await getCharters();
  return allCharters.filter(
    (c) => c.fishingType.toLowerCase() === type.toLowerCase()
  );
}

/**
 * Get charters by technique
 */
export async function getChartersByTechnique(
  technique: string
): Promise<Charter[]> {
  const allCharters = await getCharters();
  return allCharters.filter((c) =>
    c.techniques.some((t) => t.toLowerCase().includes(technique.toLowerCase()))
  );
}

/**
 * Get charter's booking flow type
 * Returns MANUAL or AUTO based on captain's configuration
 * Defaults to MANUAL (safer option) if not configured
 */
export async function getCharterFlowType(
  charterId: string
): Promise<"MANUAL" | "AUTO"> {
  try {
    // Try DB first when enabled
    if (isDbPreferred() && isCaptainDbConfigured()) {
      try {
        const rows = await prismaCaptain.$queryRaw<
          Array<{ charter: { bookingFlowType?: string } }>
        >`
          select charter from public.v_public_charters where id = ${charterId} limit 1
        `;
        if (rows.length && rows[0].charter.bookingFlowType) {
          return rows[0].charter.bookingFlowType as "MANUAL" | "AUTO";
        }
      } catch (e) {
        console.error(
          "Error reading flow type from Captain DB; will try API",
          e
        );
      }
    }

    // Try API
    if (isBackendConfigured()) {
      const charter = await fetchCharterById(String(charterId));
      if (charter?.bookingFlowType) {
        return charter.bookingFlowType;
      }
    }

    // Default to MANUAL (safer option)
    console.warn(
      `Could not determine flow type for charter ${charterId}, defaulting to MANUAL`
    );
    return "MANUAL";
  } catch (error) {
    console.error(`Error fetching flow type for charter ${charterId}:`, error);
    return "MANUAL"; // Default to safer Manual flow
  }
}

/**
 * Get charter's approval time hours for Manual flow
 * Returns configured hours or defaults to 24
 */
export async function getCharterApprovalTimeHours(
  charterId: string
): Promise<number> {
  try {
    // Try DB first when enabled
    if (isDbPreferred() && isCaptainDbConfigured()) {
      try {
        const rows = await prismaCaptain.$queryRaw<
          Array<{ charter: { approvalTimeHours?: number } }>
        >`
          select charter from public.v_public_charters where id = ${charterId} limit 1
        `;
        if (rows.length && rows[0].charter.approvalTimeHours) {
          return rows[0].charter.approvalTimeHours;
        }
      } catch (e) {
        console.error(
          "Error reading approval time from Captain DB; will try API",
          e
        );
      }
    }

    // Try API
    if (isBackendConfigured()) {
      const charter = await fetchCharterById(String(charterId));
      if (charter?.approvalTimeHours) {
        return charter.approvalTimeHours;
      }
    }

    // Default to 24 hours
    return 24;
  } catch (error) {
    console.error(
      `Error fetching approval time for charter ${charterId}:`,
      error
    );
    return 24; // Default to 24 hours
  }
}
