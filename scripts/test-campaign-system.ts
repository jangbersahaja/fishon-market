/**
 * Test the promotional campaign system
 *
 * Run with: npx tsx scripts/test-campaign-system.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Testing Promotional Campaign System\n");

  // Test 1: Verify campaign exists
  console.log("1️⃣ Testing campaign retrieval...");
  const campaign = await prisma.promotionalCampaign.findUnique({
    where: { code: "reg-welcome-2025" },
    include: { placements: true },
  });

  if (!campaign) {
    console.error("❌ Campaign not found!");
    process.exit(1);
  }

  console.log(`✅ Campaign found: ${campaign.code}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Priority: ${campaign.priority}`);
  console.log(`   Placements: ${campaign.placements.length}`);
  console.log();

  // Test 2: Verify placements
  console.log("2️⃣ Testing placements...");
  const placements = await prisma.campaignPlacement.findMany({
    where: { campaignId: campaign.id },
  });

  console.log(`✅ Found ${placements.length} placements:`);
  placements.forEach((p) => {
    console.log(`   - ${p.placementKey} (${p.devices.join(", ")})`);
  });
  console.log();

  // Test 3: Test interaction tracking
  console.log("3️⃣ Testing interaction tracking...");
  const testSessionId = `test-session-${Date.now()}`;

  await prisma.userCampaignInteraction.create({
    data: {
      sessionId: testSessionId,
      campaignId: campaign.id,
      placementKey: "search-sidebar",
      action: "IMPRESSION",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log("✅ Impression tracked");

  await prisma.userCampaignInteraction.create({
    data: {
      sessionId: testSessionId,
      campaignId: campaign.id,
      placementKey: "search-sidebar",
      action: "CLICK",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log("✅ Click tracked");
  console.log();

  // Test 4: Verify tracking data
  console.log("4️⃣ Verifying tracking data...");
  const interactions = await prisma.userCampaignInteraction.findMany({
    where: {
      sessionId: testSessionId,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`✅ Found ${interactions.length} interactions:`);
  interactions.forEach((i) => {
    console.log(`   - ${i.action} at ${i.createdAt.toISOString()}`);
  });
  console.log();

  // Test 5: Campaign content structure
  console.log("5️⃣ Verifying campaign content...");
  const contentEn = campaign.contentEn as any;
  const contentMy = campaign.contentMy as any;

  console.log("✅ English content:");
  console.log(`   Title: ${contentEn.title}`);
  console.log(`   CTA: ${contentEn.cta}`);
  console.log(`   Benefits: ${contentEn.benefits?.length || 0}`);

  console.log("✅ Malay content:");
  console.log(`   Title: ${contentMy.title}`);
  console.log(`   CTA: ${contentMy.cta}`);
  console.log(`   Benefits: ${contentMy.benefits?.length || 0}`);
  console.log();

  // Cleanup test data
  console.log("🧹 Cleaning up test interactions...");
  await prisma.userCampaignInteraction.deleteMany({
    where: { sessionId: testSessionId },
  });
  console.log("✅ Cleanup complete");
  console.log();

  console.log("🎉 All tests passed!");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
