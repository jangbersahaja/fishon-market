"use client";

import Footer, { type FooterDestination } from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface ChromeProps {
  children: ReactNode;
  footerDestinations?: FooterDestination[];
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
      <Navbar transparentOnTop={transparentOnTop} />

      {children}
      {<Footer destinations={footerDestinations} />}
    </>
  );
}
