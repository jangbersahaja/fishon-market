#!/usr/bin/env node
/**
 * Debug script to trace the complete data flow
 */

const CHARTER_ID = "cmgbtc2cz0009uyrk10sbsuko";

console.log("=== Debugging Orange Dot Issue ===\n");
console.log("Expected behavior:");
console.log("  - Dec 14-18: Should have ORANGE DOTS (time-based bookings)");
console.log("  - Nov 27: Should be STRIKETHROUGH (full-day block)");
console.log("\n1. Open: http://localhost:3001/en/book/" + CHARTER_ID);
console.log("\n2. Open Browser Console (F12)");
console.log("\n3. Look for these logs:");
console.log("   ✅ [DateGuestsCard] Booked dates API response");
console.log("   ✅ [DateGuestsCard] Blocked dates calculated");
console.log("   ✅ [DateGuestsCard] Partial availability calculated");
console.log("   ✅ [CalendarPicker] Props received");
console.log("   ✅ [CalendarPicker] Date 2025-12-14 has partial availability");
console.log("   ✅ [CalendarPicker] Rendering 2025-12-14");
console.log("\n4. Check the calendar:");
console.log("   - Navigate to December 2025");
console.log("   - Look at dates 14-18");
console.log("   - Should see small orange dots at bottom of dates");
console.log("\n5. If NO logs appear:");
console.log("   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)");
console.log("   - Clear cache and reload");
console.log("\n6. If logs show data but NO orange dots:");
console.log("   - Check if dates are disabled (strikethrough)");
console.log("   - This would mean they're in blockedDates Set incorrectly");
console.log("\n📝 Report back what you see!");
