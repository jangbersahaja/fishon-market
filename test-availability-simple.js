#!/usr/bin/env node
/**
 * Simple test to verify unavailability and booking data
 */

const { PrismaClient: PrismaMarket } = require("@prisma/client");
const prismaMarket = new PrismaMarket();

// Import captain DB client
const { PrismaClient: PrismaCaptain } = require("@prisma/client");
const prismaCaptain = new PrismaCaptain({
  datasources: {
    db: {
      url: process.env.CAPTAIN_DATABASE_URL,
    },
  },
});

const TEST_CHARTER_ID = "cmgf4czdp0006uys679s67w8g";

async function main() {
  console.log("=== Testing Availability Data Sources ===\n");

  try {
    // 1. Check captain DB for unavailability
    console.log("1. Checking fishon-captain DB for unavailability...");
    const charter = await prismaCaptain.charter.findUnique({
      where: { id: TEST_CHARTER_ID },
      select: {
        id: true,
        name: true,
        unavailability: true,
      },
    });

    if (!charter) {
      console.log("   Charter not found!");
      return;
    }

    console.log(`   Charter: ${charter.name}`);
    console.log(
      `   Unavailability periods: ${charter.unavailability?.length || 0}`
    );

    if (charter.unavailability && charter.unavailability.length > 0) {
      console.log("\n   Unavailability data:");
      charter.unavailability.forEach((period, idx) => {
        console.log(`   [${idx + 1}] ${period.startDate} to ${period.endDate}`);
        console.log(`       isAllDay: ${period.isAllDay}`);
        if (period.startTime && period.endTime) {
          console.log(`       Time: ${period.startTime} - ${period.endTime}`);
        }
      });
    } else {
      console.log("   ⚠️  NO UNAVAILABILITY DATA FOUND!");
    }

    // 2. Check market DB for bookings
    console.log("\n2. Checking fishon-market DB for bookings...");
    const bookings = await prismaMarket.booking.findMany({
      where: {
        charterId: TEST_CHARTER_ID,
        OR: [
          { status: "PAID" },
          {
            status: "PAYMENT_AUTHORIZED",
            acknowledgmentDeadline: { gte: new Date() },
          },
        ],
      },
      select: {
        id: true,
        date: true,
        days: true,
        startTime: true,
        timeSlots: true,
        status: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    console.log(`   Total bookings: ${bookings.length}`);

    if (bookings.length > 0) {
      console.log("\n   Bookings:");
      bookings.forEach((booking, idx) => {
        console.log(
          `   [${idx + 1}] ${booking.date.toISOString().split("T")[0]}`
        );
        console.log(`       Status: ${booking.status}`);
        console.log(`       Days: ${booking.days}`);
        console.log(`       Has startTime: ${!!booking.startTime}`);
        console.log(
          `       Has timeSlots: ${!!booking.timeSlots && Array.isArray(booking.timeSlots)}`
        );

        if (booking.timeSlots && Array.isArray(booking.timeSlots)) {
          console.log(`       Time slots (${booking.timeSlots.length}):`);
          booking.timeSlots.forEach((slot, si) => {
            const start = new Date(slot.startDateTime)
              .toTimeString()
              .substring(0, 5);
            const end = new Date(slot.endDateTime)
              .toTimeString()
              .substring(0, 5);
            console.log(
              `         - ${slot.date.split("T")[0]}: ${start} - ${end}`
            );
          });
        }
      });
    } else {
      console.log("   ⚠️  NO BOOKINGS FOUND!");
    }

    // 3. Check PostgreSQL view
    console.log("\n3. Checking v_public_charters view...");
    const viewData = await prismaCaptain.$queryRaw`
      SELECT 
        id,
        (charter->>'unavailability')::text as unavailability_raw
      FROM v_public_charters 
      WHERE id = ${TEST_CHARTER_ID}
      LIMIT 1
    `;

    if (viewData && viewData.length > 0) {
      const row = viewData[0];
      console.log(`   Found charter in view`);
      console.log(
        `   Unavailability field type: ${typeof row.unavailability_raw}`
      );

      if (row.unavailability_raw) {
        try {
          const parsed = JSON.parse(row.unavailability_raw);
          console.log(
            `   Parsed unavailability: ${parsed?.length || 0} periods`
          );
          if (parsed && parsed.length > 0) {
            console.log(`   Sample:`, JSON.stringify(parsed[0], null, 2));
          }
        } catch (e) {
          console.log(`   Failed to parse: ${e.message}`);
        }
      } else {
        console.log(`   ⚠️  Unavailability field is NULL or empty!`);
      }
    } else {
      console.log("   ⚠️  Charter not found in view!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prismaMarket.$disconnect();
    await prismaCaptain.$disconnect();
  });
