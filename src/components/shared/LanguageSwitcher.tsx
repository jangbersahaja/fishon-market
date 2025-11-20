"use client";

import { localeFlags, localeLabels, locales, type Locale } from "@/i18n/config";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Language Switcher Component
 * 
 * Allows users to switch between Malay (ms) and English (en) languages.
 * Maintains the current route when switching languages.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(() => {
      // Replace the locale in the pathname
      const pathWithoutLocale = pathname.replace(/^\/(ms|en)/, '');
      const newPath = newLocale === 'ms' 
        ? pathWithoutLocale || '/' // Default locale doesn't need prefix
        : `/${newLocale}${pathWithoutLocale || '/'}`;
      
      router.replace(newPath);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleLocaleChange(loc)}
          disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            locale === loc
              ? "bg-white text-[#ec2227] shadow-sm"
              : "text-white/90 hover:bg-white/10"
          } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
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
