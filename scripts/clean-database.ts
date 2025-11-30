/**
 * Database Cleanup Script for fishon-market
 *
 * This script removes ALL test data EXCEPT:
 * - PromoCode
 * - PromotionalCampaign
 * - CampaignPlacement
 * - UserCampaignInteraction
 *
 * Run with: npx tsx scripts/clean-database.ts
 *
 * WARNING: This is DESTRUCTIVE and IRREVERSIBLE!
 * Make sure to backup your database first.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getTableCounts() {
  const counts = {
    // User & Auth
    User: await prisma.user.count(),
    Account: await prisma.account.count(),
    Session: await prisma.session.count(),
    VerificationToken: await prisma.verificationToken.count(),
    VerificationCode: await prisma.verificationCode.count(),

    // Blog
    BlogPost: await prisma.blogPost.count(),
    BlogCategory: await prisma.blogCategory.count(),
    BlogTag: await prisma.blogTag.count(),
    BlogComment: await prisma.blogComment.count(),

    // Newsletter
    NewsletterSubscription: await prisma.newsletterSubscription.count(),

    // Bookings & Chat
    Booking: await prisma.booking.count(),
    Conversation: await prisma.conversation.count(),
    Message: await prisma.message.count(),

    // Reviews & Favorites
    Review: await prisma.review.count(),
    Favorite: await prisma.favorite.count(),

    // Notifications
    Notification: await prisma.notification.count(),
    NotificationPreferences: await prisma.notificationPreferences.count(),

    // Analytics
    AnalyticsEvent: await prisma.analyticsEvent.count(),

    // Promo & Campaigns (PRESERVED)
    PromoCode: await prisma.promoCode.count(),
    UserPromoCodeAssignment: await prisma.userPromoCodeAssignment.count(),
    PromotionalCampaign: await prisma.promotionalCampaign.count(),
    CampaignPlacement: await prisma.campaignPlacement.count(),
    UserCampaignInteraction: await prisma.userCampaignInteraction.count(),

    // Logs
    SMSLog: await prisma.sMSLog.count(),
    EmailLog: await prisma.emailLog.count(),

    // Payment Sessions
    PaymentSession: await prisma.paymentSession.count(),
  };

  return counts;
}

async function main() {
  console.log("🗄️  Fishon Market Database Cleanup Script");
  console.log("=========================================\n");

  // Show current state
  console.log("📊 Current database state:");
  const beforeCounts = await getTableCounts();

  console.log("\n--- Tables to be CLEANED ---");
  const tablesToClean = [
    "User",
    "Account",
    "Session",
    "VerificationToken",
    "VerificationCode",
    "BlogPost",
    "BlogCategory",
    "BlogTag",
    "BlogComment",
    "NewsletterSubscription",
    "Booking",
    "Conversation",
    "Message",
    "Review",
    "Favorite",
    "Notification",
    "NotificationPreferences",
    "AnalyticsEvent",
    "UserPromoCodeAssignment", // Cleaned because users are being removed
    "SMSLog",
    "EmailLog",
    "PaymentSession",
  ];

  for (const table of tablesToClean) {
    const count = beforeCounts[table as keyof typeof beforeCounts];
    console.log(`  ${table}: ${count} records`);
  }

  console.log("\n--- Tables to be PRESERVED ---");
  const tablesToPreserve = [
    "PromoCode",
    "PromotionalCampaign",
    "CampaignPlacement",
    "UserCampaignInteraction",
  ];

  for (const table of tablesToPreserve) {
    const count = beforeCounts[table as keyof typeof beforeCounts];
    console.log(`  ✅ ${table}: ${count} records (KEEPING)`);
  }

  console.log("\n⚠️  WARNING: This operation is DESTRUCTIVE and IRREVERSIBLE!");
  console.log("Make sure you have a backup before proceeding.\n");

  // Check for --confirm flag
  const hasConfirmFlag = process.argv.includes("--confirm");

  if (!hasConfirmFlag) {
    // Prompt for confirmation
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        'Type "DELETE ALL TEST DATA" to confirm (or use --confirm flag): ',
        (ans) => {
          rl.close();
          resolve(ans);
        }
      );
    });

    if (answer !== "DELETE ALL TEST DATA") {
      console.log("\n❌ Confirmation failed. Aborting.");
      process.exit(1);
    }
  } else {
    console.log("✅ --confirm flag provided. Proceeding with cleanup...");
  }

  console.log("\n🗑️  Starting cleanup...\n");

  try {
    // Order matters! Delete in reverse order of foreign key dependencies

    // 1. Delete logs first (no dependencies)
    console.log("  Deleting SMSLog...");
    const smsLogResult = await prisma.sMSLog.deleteMany({});
    console.log(`    Deleted ${smsLogResult.count} SMS logs`);

    console.log("  Deleting EmailLog...");
    const emailLogResult = await prisma.emailLog.deleteMany({});
    console.log(`    Deleted ${emailLogResult.count} email logs`);

    // 2. Delete analytics events
    console.log("  Deleting AnalyticsEvent...");
    const analyticsResult = await prisma.analyticsEvent.deleteMany({});
    console.log(`    Deleted ${analyticsResult.count} analytics events`);

    // 3. Delete payment sessions
    console.log("  Deleting PaymentSession...");
    const paymentSessionResult = await prisma.paymentSession.deleteMany({});
    console.log(`    Deleted ${paymentSessionResult.count} payment sessions`);

    // 4. Delete user promo code assignments (references User and PromoCode)
    console.log("  Deleting UserPromoCodeAssignment...");
    const assignmentResult = await prisma.userPromoCodeAssignment.deleteMany(
      {}
    );
    console.log(`    Deleted ${assignmentResult.count} promo code assignments`);

    // 5. Delete messages (references Conversation)
    console.log("  Deleting Message...");
    const messageResult = await prisma.message.deleteMany({});
    console.log(`    Deleted ${messageResult.count} messages`);

    // 6. Delete conversations (references Booking)
    console.log("  Deleting Conversation...");
    const conversationResult = await prisma.conversation.deleteMany({});
    console.log(`    Deleted ${conversationResult.count} conversations`);

    // 7. Delete notifications (references User and Booking)
    console.log("  Deleting Notification...");
    const notificationResult = await prisma.notification.deleteMany({});
    console.log(`    Deleted ${notificationResult.count} notifications`);

    // 8. Delete notification preferences (references User)
    console.log("  Deleting NotificationPreferences...");
    const notifPrefResult = await prisma.notificationPreferences.deleteMany({});
    console.log(
      `    Deleted ${notifPrefResult.count} notification preferences`
    );

    // 9. Delete bookings (references User and PromoCode)
    console.log("  Deleting Booking...");
    const bookingResult = await prisma.booking.deleteMany({});
    console.log(`    Deleted ${bookingResult.count} bookings`);

    // 10. Delete reviews (references User)
    console.log("  Deleting Review...");
    const reviewResult = await prisma.review.deleteMany({});
    console.log(`    Deleted ${reviewResult.count} reviews`);

    // 11. Delete favorites (references User)
    console.log("  Deleting Favorite...");
    const favoriteResult = await prisma.favorite.deleteMany({});
    console.log(`    Deleted ${favoriteResult.count} favorites`);

    // 12. Delete blog comments (references User and BlogPost)
    console.log("  Deleting BlogComment...");
    const blogCommentResult = await prisma.blogComment.deleteMany({});
    console.log(`    Deleted ${blogCommentResult.count} blog comments`);

    // 13. Delete blog posts (references User, BlogCategory, BlogTag)
    // First disconnect many-to-many relations
    console.log("  Deleting BlogPost (and relations)...");
    const blogPostResult = await prisma.blogPost.deleteMany({});
    console.log(`    Deleted ${blogPostResult.count} blog posts`);

    // 14. Delete blog categories and tags
    console.log("  Deleting BlogCategory...");
    const blogCategoryResult = await prisma.blogCategory.deleteMany({});
    console.log(`    Deleted ${blogCategoryResult.count} blog categories`);

    console.log("  Deleting BlogTag...");
    const blogTagResult = await prisma.blogTag.deleteMany({});
    console.log(`    Deleted ${blogTagResult.count} blog tags`);

    // 15. Delete newsletter subscriptions
    console.log("  Deleting NewsletterSubscription...");
    const newsletterResult = await prisma.newsletterSubscription.deleteMany({});
    console.log(
      `    Deleted ${newsletterResult.count} newsletter subscriptions`
    );

    // 16. Delete sessions (references User)
    console.log("  Deleting Session...");
    const sessionResult = await prisma.session.deleteMany({});
    console.log(`    Deleted ${sessionResult.count} sessions`);

    // 17. Delete accounts (references User)
    console.log("  Deleting Account...");
    const accountResult = await prisma.account.deleteMany({});
    console.log(`    Deleted ${accountResult.count} accounts`);

    // 18. Delete verification tokens and codes
    console.log("  Deleting VerificationToken...");
    const verificationTokenResult = await prisma.verificationToken.deleteMany(
      {}
    );
    console.log(
      `    Deleted ${verificationTokenResult.count} verification tokens`
    );

    console.log("  Deleting VerificationCode...");
    const verificationCodeResult = await prisma.verificationCode.deleteMany({});
    console.log(
      `    Deleted ${verificationCodeResult.count} verification codes`
    );

    // 19. Finally, delete users (all dependencies should be removed now)
    console.log("  Deleting User...");
    const userResult = await prisma.user.deleteMany({});
    console.log(`    Deleted ${userResult.count} users`);

    // Note: UserCampaignInteraction is kept because it references PromotionalCampaign
    // which we're preserving, but it also has sessionId which doesn't require User

    console.log("\n✅ Cleanup completed successfully!\n");

    // Show final state
    console.log("📊 Final database state:");
    const afterCounts = await getTableCounts();

    console.log("\n--- Cleaned tables (should be 0) ---");
    for (const table of tablesToClean) {
      const count = afterCounts[table as keyof typeof afterCounts];
      const status = count === 0 ? "✅" : "⚠️";
      console.log(`  ${status} ${table}: ${count} records`);
    }

    console.log("\n--- Preserved tables ---");
    for (const table of tablesToPreserve) {
      const count = afterCounts[table as keyof typeof afterCounts];
      console.log(`  ✅ ${table}: ${count} records`);
    }
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
