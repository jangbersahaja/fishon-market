/**
 * Root Layout
 *
 * This is a minimal root layout that wraps all locale-specific layouts.
 * The actual HTML structure is in [locale]/layout.tsx.
 *
 * According to Next.js docs, when using i18n with [locale] segment,
 * we need to ensure the root layout passes through to locale layouts properly.
 */
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The [locale]/layout.tsx handles <html>, <head>, and <body>
  return <>{children}</>;
}
