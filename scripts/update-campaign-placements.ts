/**
 * Update existing campaign placements
 * - Remove pre-checkout-modal placement
 * - Add home-welcome-bar placement
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updatePlacements() {
  console.log("🔄 Updating campaign placements...\n");

  try {
    // Find the campaign
    const campaign = await prisma.promotionalCampaign.findUnique({
      where: { code: "welcome-fishon-2025" },
      include: { placements: true },
    });

    if (!campaign) {
      console.error("❌ Campaign 'welcome-fishon-2025' not found");
      return;
    }

    console.log(`✅ Found campaign: ${campaign.code} (ID: ${campaign.id})`);
    console.log(`   Current placements: ${campaign.placements.length}\n`);

    // 1. Delete pre-checkout-modal placement
    const deleteResult = await prisma.campaignPlacement.deleteMany({
      where: {
        campaignId: campaign.id,
        placementKey: "pre-checkout-modal",
      },
    });

    console.log(
      `🗑️  Deleted pre-checkout-modal: ${deleteResult.count} placement(s)`
    );

    // 2. Check if home-welcome-bar already exists
    const existingHomeBar = await prisma.campaignPlacement.findFirst({
      where: {
        campaignId: campaign.id,
        placementKey: "home-welcome-bar",
      },
    });

    if (existingHomeBar) {
      console.log("ℹ️  home-welcome-bar placement already exists");
    } else {
      // 3. Create home-welcome-bar placement
      const newPlacement = await prisma.campaignPlacement.create({
        data: {
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
      });

      console.log(
        `✅ Created home-welcome-bar placement (ID: ${newPlacement.id})`
      );
    }

    // 4. Show final state
    const updatedCampaign = await prisma.promotionalCampaign.findUnique({
      where: { code: "welcome-fishon-2025" },
      include: { placements: true },
    });

    console.log("\n📊 Final placements:");
    updatedCampaign?.placements.forEach((p) => {
      console.log(`   - ${p.placementKey} (${p.position})`);
    });

    console.log("\n✅ Campaign placements updated successfully!");
    console.log("\nExpected behavior:");
    console.log("- Search page: Desktop sidebar / Mobile bottom bar");
    console.log("- Homepage: Welcome bar after 10s or 50% scroll");
  } catch (error) {
    console.error("\n❌ Error updating placements:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePlacements();
