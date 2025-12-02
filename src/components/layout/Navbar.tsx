"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { CheckYourBookings } from "@/components/booking";
import { UserNav } from "@/components/layout/UserNav";
import { NotificationBell } from "@/components/notifications";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import {
  Calendar,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Star,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const { openModal } = useAuthModal();
  const t = useTranslations();
  const { unreadCount } = useUnreadMessages();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Always fixed; choose color based on variant/state
  const base = "z-40 w-full text-white transition-colors duration-300";
  const solid =
    "bg-gradient-to-tr from-[#ec2227] via-[#d11f24] to-[#b01a1f] shadow-md border-b border-white/20";
  const headerClass = !transparentOnTop
    ? `${base} ${solid}`
    : open
      ? `${base} ${solid}`
      : `${base} bg-transparent absolute`;

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between h-16 px-5 mx-auto max-w-7xl">
        {/* Logo */}
        <Link
          href={`/${locale}/home`}
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
          {/* Language Switcher */}
          <LanguageSwitcher />
          {isAuthed ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              <Link
                href={`/${locale}/account/messages`}
                aria-current={
                  isActive(`/${locale}/account/messages`) ? "page" : undefined
                }
                className={`relative text-sm font-medium underline-offset-4 decoration-white/40 ${
                  isActive(`/${locale}/account/messages`)
                    ? "underline"
                    : "hover:underline hover:decoration-white"
                }`}
              >
                {t("nav.messages")}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#ec2227]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown */}
              <UserNav />
            </>
          ) : (
            <>
              {/* Guest users: Show "Check Your Bookings" if they have any */}
              <CheckYourBookings />

              <button
                onClick={() => openModal("signin", pathname)}
                className="pl-6 text-sm font-medium border-l underline-offset-4 decoration-white/40 hover:underline hover:decoration-white border-white/40"
              >
                {t("nav.signIn")}
              </button>
              <button
                onClick={() => openModal("register", pathname)}
                className="text-sm font-medium underline-offset-4 decoration-white/40 hover:underline hover:decoration-white"
              >
                {t("nav.register")}
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
            className="inline-flex items-center justify-center p-2 rounded-md "
          >
            {open ? <IoClose size={22} /> : <GiHamburgerMenu size={22} />}
          </button>
        </div>
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
              <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b border-white/20">
                {session?.user?.image ? (
                  <div className="relative w-10 h-10 overflow-hidden rounded-full ring-2 ring-white/20">
                    <Image
                      src={session.user.image}
                      alt={session?.user?.name || "User"}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-white/10 ring-2 ring-white/20">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {session?.user?.name || "User"}
                  </span>
                  <span className="text-xs text-white/70">
                    {session?.user?.email}
                  </span>
                </div>
              </div>

              <Link
                href={`/${locale}/account/overview`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                {t("account.overview")}
              </Link>
              <Link
                href={`/${locale}/account/bookings`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <Calendar className="w-4 h-4" />
                {t("account.bookings")}
              </Link>
              <Link
                href={`/${locale}/account/messages`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <span className="relative">
                  <MessageSquare className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#ec2227]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                {t("nav.messages")}
              </Link>
              <Link
                href={`/${locale}/account/reviews`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <Star className="w-4 h-4" />
                {t("account.reviews")}
              </Link>
              <Link
                href={`/${locale}/account/favorites`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <Heart className="w-4 h-4" />
                {t("account.favorites")}
              </Link>
              <Link
                href={`/${locale}/account/profile`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <User className="w-4 h-4" />
                {t("account.profile")}
              </Link>
              <Link
                href={`/${locale}/support/help`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <HelpCircle className="w-4 h-4" />
                {t("footer.support")}
              </Link>

              <button
                onClick={() => {
                  setOpen(false);
                  signOut({
                    callbackUrl:
                      window.location.pathname + window.location.search,
                  });
                }}
                className="flex items-center w-full gap-2 px-3 py-2 mt-1 text-sm font-semibold text-left bg-white rounded-md text-[#ec2227]"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.signOut")}
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
                {t("nav.signIn")}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  openModal("register", pathname);
                }}
                className="px-3 py-2 text-sm font-medium text-left rounded-md hover:bg-white/10"
              >
                {t("nav.register")}
              </button>
            </>
          )}

          {/* Language Switcher - Mobile */}
          <div className="py-2 my-2 border-t border-b border-white/20">
            <LanguageSwitcher />
          </div>

          {!isAuthed && (
            <Link
              href="https://captain.fishon.my/ms/list-your-business"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#ec2227] text-center hover:translate-y-px transition"
            >
              {t("nav.listYourCharter")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
