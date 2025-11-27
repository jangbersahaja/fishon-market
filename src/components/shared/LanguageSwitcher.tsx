"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeFlags, localeLabels, locales, type Locale } from "@/i18n/config";
import { usePathname } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-white hover:bg-white/20 hover:text-white focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-white/20"
        >
          <span className="text-base leading-none">{localeFlags[locale]}</span>
          <span className="ml-1 font-medium">{localeLabels[locale]}</span>
          <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[120px]">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-base leading-none">{localeFlags[loc]}</span>
            <span className="font-medium">{localeLabels[loc]}</span>
            {locale === loc && (
              <span className="absolute right-2 flex h-2 w-2 rounded-full bg-[#ec2227]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
