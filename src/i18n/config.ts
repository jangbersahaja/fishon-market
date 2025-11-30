/**
 * i18n Configuration for fishon-market
 *
 * Supports Malay (ms) and English (en) languages.
 * Default locale: Malay (ms) - as Malaysia's national language
 *
 * This configuration is used by next-intl for internationalization.
 */

export const locales = ["ms", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ms";

export const localeLabels: Record<Locale, string> = {
  ms: "BM",
  en: "EN",
};

export const localeFlags: Record<Locale, string> = {
  ms: "🇲🇾",
  en: "🇬🇧",
};
