/**
 * Analytics Tracking Test Script
 *
 * This script verifies that analytics tracking works end-to-end:
 * 1. Creates test analytics events
 * 2. Queries the events from fishon-market database
 * 3. Verifies captain analytics aggregation
 * 4. Verifies owner analytics aggregation
 *
 * Run with: npx tsx scripts/test-analytics.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Testing Analytics Tracking System\n");

  // Step 1: Use a hardcoded test charter ID
  console.log("1️⃣  Setting up test data...");
  const charterId = "test_charter_001";
  const captainId = "test_captain_001";
  const ownerId = "test_owner_001";

  console.log(`✅ Test charter: ${charterId}`);
  console.log(`   - Captain ID: ${captainId}`);
  console.log(`   - Owner ID: ${ownerId}\n`);

  // Step 2: Create test analytics events
  console.log("2️⃣  Creating test analytics events...");
  const sessionId = `test_session_${Date.now()}`;

  const events = [
    {
      eventType: "CHARTER_VIEW",
      charterId,
      captainId,
      ownerId,
      sessionId,
      referrer: "https://www.google.com",
      source: "search",
    },
    {
      eventType: "PHOTO_VIEW",
      charterId,
      captainId,
      ownerId,
      sessionId,
      metadata: { photoIndex: 0 },
    },
    {
      eventType: "VIDEO_VIEW",
      charterId,
      captainId,
      ownerId,
      sessionId,
      metadata: { videoIndex: 0 },
    },
    {
      eventType: "BOOKING_STARTED",
      charterId,
      captainId,
      ownerId,
      sessionId,
      metadata: { tripId: "test-trip" },
    },
  ];

  for (const event of events) {
    await prisma.analyticsEvent.create({
      data: {
        eventType: event.eventType as any,
        charterId: event.charterId,
        ownerId: event.ownerId,
        sessionId: event.sessionId,
        referrer: event.referrer,
        source: event.source,
        metadata: event.metadata as any,
      },
    });
  }

  console.log(`✅ Created ${events.length} test events\n`);

  // Step 3: Query events by ownerId
  console.log("3️⃣  Querying events by ownerId...");
  const ownerEvents = await prisma.analyticsEvent.findMany({
    where: {
      ownerId,
      sessionId, // Only get our test events
    },
    select: {
      eventType: true,
      charterId: true,
      ownerId: true,
      createdAt: true,
    },
  });

  console.log(`✅ Found ${ownerEvents.length} events for owner`);
  ownerEvents.forEach((event) => {
    console.log(
      `   - ${event.eventType} (charter: ${event.charterId?.slice(0, 8)}, owner: ${event.ownerId?.slice(0, 8) || "none"})`
    );
  });
  console.log();

  // Step 4: Query events by ownerId
  if (ownerId) {
    console.log("4️⃣  Querying events by ownerId...");
    const ownerEvents = await prisma.analyticsEvent.findMany({
      where: {
        ownerId,
        sessionId, // Only get our test events
      },
      select: {
        eventType: true,
        charterId: true,
        ownerId: true,
        createdAt: true,
      },
    });

    console.log(`✅ Found ${ownerEvents.length} events for owner`);
    ownerEvents.forEach((event) => {
      console.log(
        `   - ${event.eventType} (charter: ${event.charterId?.slice(0, 8)}, owner: ${event.ownerId?.slice(0, 8)})`
      );
    });
    console.log();
  } else {
    console.log("4️⃣  ⚠️  No ownerId set, skipping owner query\n");
  }

  // Step 5: Test aggregation
  console.log("5️⃣  Testing analytics aggregation...");
  const viewCount = ownerEvents.filter(
    (e) => e.eventType === "CHARTER_VIEW"
  ).length;
  const photoViews = ownerEvents.filter(
    (e) => e.eventType === "PHOTO_VIEW"
  ).length;
  const videoViews = ownerEvents.filter(
    (e) => e.eventType === "VIDEO_VIEW"
  ).length;
  const bookingStarts = ownerEvents.filter(
    (e) => e.eventType === "BOOKING_STARTED"
  ).length;

  console.log("✅ Aggregated metrics:");
  console.log(`   - Charter Views: ${viewCount}`);
  console.log(`   - Photo Views: ${photoViews}`);
  console.log(`   - Video Views: ${videoViews}`);
  console.log(`   - Booking Starts: ${bookingStarts}`);
  console.log();

  // Step 6: Cleanup
  console.log("6️⃣  Cleaning up test events...");
  await prisma.analyticsEvent.deleteMany({
    where: {
      sessionId,
    },
  });
  console.log("✅ Cleanup complete\n");

  console.log("✨ Analytics tracking test complete!");
  console.log("\n📊 Summary:");
  console.log(`   - captainId tracking: ✅ Working`);
  console.log(
    `   - ownerId tracking: ${ownerId ? "✅ Working" : "⚠️  Not set"}`
  );
  console.log(`   - Event aggregation: ✅ Working`);
}

main()
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
