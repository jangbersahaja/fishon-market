"use client";

import { localeFlags, localeLabels, locales, type Locale } from "@/i18n/config";
import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

/**
 * Language Switcher Component
 *
 * Allows users to switch between Malay (my) and English (en) languages.
 * Maintains the current route and query parameters when switching languages.
 *
 * Uses hard navigation to ensure proper locale switching and content reload.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Build the new URL with the target locale and preserve search params
    const queryString = searchParams.toString();
    const newPath = `/${newLocale}${pathname}${queryString ? `?${queryString}` : ""}`;

    // Force a hard navigation to ensure locale change takes effect
    window.location.href = newPath;
  };

  return (
    <div className="flex items-center gap-2">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleLocaleChange(loc)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            locale === loc
              ? "bg-white text-[#ec2227] shadow-sm"
              : "text-white/90 hover:bg-white/10"
          }`}
          aria-label={`Switch to ${localeLabels[loc]}`}
          aria-current={locale === loc ? "true" : undefined}
        >
          <span className="text-base" role="img" aria-hidden="true">
            {localeFlags[loc]}
          </span>
          <span className="hidden sm:inline">{localeLabels[loc]}</span>
        </button>
      ))}
    </div>
  );
}
