/**
 * Update home-welcome-bar placement to modal variant with 15s delay
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateHomeModalPlacement() {
  console.log("🔄 Updating home welcome placement to modal...\n");

  try {
    const placement = await prisma.campaignPlacement.findFirst({
      where: { placementKey: "home-welcome-bar" },
      include: { campaign: true },
    });

    if (!placement) {
      console.error("❌ Placement 'home-welcome-bar' not found");
      return;
    }

    console.log(`✅ Found placement: ${placement.placementKey}`);
    console.log(`   Campaign: ${placement.campaign.code}`);
    console.log(`   Current position: ${placement.position}`);
    console.log(`   Current layout:`, placement.layoutConfig);

    // Update to modal configuration
    const updated = await prisma.campaignPlacement.update({
      where: { id: placement.id },
      data: {
        position: "MODAL_CENTER",
        displayRules: {
          delaySeconds: 15,
        },
        layoutConfig: {
          variant: "MODAL",
          maxWidth: "600px",
        },
      },
    });

    console.log("\n✅ Updated placement configuration:");
    console.log(`   Position: ${updated.position}`);
    console.log(`   Display rules:`, updated.displayRules);
    console.log(`   Layout config:`, updated.layoutConfig);

    console.log("\n📊 Expected behavior:");
    console.log("- Modal appears after 15 seconds");
    console.log("- Centered with backdrop");
    console.log("- Easy to dismiss");
    console.log("- Max width: 600px");
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateHomeModalPlacement();
