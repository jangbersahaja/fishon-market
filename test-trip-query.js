// Test script to verify trip data can be fetched
const { PrismaClient } = require("@prisma/client");

const prismaCaptain = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CAPTAIN_DATABASE_URL,
    },
  },
});

async function testTripQuery() {
  const tripId = "cmgzckllf000buy42r1my55nl";

  console.log("Testing trip query for:", tripId);

  try {
    // Test 1: Check if trip exists
    const trip = await prismaCaptain.trip.findUnique({
      where: { id: tripId },
      include: {
        charter: {
          include: {
            boat: true,
            captain: true,
          },
        },
        startTimes: true,
      },
    });

    if (!trip) {
      console.log("❌ Trip not found");
      return;
    }

    console.log("✅ Trip found:", {
      id: trip.id,
      name: trip.name,
      charterId: trip.charterId,
      charterName: trip.charter?.name,
      startTimesCount: trip.startTimes?.length || 0,
    });

    // Test 2: Check start times
    console.log(
      "\nStart times:",
      trip.startTimes?.map((st) => st.value)
    );

    // Test 3: Check charter media
    const media = await prismaCaptain.charterMedia.findMany({
      where: { charterId: trip.charterId },
      select: { url: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    console.log("\nCharter media count:", media.length);

    // Test 4: Check amenities
    const amenities = await prismaCaptain.charterAmenity.findMany({
      where: { charterId: trip.charterId },
      select: { label: true },
    });

    console.log(
      "Charter amenities:",
      amenities.map((a) => a.label)
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prismaCaptain.$disconnect();
  }
}

testTripQuery();
