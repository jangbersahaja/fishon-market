"use client";

import { useLocale } from "next-intl";
import Link, { LinkProps } from "next/link";
import { ComponentProps } from "react";

/**
 * Localized Link Component
 *
 * Automatically prefixes links with the current locale.
 * Uses the default locale (my) without prefix for cleaner URLs.
 *
 * Usage:
 * ```tsx
 * <LocalizedLink href="/charters">View Charters</LocalizedLink>
 * ```
 */
export function LocalizedLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string | LinkProps["href"];
}) {
  const locale = useLocale();

  // Convert href to string if it's an object
  const hrefString = typeof href === "string" ? href : href.pathname || "/";

  // Don't localize external links or anchors
  if (
    hrefString.startsWith("http") ||
    hrefString.startsWith("//") ||
    hrefString.startsWith("#") ||
    hrefString.startsWith("mailto:") ||
    hrefString.startsWith("tel:")
  ) {
    return <Link href={href} {...props} />;
  }

  // Don't localize API routes
  if (hrefString.startsWith("/api/")) {
    return <Link href={href} {...props} />;
  }

  // Check if the href already has a locale prefix
  const hasLocalePrefix = /^\/(my|en)(\/|$)/.test(hrefString);

  // If already has locale prefix or is default locale (my), use as-is
  if (hasLocalePrefix || locale === "my") {
    return <Link href={href} {...props} />;
  }

  // Add locale prefix for non-default locales
  const localizedHref =
    typeof href === "string"
      ? `/${locale}${hrefString.startsWith("/") ? hrefString : `/${hrefString}`}`
      : { ...href, pathname: `/${locale}${hrefString}` };

  return <Link href={localizedHref} {...props} />;
}
