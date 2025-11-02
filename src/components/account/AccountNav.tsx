"use client";

import { cn } from "@/lib/utils";
import {
  Bell,
  Calendar,
  Heart,
  HelpCircle,
  LayoutDashboard,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Overview",
    href: "/account/overview",
    icon: LayoutDashboard,
  },
  {
    name: "Bookings",
    href: "/account/bookings",
    icon: Calendar,
  },
  {
    name: "Notifications",
    href: "/account/notifications",
    icon: Bell,
  },
  {
    name: "Reviews",
    href: "/account/reviews",
    icon: Star,
  },
  {
    name: "Favorites",
    href: "/account/favorites",
    icon: Heart,
  },
  {
    name: "Profile",
    href: "/account/profile",
    icon: User,
  },
  {
    name: "Support",
    href: "/support/help",
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
  const pathname = usePathname();

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

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 px-1 pt-3 pb-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? `${borderColorActive} ${textColorActive}`
                    : `${borderColorInactive} ${textColorInactive}`
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="w-4 h-4" />
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

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? `${borderColorActive} ${textColorActive}`
                      : `${borderColorInactive} ${textColorInactive}`
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="w-4 h-4" />
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
