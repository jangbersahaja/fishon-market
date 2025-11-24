#!/usr/bin/env node
/**
 * Test the complete data flow for time-based availability
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// TEST CHARTER ID
const TEST_CHARTER_ID = "cmgf4czdp0006uys679s67w8g";

// Simulate the availability helper functions
function calculateBlockedDates(
  schedule,
  unavailability,
  bookedDatesData,
  startDate,
  endDate
) {
  const blocked = new Set();

  // Add unavailability periods (ONLY ALL-DAY BLOCKS)
  if (unavailability && unavailability.length > 0) {
    unavailability.forEach((period) => {
      const isAllDayBlock = period.isAllDay !== false;
      if (!isAllDayBlock) return; // Skip time-based

      const startDateOnly = period.startDate.split("T")[0];
      const endDateOnly = period.endDate.split("T")[0];

      const [psy, psm, psd] = startDateOnly.split("-").map(Number);
      const [pey, pem, ped] = endDateOnly.split("-").map(Number);
      const periodStart = new Date(psy, psm - 1, psd);
      const periodEnd = new Date(pey, pem - 1, ped);

      const current = new Date(
        Math.max(periodStart.getTime(), startDate.getTime())
      );
      const end = new Date(Math.min(periodEnd.getTime(), endDate.getTime()));

      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        blocked.add(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
    });
  }

  // Add booked dates (ONLY FULL-DAY BLOCKS)
  if (bookedDatesData) {
    if (bookedDatesData.fullDayBlocks) {
      bookedDatesData.fullDayBlocks.forEach((date) => blocked.add(date));
    } else if (bookedDatesData.bookedDates) {
      bookedDatesData.bookedDates.forEach((date) => blocked.add(date));
    }
  }

  return blocked;
}

function calculatePartialAvailability(
  unavailability,
  bookedDatesData,
  startDate,
  endDate
) {
  const partialAvailabilityMap = new Map();

  // Process unavailability periods
  if (unavailability && unavailability.length > 0) {
    unavailability.forEach((period) => {
      if (period.isAllDay !== false || !period.startTime || !period.endTime)
        return;

      const startDateOnly = period.startDate.split("T")[0];
      const endDateOnly = period.endDate.split("T")[0];

      const [psy, psm, psd] = startDateOnly.split("-").map(Number);
      const [pey, pem, ped] = endDateOnly.split("-").map(Number);
      const periodStart = new Date(psy, psm - 1, psd);
      const periodEnd = new Date(pey, pem - 1, ped);

      const current = new Date(
        Math.max(periodStart.getTime(), startDate.getTime())
      );
      const end = new Date(Math.min(periodEnd.getTime(), endDate.getTime()));

      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const existing = partialAvailabilityMap.get(dateStr);
        if (existing) {
          existing.unavailableTimeRanges.push({
            startTime: period.startTime,
            endTime: period.endTime,
          });
        } else {
          partialAvailabilityMap.set(dateStr, {
            date: dateStr,
            unavailableTimeRanges: [
              {
                startTime: period.startTime,
                endTime: period.endTime,
              },
            ],
          });
        }

        current.setDate(current.getDate() + 1);
      }
    });
  }

  // Process time-based bookings
  if (bookedDatesData && bookedDatesData.timeBasedBlocks) {
    bookedDatesData.timeBasedBlocks.forEach((block) => {
      const dateStr = block.date;
      const existing = partialAvailabilityMap.get(dateStr);

      if (existing) {
        existing.unavailableTimeRanges.push({
          startTime: block.startTime,
          endTime: block.endTime,
        });
      } else {
        partialAvailabilityMap.set(dateStr, {
          date: dateStr,
          unavailableTimeRanges: [
            {
              startTime: block.startTime,
              endTime: block.endTime,
            },
          ],
        });
      }
    });
  }

  return partialAvailabilityMap;
}

async function main() {
  console.log("=== Testing Time-Based Availability Flow ===\n");

  // 1. Get charter data from charter detail API
  const charterResponse = await fetch(
    `http://localhost:3001/api/charters?id=${TEST_CHARTER_ID}`
  );
  if (!charterResponse.ok) {
    console.log(`Failed to fetch charter: ${charterResponse.status}`);
    return;
  }

  const charterData = await charterResponse.json();
  const unavailability = charterData.unavailability || [];

  console.log("1. Charter Unavailability:");
  console.log(`   Total periods: ${unavailability.length}`);
  if (unavailability.length > 0) {
    console.log(JSON.stringify(unavailability.slice(0, 3), null, 2));
  }

  // 2. Fetch booked dates from API
  const bookedDatesResponse = await fetch(
    `http://localhost:3001/api/charters/${TEST_CHARTER_ID}/booked-dates`
  );
  if (!bookedDatesResponse.ok) {
    console.log(`Failed to fetch booked dates: ${bookedDatesResponse.status}`);
    return;
  }

  const bookedDatesData = await bookedDatesResponse.json();

  console.log(`\n2. Booked Dates API Response:`);
  console.log(
    `   - Full day blocks: ${bookedDatesData.fullDayBlocks?.length || 0}`
  );
  console.log(
    `   - Time-based blocks: ${bookedDatesData.timeBasedBlocks?.length || 0}`
  );
  console.log(JSON.stringify(bookedDatesData, null, 2));

  // 3. Calculate blocked dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  const blockedDates = calculateBlockedDates(
    null,
    unavailability,
    bookedDatesData,
    startDate,
    endDate
  );

  console.log("\n4. Blocked Dates (Set):");
  console.log(`   Total blocked dates: ${blockedDates.size}`);
  console.log("   Sample:", Array.from(blockedDates).sort().slice(0, 10));

  // 5. Calculate partial availability
  const partialAvailability = calculatePartialAvailability(
    unavailability,
    bookedDatesData,
    startDate,
    endDate
  );

  console.log("\n5. Partial Availability (Map):");
  console.log(
    `   Total partial availability dates: ${partialAvailability.size}`
  );
  console.log("Dates with partial availability:");
  for (const [date, data] of partialAvailability) {
    console.log(`  ${date}:`, data.unavailableTimeRanges);
  }

  console.log("\n=== Expected UI Behavior ===");
  console.log("Calendar Picker should show:");
  console.log(
    "- Blocked dates (strikethrough):",
    Array.from(blockedDates).slice(0, 5)
  );
  console.log(
    "- Partial availability (orange dot):",
    Array.from(partialAvailability.keys()).slice(0, 5)
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
