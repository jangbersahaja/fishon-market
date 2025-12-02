"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Calendar,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Star,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export function UserNav() {
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations();

  if (!session?.user) return null;

  const user = session.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center w-8 h-8 overflow-hidden transition-all rounded-full ring-2 ring-white/20 hover:ring-white/50 focus:outline-none focus:ring-2 focus:ring-white">
          {user.image ? (
            <div className="relative w-full h-full">
              <Image
                src={user.image}
                alt={user.name || "User"}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-white/10 text-white">
              <User className="w-4 h-4" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account/overview`}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              <span>{t("account.overview")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account/bookings`}>
              <Calendar className="w-4 h-4 mr-2" />
              <span>{t("account.bookings")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account/notifications`}>
              <Bell className="w-4 h-4 mr-2" />
              <span>{t("account.notifications")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account/reviews`}>
              <Star className="w-4 h-4 mr-2" />
              <span>{t("account.reviews")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account/favorites`}>
              <Heart className="w-4 h-4 mr-2" />
              <span>{t("account.favorites")}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account/profile`}>
              <User className="w-4 h-4 mr-2" />
              <span>{t("account.profile")}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/support/help`}>
            <HelpCircle className="w-4 h-4 mr-2" />
            <span>{t("footer.support")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={() =>
            signOut({
              callbackUrl: window.location.pathname + window.location.search,
            })
          }
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>{t("nav.signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
