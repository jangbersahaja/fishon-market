/**
 * Seed promotional campaigns
 *
 * Run with: npx tsx scripts/seed-campaigns.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding promotional campaigns...");

  // Registration Welcome Bonus Campaign
  const regWelcomeCampaign = await prisma.promotionalCampaign.upsert({
    where: { code: "reg-welcome-2025" },
    update: {},
    create: {
      code: "reg-welcome-2025",
      type: "REGISTRATION_INCENTIVE",
      status: "ACTIVE",
      priority: 100,

      // Active for all of 2025
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDate: new Date("2025-12-31T23:59:59Z"),

      // Target only guests (non-registered users)
      targetGuests: true,
      targetRegistered: false,
      excludeRoles: [], // No role exclusions since we're targeting guests

      // Show on key pages
      allowedPages: ["search", "charter-detail", "home"],
      allowedDevices: ["DESKTOP", "MOBILE", "TABLET"],

      // English content
      contentEn: {
        title: "Register Now & Save on Your First Trip",
        subtitle: "New members get 10% off their first charter booking",
        cta: "Sign Up Free",
        benefits: [
          "Instant 10% discount",
          "Exclusive member deals",
          "Faster checkout",
        ],
      },

      // Malay content
      contentMy: {
        title: "Daftar Sekarang & Jimat Perjalanan Pertama",
        subtitle:
          "Ahli baharu dapat diskaun 10% untuk tempahan charter pertama",
        cta: "Daftar Percuma",
        benefits: [
          "Diskaun 10% segera",
          "Tawaran eksklusif ahli",
          "Checkout lebih pantas",
        ],
      },

      // Dismissal strategy: show again after 3 days
      dismissalStrategy: "SESSION_WITH_COOLDOWN",
      cooldownDays: 3,
      maxDismissals: 5,
    },
  });

  console.log(`✅ Created campaign: ${regWelcomeCampaign.code}`);

  // Create placements for the campaign

  // Placement 1: Search Sidebar (Desktop)
  const searchSidebarPlacement = await prisma.campaignPlacement.upsert({
    where: {
      campaignId_placementKey: {
        campaignId: regWelcomeCampaign.id,
        placementKey: "search-sidebar",
      },
    },
    update: {},
    create: {
      campaignId: regWelcomeCampaign.id,
      placementKey: "search-sidebar",
      devices: ["DESKTOP"],
      position: "RIGHT_SIDEBAR",
      sticky: true,

      displayRules: {
        showAfterScroll: 200,
        hideOnCheckout: false,
        maxViewsPerSession: 1,
      },

      layoutConfig: {
        variant: "CARD",
        width: "300px",
        maxHeight: "400px",
        className: "shadow-lg rounded-lg border border-gray-200",
      },
    },
  });

  console.log(`✅ Created placement: ${searchSidebarPlacement.placementKey}`);

  // Placement 2: Search Bottom Bar (Mobile)
  const searchBottomBarPlacement = await prisma.campaignPlacement.upsert({
    where: {
      campaignId_placementKey: {
        campaignId: regWelcomeCampaign.id,
        placementKey: "search-bottom-bar",
      },
    },
    update: {},
    create: {
      campaignId: regWelcomeCampaign.id,
      placementKey: "search-bottom-bar",
      devices: ["MOBILE", "TABLET"],
      position: "BOTTOM_FIXED",
      sticky: true,

      displayRules: {
        showAfterDelay: 3000,
        hideOnScroll: false,
        maxViewsPerSession: 1,
      },

      layoutConfig: {
        variant: "BAR",
        width: "100%",
        height: "80px",
        className: "shadow-top border-t border-gray-200",
      },
    },
  });

  console.log(`✅ Created placement: ${searchBottomBarPlacement.placementKey}`);

  // Placement 3: Pre-Checkout Modal
  const preCheckoutModalPlacement = await prisma.campaignPlacement.upsert({
    where: {
      campaignId_placementKey: {
        campaignId: regWelcomeCampaign.id,
        placementKey: "pre-checkout-modal",
      },
    },
    update: {},
    create: {
      campaignId: regWelcomeCampaign.id,
      placementKey: "pre-checkout-modal",
      devices: ["DESKTOP", "MOBILE", "TABLET"],
      position: "MODAL_CENTER",
      sticky: false,

      displayRules: {
        triggerOn: "CHECKOUT_INTENT",
        showForGuests: true,
        showForRegistered: false,
        maxViewsPerSession: 1,
        minWaitTime: 3000,
      },

      layoutConfig: {
        variant: "MODAL",
        maxWidth: "600px",
        maxHeight: "500px",
        backdrop: "blur",
        className: "rounded-xl shadow-2xl",
      },
    },
  });

  console.log(
    `✅ Created placement: ${preCheckoutModalPlacement.placementKey}`
  );

  console.log("\n🎉 Campaign seeding complete!");
  console.log(`\nCampaign: ${regWelcomeCampaign.code}`);
  console.log(`Status: ${regWelcomeCampaign.status}`);
  console.log(`Placements: 3 (sidebar, bottom-bar, modal)`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
