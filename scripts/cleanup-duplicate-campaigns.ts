/**
 * Remove duplicate registration campaigns
 * Keep the newer welcome-fishon-2025 campaign
 * Delete the older reg-welcome-2025 campaign
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log("🔍 Checking for duplicate campaigns...\n");

  try {
    // Find all campaigns
    const campaigns = await prisma.promotionalCampaign.findMany({
      include: { placements: true },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${campaigns.length} campaigns:\n`);
    campaigns.forEach((c) => {
      console.log(`- ${c.code} (${c.id})`);
      console.log(`  Created: ${c.createdAt}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  Placements: ${c.placements.length}\n`);
    });

    // Delete older campaign (reg-welcome-2025)
    const oldCampaign = campaigns.find((c) => c.code === "reg-welcome-2025");

    if (oldCampaign) {
      console.log(`🗑️  Deleting old campaign: ${oldCampaign.code}`);

      // Delete placements first (cascade)
      await prisma.campaignPlacement.deleteMany({
        where: { campaignId: oldCampaign.id },
      });
      console.log(`   Deleted ${oldCampaign.placements.length} placements`);

      // Delete interactions
      const interactions = await prisma.userCampaignInteraction.deleteMany({
        where: { campaignId: oldCampaign.id },
      });
      console.log(`   Deleted ${interactions.count} interactions`);

      // Delete campaign
      await prisma.promotionalCampaign.delete({
        where: { id: oldCampaign.id },
      });
      console.log(`   ✅ Deleted campaign: ${oldCampaign.code}\n`);
    } else {
      console.log("ℹ️  No old campaign (reg-welcome-2025) found\n");
    }

    // Show remaining campaigns
    const remaining = await prisma.promotionalCampaign.findMany({
      include: { placements: true },
    });

    console.log("📊 Remaining campaigns:");
    remaining.forEach((c) => {
      console.log(`- ${c.code} (${c.status})`);
      console.log(
        `  Placements: ${c.placements.map((p) => p.placementKey).join(", ")}`
      );
    });

    console.log("\n✅ Cleanup complete!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();
