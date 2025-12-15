"use client";

import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { cn } from "@/lib/utils";
import {
  Bell,
  Calendar,
  Heart,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Star,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const getNavigation = (locale: string, t: any) => [
  {
    name: t("nav.overview"),
    href: `/${locale}/account/overview`,
    icon: LayoutDashboard,
  },
  {
    name: t("nav.bookings"),
    href: `/${locale}/account/bookings`,
    icon: Calendar,
  },
  {
    name: t("nav.messages"),
    href: `/${locale}/account/messages`,
    icon: MessageSquare,
    showBadge: true, // Special flag for unread badge
  },
  {
    name: t("nav.notifications"),
    href: `/${locale}/account/notifications`,
    icon: Bell,
  },
  {
    name: t("nav.reviews"),
    href: `/${locale}/account/reviews`,
    icon: Star,
  },
  {
    name: t("nav.favorites"),
    href: `/${locale}/account/favorites`,
    icon: Heart,
  },
  {
    name: t("nav.profile"),
    href: `/${locale}/account/profile`,
    icon: User,
  },
  {
    name: t("nav.support"),
    href: `/${locale}/support/help`,
    icon: HelpCircle,
  },
];

/**
 * Horizontal tab navigation for account pages
 * Replaces sidebar navigation with extension-style nav below main navbar
 * Supports transparent background on hero pages (like navbar)
 */
export function AccountNav({
  transparentOnTop = false,
}: {
  transparentOnTop?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("account");
  const pathname = usePathname();
  const navigation = getNavigation(locale, t);
  const { unreadCount } = useUnreadMessages();

  // Choose background based on transparent mode
  const bgClass = transparentOnTop
    ? "bg-transparent absolute z-30 w-full top-16"
    : "bg-white border-b border-gray-200";

  // Text color adjustments for transparent mode
  const textColorActive = transparentOnTop ? "text-white" : "text-[#ec2227]";
  const textColorInactive = transparentOnTop
    ? "text-white/80 hover:text-white"
    : "text-gray-500 hover:text-gray-700";
  const borderColorActive = transparentOnTop
    ? "border-white"
    : "border-[#ec2227]";
  const borderColorInactive = transparentOnTop
    ? "border-transparent hover:border-white/30"
    : "border-transparent hover:border-gray-300";
  const badgeBgColor = transparentOnTop
    ? "bg-white text-[#ec2227]"
    : "bg-[#ec2227] text-white";

  return (
    <div className={bgClass}>
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Desktop: Horizontal tabs */}
        <nav
          className="hidden md:flex md:space-x-8"
          aria-label="Account navigation"
        >
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const showBadge = item.showBadge && unreadCount > 0;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 px-1 pt-3 pb-2 text-sm font-medium border-b-2 transition-colors relative",
                  isActive
                    ? `${borderColorActive} ${textColorActive}`
                    : `${borderColorInactive} ${textColorInactive}`
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative">
                  <item.icon className="w-4 h-4" />
                  {showBadge && (
                    <span
                      className={cn(
                        "absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                        badgeBgColor
                      )}
                      aria-label={`${unreadCount} unread messages`}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: Horizontal scroll */}
        <nav
          className="flex px-4 -mx-4 overflow-x-auto md:hidden"
          aria-label="Account navigation"
        >
          <div className="flex space-x-4 min-w-max">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const showBadge = item.showBadge && unreadCount > 0;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap relative",
                    isActive
                      ? `${borderColorActive} ${textColorActive}`
                      : `${borderColorInactive} ${textColorInactive}`
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="relative">
                    <item.icon className="w-4 h-4" />
                    {showBadge && (
                      <span
                        className={cn(
                          "absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                          badgeBgColor
                        )}
                        aria-label={`${unreadCount} unread messages`}
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
