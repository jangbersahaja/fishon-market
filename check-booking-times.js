#!/usr/bin/env node
/**
 * Check booking time data in the database
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking bookings with time-based data...\n");

  // Count bookings by type
  const allBookings = await prisma.booking.findMany({
    where: {
      OR: [{ status: "PAID" }, { status: "PAYMENT_AUTHORIZED" }],
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
  });

  console.log(
    `Total PAID/PAYMENT_AUTHORIZED bookings: ${allBookings.length}\n`
  );

  const withTimeSlots = allBookings.filter(
    (b) => b.startTime && b.timeSlots && Array.isArray(b.timeSlots)
  );
  const withoutTimeSlots = allBookings.filter(
    (b) => !b.startTime || !b.timeSlots || !Array.isArray(b.timeSlots)
  );

  console.log(`Bookings with time-based data: ${withTimeSlots.length}`);
  console.log(
    `Bookings without time data (full-day): ${withoutTimeSlots.length}\n`
  );

  if (withTimeSlots.length > 0) {
    console.log("Sample time-based booking:");
    const sample = withTimeSlots[0];
    console.log(JSON.stringify(sample, null, 2));
  }

  if (withoutTimeSlots.length > 0) {
    console.log("\nSample full-day booking:");
    const sample = withoutTimeSlots[0];
    console.log(JSON.stringify(sample, null, 2));
  }

  // Test the API logic
  console.log("\n--- Simulating API Logic ---\n");

  const fullDayBlocks = new Set();
  const timeBasedBlocks = [];

  allBookings.forEach((booking) => {
    const hasTimeBased =
      booking.startTime &&
      booking.timeSlots &&
      Array.isArray(booking.timeSlots);

    const bookingDate = new Date(booking.date);
    const year = bookingDate.getFullYear();
    const month = String(bookingDate.getMonth() + 1).padStart(2, "0");
    const day = String(bookingDate.getDate()).padStart(2, "0");

    if (hasTimeBased) {
      const timeSlots = booking.timeSlots;
      timeSlots.forEach((slot) => {
        const startTime = new Date(slot.startDateTime)
          .toTimeString()
          .substring(0, 5);
        const endTime = new Date(slot.endDateTime)
          .toTimeString()
          .substring(0, 5);

        timeBasedBlocks.push({
          date: slot.date.split("T")[0],
          startTime,
          endTime,
          isFullDay: false,
        });
      });
    } else {
      for (let i = 0; i < booking.days; i++) {
        const blockedDate = new Date(bookingDate);
        blockedDate.setDate(blockedDate.getDate() + i);
        const y = blockedDate.getFullYear();
        const m = String(blockedDate.getMonth() + 1).padStart(2, "0");
        const d = String(blockedDate.getDate()).padStart(2, "0");
        fullDayBlocks.add(`${y}-${m}-${d}`);
      }
    }
  });

  console.log("API would return:");
  console.log(
    JSON.stringify(
      {
        fullDayBlocks: Array.from(fullDayBlocks).sort(),
        timeBasedBlocks: timeBasedBlocks.slice(0, 5), // Show first 5
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
