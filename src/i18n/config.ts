/**
 * i18n Configuration for fishon-market
 *
 * Supports Malay (my) and English (en) languages.
 * Default locale: Malay (my) - as Malaysia's national language
 *
 * This configuration is used by next-intl for internationalization.
 */

export const locales = ["my", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "my";

export const localeLabels: Record<Locale, string> = {
  my: "BM",
  en: "EN",
};

export const localeFlags: Record<Locale, string> = {
  my: "🇲🇾",
  en: "🇬🇧",
};
