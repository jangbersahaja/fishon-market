/**
 * API client for Fishon Captain Backend (read-only access)
 *
 * This module provides functions to fetch charter and captain data
 * from the Fishon Captain backend API.
 */

// Backend API types (based on Prisma schema from captain backend)
export type BackendCaptainProfile = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  bio: string;
  experienceYrs: number;
  avatarUrl: string | null;
};

export type BackendBoat = {
  id: string;
  name: string;
  type: string;
  lengthFt: number;
  capacity: number;
};

export type BackendTrip = {
  id: string;
  name: string;
  tripType: string;
  price: number;
  durationHours: number;
  maxAnglers: number;
  style: "PRIVATE" | "SHARED";
  description: string | null;
  startTimes: Array<{ value: string }>;
  species: Array<{ value: string }>;
  techniques: Array<{ value: string }>;
};

export type BackendPickup = {
  available: boolean;
  fee: number | null;
  notes: string | null;
  areas: Array<{ label: string }>;
};

export type BackendPolicies = {
  licenseProvided: boolean;
  catchAndKeep: boolean;
  catchAndRelease: boolean;
  childFriendly: boolean;
  liveBaitProvided: boolean;
  alcoholAllowed: boolean;
  smokingAllowed: boolean;
};

export type BackendSchedule = {
  type: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
  operationalDays: number[]; // 0-6 (Sunday-Saturday)
};

export type BackendCharter = {
  id: string;
  name: string;
  charterType: string;
  state: string;
  district: string;
  startingPoint: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  pricingPlan: "BASIC" | "SILVER" | "GOLD";
  captainId: string; // ID of the captain profile (operator)
  ownerId?: string | null; // ID of the user who owns this charter
  captain: BackendCaptainProfile;
  boat: BackendBoat | null;
  trips: BackendTrip[];
  amenities: Array<{ label: string }>;
  features: Array<{ label: string }>;
  media: Array<{
    kind: string;
    url: string;
    sortOrder: number;
    thumbnailUrl?: string | null;
    name?: string;
  }>;
  videos?: Array<{
    kind: string;
    url: string;
    sortOrder: number;
    thumbnailUrl?: string | null;
    name?: string | null;
  }>;
  pickup: BackendPickup | null;
  policies: BackendPolicies | null;
  schedule: BackendSchedule | null;
  unavailability: Array<{
    startDate: string;
    endDate: string;
    reason: string | null;
  }> | null;
};

// Configuration
const API_BASE_URL = process.env.FISHON_CAPTAIN_API_URL || "";
const API_KEY = process.env.FISHON_CAPTAIN_API_KEY || "";

/**
 * Fetch headers with authentication
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }

  return headers;
}

/**
 * Fetch all charters from the backend
 */
export async function fetchCharters(): Promise<BackendCharter[]> {
  if (!API_BASE_URL) {
    throw new Error("FISHON_CAPTAIN_API_URL not configured");
  }

  const response = await fetch(`${API_BASE_URL}/api/public/v1/charters`, {
    headers: getHeaders(),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch charters: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  if (!data.charters) {
    throw new Error("API response missing 'charters' array");
  }
  return data.charters;
}

/**
 * Fetch a single charter by ID from the backend
 */
export async function fetchCharterById(
  id: string
): Promise<BackendCharter | null> {
  if (!API_BASE_URL) {
    console.warn("FISHON_CAPTAIN_API_URL not configured, returning null");
    return null;
  }

  // Use the new v1 public API endpoint
  const response = await fetch(`${API_BASE_URL}/api/public/v1/charters/${id}`, {
    headers: getHeaders(),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `Failed to fetch charter: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.charter || null;
}

/**
 * Search charters by query parameters
 */
export async function searchCharters(params: {
  location?: string;
  charterType?: string;
  technique?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<BackendCharter[]> {
  if (!API_BASE_URL) {
    console.warn(
      "FISHON_CAPTAIN_API_URL not configured, returning empty array"
    );
    return [];
  }

  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `${API_BASE_URL}/api/charters/search?${queryParams.toString()}`,
      {
        headers: getHeaders(),
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search charters: ${response.statusText}`);
    }

    const data = await response.json();
    return data.charters || [];
  } catch (error) {
    console.error("Error searching charters from backend:", error);
    return [];
  }
}
