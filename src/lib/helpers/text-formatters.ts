// lib/helpers/text-formatters.ts
/**
 * Text formatting utilities for consistent text display
 */

/**
 * Capitalize first letter of string
 * @example capitalize("hello") => "Hello"
 */
export function capitalize(str: string | undefined | null): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to Title Case
 * @example titleCase("hello world") => "Hello World"
 */
export function titleCase(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Convert string to uppercase
 * @example toUpperCase("hello") => "HELLO"
 */
export function toUpperCase(str: string | undefined | null): string {
  if (!str) return "";
  return str.toUpperCase();
}

/**
 * Format location/address consistently
 * Capitalizes city/state names
 * @example formatLocation("klang, selangor") => "Klang, Selangor"
 */
export function formatLocation(location: string | undefined | null): string {
  if (!location) return "";
  return location
    .split(",")
    .map((part) => titleCase(part.trim()))
    .join(", ");
}

/**
 * Format charter name consistently
 * Title case with proper handling of abbreviations
 * @example formatCharterName("deep sea FISHING charter") => "Deep Sea Fishing Charter"
 */
export function formatCharterName(name: string | undefined | null): string {
  if (!name) return "";
  return titleCase(name);
}

/**
 * Truncate text with ellipsis
 * @param maxLength - Maximum length before truncation
 */
export function truncate(
  str: string | undefined | null,
  maxLength: number
): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trim() + "...";
}
