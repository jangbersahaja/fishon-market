/**
 * i18n Utility Functions
 * 
 * Helper functions for common i18n operations.
 */

import { locales, type Locale } from './config';

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from pathname
 * @param pathname - The URL pathname (e.g., "/en/charters")
 * @returns The locale if found, otherwise undefined
 */
export function getLocaleFromPathname(pathname: string): Locale | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }
  
  return undefined;
}

/**
 * Remove locale prefix from pathname
 * @param pathname - The URL pathname (e.g., "/en/charters")
 * @returns Pathname without locale prefix (e.g., "/charters")
 */
export function removeLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (locale) {
    return pathname.replace(`/${locale}`, '') || '/';
  }
  return pathname;
}

/**
 * Add locale prefix to pathname if needed
 * @param pathname - The URL pathname (e.g., "/charters")
 * @param locale - The target locale
 * @returns Pathname with locale prefix if not default (e.g., "/en/charters")
 */
export function addLocaleToPathname(pathname: string, locale: Locale): string {
  // Remove existing locale if present
  const cleanPath = removeLocaleFromPathname(pathname);
  
  // Default locale (ms) doesn't need prefix
  if (locale === 'ms') {
    return cleanPath;
  }
  
  // Add locale prefix for non-default locales
  return `/${locale}${cleanPath}`;
}

/**
 * Get alternate locale URLs for a pathname
 * Useful for generating hreflang links
 * 
 * @param pathname - The current pathname
 * @returns Object with locale as key and full path as value
 */
export function getAlternateLocaleUrls(pathname: string): Record<Locale, string> {
  const cleanPath = removeLocaleFromPathname(pathname);
  
  return locales.reduce((acc, locale) => {
    acc[locale] = addLocaleToPathname(cleanPath, locale);
    return acc;
  }, {} as Record<Locale, string>);
}

/**
 * Format a date according to locale
 * 
 * @param date - The date to format
 * @param locale - The locale to use
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const localeCode = locale === 'ms' ? 'ms-MY' : 'en-GB';
  
  return new Intl.DateTimeFormat(localeCode, options).format(dateObj);
}

/**
 * Format a number/currency according to locale
 * 
 * @param value - The number to format
 * @param locale - The locale to use
 * @param options - Intl.NumberFormatOptions
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const localeCode = locale === 'ms' ? 'ms-MY' : 'en-GB';
  
  return new Intl.NumberFormat(localeCode, options).format(value);
}

/**
 * Format currency in Malaysian Ringgit
 * 
 * @param amount - The amount to format
 * @param locale - The locale to use
 */
export function formatCurrency(amount: number, locale: Locale): string {
  return formatNumber(amount, locale, {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  });
}
