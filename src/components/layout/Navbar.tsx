"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { CheckYourBookings } from "@/components/booking";
import { NotificationBell } from "@/components/notifications";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";

type NavbarProps = {
  /** When true, navbar is transparent at the top and becomes solid on scroll. */
  transparentOnTop?: boolean;
};

export default function Navbar({ transparentOnTop = false }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const { openModal } = useAuthModal();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Always fixed; choose color based on variant/state
  const base = "z-40 w-full text-white transition-colors duration-300";
  const solid = "bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f]";
  const headerClass = !transparentOnTop
    ? `${base} ${solid}`
    : open
      ? `${base} ${solid}`
      : `${base} bg-transparent absolute`;

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl sm:px-6">
        {/* Logo */}
        <Link
          href="/home"
          className="flex items-center gap-2"
          aria-label="Fishon.my home"
        >
          <span className="relative h-14 w-28">
            <Image
              src="/images/logos/fishon-logo-white.png"
              alt="Fishon"
              fill
              className="object-contain"
              priority
              sizes="150px"
            />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="items-center hidden gap-6 md:flex" aria-label="Primary">
          {isAuthed ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              <Link
                href="/account"
                aria-current={isActive("/account") ? "page" : undefined}
                className={`text-sm font-medium underline-offset-4 decoration-white/40 ${
                  isActive("/account")
                    ? "underline"
                    : "hover:underline hover:decoration-white"
                }`}
              >
                Account
              </Link>
              <button
                onClick={() =>
                  signOut({
                    callbackUrl:
                      window.location.pathname + window.location.search,
                  })
                }
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#ec2227] hover:translate-y-px transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {/* Guest users: Show "Check Your Bookings" if they have any */}
              <CheckYourBookings />

              <button
                onClick={() => openModal("signin", pathname)}
                className="text-sm font-medium underline-offset-4 decoration-white/40 hover:underline hover:decoration-white"
              >
                Sign in
              </button>
              <button
                onClick={() => openModal("register", pathname)}
                className="text-sm font-medium underline-offset-4 decoration-white/40 hover:underline hover:decoration-white"
              >
                Register
              </button>
            </>
          )}
          <Link
            href="https://fishon-captain.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-current={isActive("/list-your-business") ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              isActive("/list-your-business")
                ? "bg-white/90 text-[#ec2227]"
                : "bg-white text-[#ec2227] hover:translate-y-px"
            }`}
          >
            Register as Captain
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          className="inline-flex items-center justify-center p-2 rounded-md md:hidden"
        >
          {open ? <IoClose size={22} /> : <GiHamburgerMenu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`md:hidden ${
          open ? "block bg-[#ec2227]" : "hidden"
        } border-t border-white/20`}
      >
        <nav
          className="flex flex-col gap-1 px-4 py-3 mx-auto max-w-7xl"
          aria-label="Mobile"
        >
          {isAuthed ? (
            <>
              <Link
                href="/account"
                aria-current={isActive("/account") ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive("/account") ? "bg-white/15" : "hover:bg-white/10"
                }`}
                onClick={() => setOpen(false)}
              >
                Account
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  signOut({
                    callbackUrl:
                      window.location.pathname + window.location.search,
                  });
                }}
                className="mt-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#ec2227] text-left"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {/* Mobile: Check Your Bookings as a link */}
              <div className="pb-2 mb-2 border-b border-white/20">
                <CheckYourBookings />
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  openModal("signin", pathname);
                }}
                className="px-3 py-2 text-sm font-medium text-left rounded-md hover:bg-white/10"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  openModal("register", pathname);
                }}
                className="px-3 py-2 text-sm font-medium text-left rounded-md hover:bg-white/10"
              >
                Register
              </button>
            </>
          )}
          <Link
            href="https://fishon-captain.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#ec2227] text-center hover:translate-y-px transition"
          >
            List Your Charter
          </Link>
        </nav>
      </div>
    </header>
  );
}
