/**
 * Quick script to check notifications in database
 */

import { prisma } from "../src/lib/database/prisma";

async function main() {
  try {
    // Check if notifications table exists
    const notificationCount = await prisma.notification.count();
    console.log("✅ Notification table exists");
    console.log(`📊 Total notifications: ${notificationCount}`);

    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    console.log("\n📬 Recent notifications:");
    recentNotifications.forEach((notif) => {
      console.log(`  - [${notif.type}] ${notif.title}`);
      console.log(`    User: ${notif.user.email}`);
      console.log(`    Created: ${notif.createdAt.toISOString()}`);
      console.log(`    Status: ${notif.status}\n`);
    });

    // Check notification preferences
    const prefsCount = await prisma.notificationPreferences.count();
    console.log(`⚙️  Notification preferences: ${prefsCount}`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
