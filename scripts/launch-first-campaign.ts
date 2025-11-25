import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function launchFirstCampaign() {
  console.log("🚀 Launching first campaign...\n");

  try {
    // 1. Create campaign
    const campaign = await prisma.promotionalCampaign.create({
      data: {
        code: "welcome-fishon-2025",
        type: "REGISTRATION_INCENTIVE",
        status: "ACTIVE",
        priority: 100,
        startDate: new Date("2025-11-25"),
        endDate: new Date("2026-12-31"),
        targetGuests: true,
        targetRegistered: false,
        allowedPages: ["search", "home", "charter-detail"],
        allowedDevices: ["DESKTOP", "MOBILE"],
        contentEn: {
          title: "🎣 Welcome to Fishon!",
          description:
            "Sign up now and unlock exclusive fishing charter deals across Malaysia.",
          benefits: [
            "Access to 100+ verified fishing charters",
            "Exclusive member-only discounts",
            "Real-time availability and instant booking",
          ],
          cta: "Sign Up Now",
          url: "/register",
          imageUrl:
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
        },
        contentMy: {
          title: "🎣 Selamat Datang ke Fishon!",
          description:
            "Daftar sekarang dan buka tawaran eksklusif charter memancing di seluruh Malaysia.",
          benefits: [
            "Akses kepada 100+ charter memancing yang disahkan",
            "Diskaun eksklusif untuk ahli",
            "Ketersediaan masa nyata dan tempahan segera",
          ],
          cta: "Daftar Sekarang",
          url: "/register",
          imageUrl:
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop",
        },
        dismissalStrategy: "SESSION_ONLY",
      },
    });

    console.log("✅ Campaign created:");
    console.log("   ID:", campaign.id);
    console.log("   Code:", campaign.code);
    console.log("   Status:", campaign.status);
    console.log("   Priority:", campaign.priority);
    console.log("");

    // 2. Create placements
    const placements = await prisma.campaignPlacement.createMany({
      data: [
        {
          campaignId: campaign.id,
          placementKey: "search-sidebar",
          devices: ["DESKTOP"],
          position: "RIGHT_SIDEBAR",
          sticky: true,
          displayRules: {
            showAfterScroll: 0,
          },
          layoutConfig: {
            variant: "CARD",
            width: "300px",
            maxHeight: "600px",
          },
        },
        {
          campaignId: campaign.id,
          placementKey: "search-bottom-bar",
          devices: ["MOBILE", "TABLET"],
          position: "BOTTOM_FIXED",
          sticky: true,
          displayRules: {
            showAfterScroll: 0,
          },
          layoutConfig: {
            variant: "BAR",
            height: "80px",
          },
        },
        {
          campaignId: campaign.id,
          placementKey: "home-welcome-bar",
          devices: ["DESKTOP", "MOBILE", "TABLET"],
          position: "TOP_BANNER",
          sticky: false,
          displayRules: {
            showAfterScroll: 300,
            delaySeconds: 10,
          },
          layoutConfig: {
            variant: "BAR",
            height: "auto",
            position: "top",
          },
        },
      ],
    });

    console.log("✅ Placements created:", placements.count);
    console.log("   - search-sidebar (CARD - Desktop)");
    console.log("   - search-bottom-bar (BAR - Mobile)");
    console.log("   - home-welcome-bar (BAR - Homepage, time-delayed)");
    console.log("");

    // 3. Verify campaign is active
    const activeCampaigns = await prisma.promotionalCampaign.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: { placements: true },
    });

    console.log("📊 Active campaigns:", activeCampaigns.length);
    console.log("");

    console.log("🎉 Campaign launched successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Start dev server: npm run dev");
    console.log("2. Visit: http://localhost:3000/en/search");
    console.log("3. Check Prisma Studio: npx prisma studio");
    console.log("");
    console.log("Expected behavior:");
    console.log("- Search page: Desktop sidebar / Mobile bottom bar");
    console.log("- Homepage: Welcome bar after 10s or 50% scroll");
    console.log("- Tracking: Check UserCampaignInteraction table");
  } catch (error) {
    console.error("❌ Error launching campaign:", error);
    throw error;
  }
}

launchFirstCampaign()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
