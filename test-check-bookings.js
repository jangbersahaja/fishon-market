#!/usr/bin/env node
/**
 * Check what bookings exist in the database
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Checking Booking Database ===\n");

  // 1. Count all bookings
  const totalBookings = await prisma.booking.count();
  console.log(`Total bookings in database: ${totalBookings}`);

  // 2. Count bookings by status
  const byStatus = await prisma.booking.groupBy({
    by: ["status"],
    _count: true,
  });

  console.log("\nBookings by status:");
  byStatus.forEach(({ status, _count }) => {
    console.log(`  ${status}: ${_count}`);
  });

  // 3. Get PAID/PAYMENT_AUTHORIZED bookings with time data
  const activeBookings = await prisma.booking.findMany({
    where: {
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
      charterId: true,
      date: true,
      days: true,
      startTime: true,
      timeSlots: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  console.log(
    `\nActive bookings (PAID/PAYMENT_AUTHORIZED): ${activeBookings.length}`
  );

  if (activeBookings.length > 0) {
    console.log("\nRecent active bookings:");
    activeBookings.forEach((booking, idx) => {
      console.log(`\n[${idx + 1}] Booking ${booking.id.substring(0, 8)}...`);
      console.log(`    Charter ID: ${booking.charterId}`);
      console.log(`    Date: ${booking.date.toISOString().split("T")[0]}`);
      console.log(`    Status: ${booking.status}`);
      console.log(`    Days: ${booking.days}`);
      console.log(`    Has startTime: ${!!booking.startTime}`);
      console.log(
        `    Has timeSlots: ${!!booking.timeSlots && Array.isArray(booking.timeSlots)}`
      );

      if (
        booking.timeSlots &&
        Array.isArray(booking.timeSlots) &&
        booking.timeSlots.length > 0
      ) {
        console.log(`    Time slots:`);
        booking.timeSlots.slice(0, 2).forEach((slot) => {
          const start = new Date(slot.startDateTime)
            .toTimeString()
            .substring(0, 5);
          const end = new Date(slot.endDateTime).toTimeString().substring(0, 5);
          console.log(`      - ${slot.date.split("T")[0]}: ${start} - ${end}`);
        });
      }
    });

    // Find a charter with time-based bookings
    const timeBasedBooking = activeBookings.find(
      (b) => b.startTime && b.timeSlots && Array.isArray(b.timeSlots)
    );

    if (timeBasedBooking) {
      console.log(`\n✅ Found charter with time-based booking!`);
      console.log(`   Charter ID: ${timeBasedBooking.charterId}`);
      console.log(`   Test this charter to see orange dots!`);
      console.log(
        `   URL: http://localhost:3001/en/charters/${timeBasedBooking.charterId}`
      );
    }
  }

  // 4. Check the specific test charter
  const TEST_CHARTER_ID = "cmgf4czdp0006uys679s67w8g";
  const testCharterBookings = await prisma.booking.findMany({
    where: {
      charterId: TEST_CHARTER_ID,
    },
    select: {
      id: true,
      status: true,
      date: true,
      startTime: true,
      timeSlots: true,
    },
  });

  console.log(
    `\n\nTest Charter (${TEST_CHARTER_ID}) bookings: ${testCharterBookings.length}`
  );
  if (testCharterBookings.length > 0) {
    testCharterBookings.forEach((b) => {
      console.log(`  - ${b.status}: ${b.date.toISOString().split("T")[0]}`);
    });
  } else {
    console.log("  ⚠️  No bookings found for test charter!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
