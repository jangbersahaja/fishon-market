/**
 * i18n Navigation Utilities
 *
 * Provides locale-aware navigation functions using next-intl.
 * These should be used instead of Next.js's default navigation hooks
 * when you need to preserve or change locales in URLs.
 */

import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always", // Always show locale in URL
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
