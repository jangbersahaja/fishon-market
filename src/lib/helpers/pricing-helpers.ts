/**
 * Pricing Display Helpers
 *
 * Helper functions for calculating display prices with commission
 * Used by UI components to show prices to anglers
 */

/**
 * Calculate display price (base price + commission)
 * Commission is 10% with RM100 cap
 *
 * @param basePrice - Captain's base price (trip.priceOverride ?? trip.price)
 * @returns Display price (what angler sees)
 *
 * Examples:
 * - RM500 → RM550 (500 + 50)
 * - RM1000 → RM1100 (1000 + 100)
 * - RM2000 → RM2100 (2000 + 100, capped!)
 */
export function calculateDisplayPrice(basePrice: number): number {
  const commission = Math.min(basePrice * 0.1, 100);
  return Math.round((basePrice + commission) * 100) / 100;
}

/**
 * Calculate commission amount
 * 10% with RM100 cap
 *
 * @param basePrice - Captain's base price
 * @returns Commission amount
 */
export function calculateCommission(basePrice: number): number {
  return Math.round(Math.min(basePrice * 0.1, 100) * 100) / 100;
}

/**
 * Format price for display
 *
 * @param price - Price to format
 * @param includeRM - Whether to include "RM" prefix (default: true)
 * @returns Formatted price string
 */
export function formatPrice(price: number, includeRM = true): string {
  const formatted = price.toFixed(2);
  return includeRM ? `RM${formatted}` : formatted;
}
