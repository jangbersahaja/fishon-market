/**
 * Test notification creation directly
 */

import { prisma } from "../src/lib/database/prisma";
import { createNotification } from "../src/lib/services/notification-service";

async function main() {
  try {
    // First, get a user to test with
    const user = await prisma.user.findFirst();

    if (!user) {
      console.error("❌ No users found in database. Create a user first.");
      return;
    }

    console.log(`✅ Testing with user: ${user.email} (${user.id})`);

    // Create a test notification
    console.log("\n🔔 Creating test notification...");
    const notification = await createNotification({
      userId: user.id,
      type: "BOOKING_CREATED",
      title: "Test Notification",
      message: "This is a test notification to verify the system works.",
      actionUrl: "/test",
      actionLabel: "Test Action",
      metadata: {
        test: true,
      },
    });

    console.log("✅ Notification created successfully!");
    console.log("Notification ID:", notification.id);
    console.log("Type:", notification.type);
    console.log("Status:", notification.status);

    // Verify it's in the database
    const count = await prisma.notification.count({
      where: { userId: user.id },
    });
    console.log(`\n📊 Total notifications for user: ${count}`);
  } catch (error: any) {
    console.error("❌ Error creating notification:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
