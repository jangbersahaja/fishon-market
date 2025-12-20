/**
 * Promo Split Configuration Reader for fishon-market
 *
 * Fetches promo split configuration from fishon-captain's Public v1 API.
 * Falls back to 50/50 default if API unavailable or config missing.
 *
 * Uses HTTP API (not direct database) to maintain architecture consistency.
 */

import { logger } from "@/lib/logger";

export interface PromoSplitConfig {
  captainPercent: number;
  platformPercent: number;
}

export const DEFAULT_PROMO_SPLIT: PromoSplitConfig = {
  captainPercent: 50.0,
  platformPercent: 50.0,
};

// In-memory cache with 5-minute TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const promoSplitCache = new Map<string, CacheEntry<PromoSplitConfig>>();

/**
 * Get current promo split configuration from fishon-captain API
 *
 * @returns PromoSplitConfig with captain and platform percentages
 * Falls back to 50/50 default if API unavailable
 */
export async function getPromoSplitConfig(): Promise<PromoSplitConfig> {
  const cacheKey = "PROMO_SPLIT_CONFIG";
  const cached = promoSplitCache.get(cacheKey);

  // Return cached if valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.debug("Promo split config cache hit", { config: cached.data });
    return cached.data;
  }

  // Fetch from captain API
  try {
    const apiUrl = process.env.FISHON_CAPTAIN_API_URL;
    if (!apiUrl) {
      logger.warn("FISHON_CAPTAIN_API_URL not set, using default promo split");
      return DEFAULT_PROMO_SPLIT;
    }

    const response = await fetch(
      `${apiUrl}/api/public/v1/settings/promo-split`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store", // Always fetch fresh
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      logger.warn("Invalid API response for promo split", { result });
      return DEFAULT_PROMO_SPLIT;
    }

    const config = result.data as PromoSplitConfig;

    // Cache result
    promoSplitCache.set(cacheKey, { data: config, timestamp: Date.now() });

    logger.debug("Promo split config loaded from captain API", {
      config,
      fallback: result.fallback,
    });

    return config;
  } catch (error) {
    logger.error("Failed to load promo split config from captain API", {
      error,
    });
    // Gracefully fall back to default
    return DEFAULT_PROMO_SPLIT;
  }
}

/**
 * Clear promo split cache (for testing/debugging)
 */
export function invalidatePromoSplitCache(): void {
  promoSplitCache.clear();
  logger.debug("Promo split cache invalidated");
}
