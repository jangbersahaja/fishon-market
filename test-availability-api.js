#!/usr/bin/env node
/**
 * Test availability system by directly inspecting the booking page data
 */

async function testCharterAvailability() {
  const TEST_CHARTER_ID = "cmgbtc2cz0009uyrk10sbsuko"; // Charter with active time-based bookings
  const BASE_URL = "http://localhost:3001";

  console.log("=== Testing Charter Availability System ===\n");
  console.log(`Testing charter: ${TEST_CHARTER_ID}\n`);

  try {
    // 1. Fetch booked dates (what the calendar uses)
    console.log("1. Fetching booked dates API...");
    const bookedResponse = await fetch(
      `${BASE_URL}/api/charters/${TEST_CHARTER_ID}/booked-dates`
    );

    if (!bookedResponse.ok) {
      console.log(
        `   ❌ Failed: ${bookedResponse.status} ${bookedResponse.statusText}`
      );
      const errorText = await bookedResponse.text();
      console.log(`   Error: ${errorText}`);
      return;
    }

    const bookedData = await bookedResponse.json();
    console.log(`   ✅ Success!`);
    console.log(`   Full-day blocks: ${bookedData.fullDayBlocks?.length || 0}`);
    console.log(
      `   Time-based blocks: ${bookedData.timeBasedBlocks?.length || 0}`
    );

    if (bookedData.fullDayBlocks && bookedData.fullDayBlocks.length > 0) {
      console.log(`\n   Full-day blocked dates:`);
      bookedData.fullDayBlocks.slice(0, 5).forEach((date) => {
        console.log(`     - ${date}`);
      });
    }

    if (bookedData.timeBasedBlocks && bookedData.timeBasedBlocks.length > 0) {
      console.log(`\n   Time-based blocks:`);
      bookedData.timeBasedBlocks.slice(0, 5).forEach((block) => {
        console.log(
          `     - ${block.date}: ${block.startTime} - ${block.endTime}`
        );
      });
    }

    // 2. Fetch the charter page HTML to see what the user sees
    console.log("\n2. Checking charter booking page...");
    const pageResponse = await fetch(
      `${BASE_URL}/en/charters/${TEST_CHARTER_ID}`
    );

    if (!pageResponse.ok) {
      console.log(
        `   ❌ Failed: ${pageResponse.status} ${pageResponse.statusText}`
      );
      return;
    }

    const html = await pageResponse.text();
    console.log(`   ✅ Page loaded (${Math.round(html.length / 1024)}KB)`);

    // Check if calendar component is present
    if (html.includes("CalendarPicker") || html.includes("calendar-picker")) {
      console.log(`   ✅ Calendar component found`);
    } else {
      console.log(`   ⚠️  Calendar component not found in HTML`);
    }

    // Check for orange dot styling
    if (html.includes("orange-500") || html.includes("partial-availability")) {
      console.log(`   ✅ Partial availability styling present`);
    } else {
      console.log(`   ⚠️  Partial availability styling not found`);
    }

    // 3. Summary
    console.log("\n=== Summary ===");

    const hasFullBlocks =
      bookedData.fullDayBlocks && bookedData.fullDayBlocks.length > 0;
    const hasTimeBlocks =
      bookedData.timeBasedBlocks && bookedData.timeBasedBlocks.length > 0;

    if (!hasFullBlocks && !hasTimeBlocks) {
      console.log("❌ NO BOOKING DATA FOUND!");
      console.log("   The calendar will show all dates as available.");
      console.log("   Expected: Some dates should be blocked or partial.");
      console.log("\n   Possible causes:");
      console.log("   1. No bookings exist for this charter");
      console.log("   2. All bookings are in PENDING/CANCELLED status");
      console.log("   3. Database query is not finding bookings");
    } else {
      console.log("✅ Booking data exists!");

      if (hasTimeBlocks) {
        console.log("\n   Expected UI behavior:");
        console.log("   - Dates with time-based blocks should show ORANGE DOT");
        console.log("   - Those dates should NOT be strikethrough");
        console.log("   - Clicking date should show available time slots");
      }

      if (hasFullBlocks) {
        console.log("\n   Expected UI behavior:");
        console.log("   - Full-day blocked dates should show STRIKETHROUGH");
        console.log("   - Those dates should NOT be selectable");
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  }
}

testCharterAvailability();
