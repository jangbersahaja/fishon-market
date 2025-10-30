"use client";

import { AccountNav } from "@/components/account/AccountNav";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // 1) Hide Navbar & Footer on main page
  const hideChrome = pathname === "/";

  // 2) Transparent on top for hero pages (e.g., home pages)
  const transparentOnTop = pathname.startsWith("/home");

  // 3) Show AccountNav for authenticated users on all pages (except auth pages)
  const showAccountNav =
    isAuthenticated && !pathname.startsWith("/auth") && !hideChrome;

  if (hideChrome) return <> {children}</>;

  return (
    <>
      {transparentOnTop && <div aria-hidden className="fixed top-0 -mt-16" />}
      <Navbar transparentOnTop={transparentOnTop} />
      {/* AccountNav for authenticated users */}
      {showAccountNav && <AccountNav transparentOnTop={transparentOnTop} />}

      {children}
      {<Footer />}
    </>
  );
}
