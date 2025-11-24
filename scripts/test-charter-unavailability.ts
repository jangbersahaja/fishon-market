/**
 * Test script to verify charter data includes unavailability in fishon-market
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

import { getCharterById } from "@/lib/services/charter-service";

async function testCharterUnavailability() {
  try {
    console.log("🔍 Testing charter data in fishon-market...\n");

    // Get the Skipper Prima charter (should have unavailability data)
    // Find the charter ID first
    const { getCharters } = await import("@/lib/services/charter-service");
    const allCharters = await getCharters();

    console.log(`✅ Found ${allCharters.length} charters\n`);

    // Find Skipper Prima
    const skipperPrima = allCharters.find((c) =>
      c.name.toLowerCase().includes("skipper prima")
    );

    if (!skipperPrima) {
      console.log("❌ Skipper Prima charter not found");
      return;
    }

    console.log(
      `✅ Found charter: ${skipperPrima.name} (ID: ${skipperPrima.id})`
    );
    console.log(`  - Backend ID: ${(skipperPrima as any).backendId}`);

    // Fetch full charter details using backendId (CUID string)
    const charterIdToFetch = (skipperPrima as any).backendId || skipperPrima.id;
    console.log(`  - Fetching with ID: ${charterIdToFetch}\n`);

    const charter = await getCharterById(charterIdToFetch);

    if (!charter) {
      console.log("❌ Failed to fetch charter details");
      return;
    }

    console.log("\n📊 Charter Data Check:");
    console.log(
      `  - Has schedule: ${charter.schedule !== undefined ? "✅" : "❌"}`
    );
    console.log(
      `  - Has unavailability: ${charter.unavailability !== undefined ? "✅" : "❌"}`
    );

    if (charter.schedule) {
      console.log(`  - Schedule type: ${charter.schedule.type}`);
    }

    if (charter.unavailability) {
      console.log(
        `  - Unavailability entries: ${charter.unavailability.length}`
      );
      if (charter.unavailability.length > 0) {
        console.log("\n  Unavailability periods:");
        charter.unavailability.forEach((period, idx) => {
          console.log(
            `    ${idx + 1}. ${period.startDate} to ${period.endDate}`
          );
          if (period.reason) {
            console.log(`       Reason: ${period.reason}`);
          }
        });
      }
    } else {
      console.log("  ❌ Unavailability field is missing!");
    }

    // Test blocked dates calculation
    console.log("\n🗓️  Testing blocked dates calculation:");
    console.log("  Input data:");
    console.log(`    - schedule:`, charter.schedule);
    console.log(`    - unavailability:`, charter.unavailability);

    const { calculateBlockedDates } = await import(
      "@/lib/helpers/availability-helpers"
    );

    const startDate = new Date("2025-11-01");
    const endDate = new Date("2025-11-30");

    const blockedDates = calculateBlockedDates(
      charter.schedule,
      charter.unavailability,
      null, // No bookings for this test
      startDate,
      endDate
    );

    console.log(`  - Blocked dates in November: ${blockedDates.size}`);

    if (blockedDates.size > 0) {
      const dateArray = Array.from(blockedDates).sort();
      console.log(`  - First 5 blocked dates:`, dateArray.slice(0, 5));
    }

    // Check if Nov 6-8 are blocked
    const nov6 = blockedDates.has("2025-11-06");
    const nov7 = blockedDates.has("2025-11-07");
    const nov8 = blockedDates.has("2025-11-08");

    console.log(
      `\n  ✅ Expected blocked dates (Nov 6-8): ${nov6 && nov7 && nov8 ? "✅ ALL BLOCKED" : "❌ NOT ALL BLOCKED"}`
    );
    console.log(`     - Nov 6: ${nov6 ? "✅ Blocked" : "❌ Not blocked"}`);
    console.log(`     - Nov 7: ${nov7 ? "✅ Blocked" : "❌ Not blocked"}`);
    console.log(`     - Nov 8: ${nov8 ? "✅ Blocked" : "❌ Not blocked"}`);

    if (nov6 && nov7 && nov8) {
      console.log(
        "\n✅ Test PASSED: Unavailability dates are correctly blocked!"
      );
    } else {
      console.log(
        "\n❌ Test FAILED: Unavailability dates are not being blocked correctly"
      );
    }
  } catch (error) {
    console.error("❌ Error testing charter unavailability:", error);
  }
}

testCharterUnavailability();
