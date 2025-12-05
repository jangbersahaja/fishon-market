"use client";

import Footer, { type FooterDestination } from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense } from "react";

interface ChromeProps {
  children: ReactNode;
  footerDestinations?: FooterDestination[];
}

// Fallback for Navbar during SSR/hydration (shows minimal header)
function NavbarFallback() {
  return (
    <header className="z-40 w-full h-16 bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f] shadow-md border-b border-white/20" />
  );
}

export default function Chrome({
  children,
  footerDestinations = [],
}: ChromeProps) {
  const pathname = usePathname() || "/";

  // 1) Hide Navbar & Footer on main page
  const hideChrome = pathname === "/ms" || pathname === "/en";

  // 2) Transparent on top for hero pages (e.g., home pages)
  const transparentOnTop =
    pathname.startsWith("/ms/home") || pathname.startsWith("/en/home");

  if (hideChrome) return <> {children}</>;

  return (
    <>
      {transparentOnTop && <div aria-hidden className="fixed top-0 -mt-16" />}
      {/* Navbar wrapped in Suspense because it uses useSearchParams */}
      <Suspense fallback={<NavbarFallback />}>
        <Navbar transparentOnTop={transparentOnTop} />
      </Suspense>

      {children}
      {<Footer destinations={footerDestinations} />}
    </>
  );
}
