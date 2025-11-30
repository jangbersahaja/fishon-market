/**
 * Navigation Configuration
 *
 * Centralized navigation routes for the application.
 * Used by Navbar, Footer, and other navigation components.
 */

export const mainNavigation = [
  { href: "/home", labelKey: "nav.home" },
  { href: "/search", labelKey: "nav.charters" },
  { href: "/blog", labelKey: "nav.blog" },
] as const;

export const accountNavigation = [
  { href: "/account/overview", labelKey: "account.overview", icon: "home" },
  { href: "/account/profile", labelKey: "account.profile", icon: "user" },
  { href: "/account/bookings", labelKey: "account.bookings", icon: "calendar" },
  { href: "/account/favorites", labelKey: "account.favorites", icon: "heart" },
  { href: "/account/messages", labelKey: "account.messages", icon: "message" },
  { href: "/account/reviews", labelKey: "account.reviews", icon: "star" },
  { href: "/account/settings", labelKey: "account.settings", icon: "settings" },
] as const;

export const footerNavigation = {
  about: [
    { href: "/about", labelKey: "footer.aboutUs" },
    { href: "/blog", labelKey: "footer.blog" },
    { href: "/support/contact", labelKey: "footer.contactUs" },
  ],
  discover: [
    { href: "/categories/techniques", labelKey: "footer.fishingTechnique" },
    { href: "/categories/types", labelKey: "footer.fishingType" },
    { href: "/categories/destinations", labelKey: "footer.allDestination" },
  ],
  support: [
    { href: "/support/help", labelKey: "footer.helpCenter" },
    { href: "/terms", labelKey: "footer.termsOfService" },
    { href: "/privacy", labelKey: "footer.privacyPolicy" },
    { href: "/refund-policy", labelKey: "footer.refundCancellation" },
  ],
  captain: [
    {
      href: "https://fishon-captain.vercel.app/list-your-business",
      labelKey: "footer.becomeCaptain",
      external: true,
    },
    {
      href: "https://fishon-captain.vercel.app/list-your-business",
      labelKey: "footer.listYourBoat",
      external: true,
    },
  ],
} as const;
