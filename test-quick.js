#!/usr/bin/env node
/**
 * Quick API test for the charter with active bookings
 */

const CHARTER_ID = "cmgbtc2cz0009uyrk10sbsuko";
const BASE_URL = "http://localhost:3001";

async function test() {
  console.log("Testing booked-dates API...\n");

  const response = await fetch(
    `${BASE_URL}/api/charters/${CHARTER_ID}/booked-dates`
  );

  if (!response.ok) {
    console.log(`❌ API failed: ${response.status}`);
    return;
  }

  const data = await response.json();

  console.log("✅ API Response:");
  console.log(`   Full-day blocks: ${data.fullDayBlocks?.length || 0}`);
  console.log(`   Time-based blocks: ${data.timeBasedBlocks?.length || 0}`);

  if (data.timeBasedBlocks && data.timeBasedBlocks.length > 0) {
    console.log("\n   Time-based blocks (first 10):");
    data.timeBasedBlocks.slice(0, 10).forEach((block) => {
      console.log(`     ${block.date}: ${block.startTime} - ${block.endTime}`);
    });
  }

  console.log("\n📍 Test URL:");
  console.log(`   ${BASE_URL}/en/book/${CHARTER_ID}`);
  console.log("\n💡 Open browser console and check for:");
  console.log("   - [DateGuestsCard] logs");
  console.log("   - [CalendarPicker] logs");
}

test().catch(console.error);
