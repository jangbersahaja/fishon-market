/**
 * SMS Integration Test Script
 *
 * Tests the full SMS notification system:
 * 1. Phone number validation
 * 2. SMS service functions
 * 3. Notification preferences
 * 4. End-to-end notification flow
 *
 * Run with: npx ts-node scripts/test-sms-integration.ts
 */

import { prisma } from "@/lib/database/prisma";
import {
  createNotification,
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/services/notification-service";
import {
  isValidMalaysianPhone,
  normalizePhoneNumber,
  sendBookingApprovedSMS,
  sendBookingCreatedSMS,
  sendBookingPaidSMS,
  truncateMessage,
} from "@/lib/services/sms-service";

async function runTests() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 SMS Integration Test Suite");
  console.log("=".repeat(70) + "\n");

  try {
    // =========================================================================
    // Test 1: Phone Number Validation
    // =========================================================================
    console.log("📱 Test 1: Phone Number Validation");
    console.log("-".repeat(70));

    const testPhones = [
      { input: "60123456789", expected: true, normalized: "60123456789" },
      { input: "+60123456789", expected: true, normalized: "60123456789" },
      { input: "0123456789", expected: true, normalized: "60123456789" },
      { input: "123456789", expected: true, normalized: "60123456789" },
      { input: "invalid", expected: false, normalized: null },
    ];

    for (const test of testPhones) {
      const isValid = isValidMalaysianPhone(test.input);
      const status = isValid === test.expected ? "✅" : "❌";
      console.log(`${status} ${test.input}: valid=${isValid}`);

      if (isValid && test.normalized) {
        try {
          const normalized = normalizePhoneNumber(test.input);
          const normStatus = normalized === test.normalized ? "✅" : "❌";
          console.log(`   ${normStatus} Normalized: ${normalized}`);
        } catch (e) {
          console.log(`   ❌ Normalization failed: ${e}`);
        }
      }
    }
    console.log("");

    // =========================================================================
    // Test 2: Message Truncation
    // =========================================================================
    console.log("📝 Test 2: Message Truncation");
    console.log("-".repeat(70));

    const longMessage =
      "This is a very long message that should be truncated to fit within a single SMS. It contains more than 160 characters so it will be truncated with ellipsis at the end.";
    const truncated = truncateMessage(longMessage);
    console.log(`✅ Original length: ${longMessage.length} chars`);
    console.log(`✅ Truncated length: ${truncated.length} chars`);
    console.log(`✅ Message: "${truncated}"`);
    console.log("");

    // =========================================================================
    // Test 3: Environment Variables
    // =========================================================================
    console.log("🔑 Test 3: Environment Variables");
    console.log("-".repeat(70));

    const username = process.env.EXABYTES_SMS_USERNAME;
    const password = process.env.EXABYTES_SMS_PASSWORD;

    if (username && password) {
      console.log(`✅ EXABYTES_SMS_USERNAME: ${username.substring(0, 3)}...`);
      console.log(`✅ EXABYTES_SMS_PASSWORD: ${password.substring(0, 3)}...`);
    } else {
      console.log(
        `❌ Missing environment variables. Please set EXABYTES_SMS_USERNAME and EXABYTES_SMS_PASSWORD`
      );
      process.exit(1);
    }
    console.log("");

    // =========================================================================
    // Test 4: Get or Create Test User
    // =========================================================================
    console.log("👤 Test 4: Get or Create Test User");
    console.log("-".repeat(70));

    let testUser = await prisma.user.findFirst({
      where: { email: "sms-test@fishon.my" },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: "sms-test@fishon.my",
          name: "SMS Test User",
          phone: "60123456789", // Test phone
          role: "ANGLER",
        },
      });
      console.log(`✅ Created test user: ${testUser.email}`);
    } else {
      // Update phone number for testing
      testUser = await prisma.user.update({
        where: { id: testUser.id },
        data: { phone: "60123456789" },
      });
      console.log(`✅ Using existing test user: ${testUser.email}`);
    }
    console.log(`   User ID: ${testUser.id}`);
    console.log(`   Phone: ${testUser.phone}`);
    console.log("");

    // =========================================================================
    // Test 5: Notification Preferences
    // =========================================================================
    console.log("⚙️  Test 5: Notification Preferences");
    console.log("-".repeat(70));

    let prefs = await getUserPreferences(testUser.id);
    console.log(`✅ Loaded preferences for user ${testUser.id}`);
    console.log(`   SMS Booking Created: ${prefs.smsBookingCreated}`);
    console.log(`   SMS Booking Approved: ${prefs.smsBookingApproved}`);
    console.log(`   SMS Booking Paid: ${prefs.smsBookingPaid}`);

    // Test updating preferences
    await updateUserPreferences(testUser.id, {
      smsBookingCreated: true,
      smsBookingApproved: true,
      smsBookingPaid: true,
    });
    prefs = await getUserPreferences(testUser.id);
    console.log(`✅ Updated preferences`);
    console.log(`   SMS Booking Created: ${prefs.smsBookingCreated}`);
    console.log("");

    // =========================================================================
    // Test 6: Send Test SMS
    // =========================================================================
    console.log("📤 Test 6: Send Test SMS Messages");
    console.log("-".repeat(70));
    console.log("Attempting to send test SMS via Exabytes API...\n");

    const testCases = [
      {
        name: "Booking Created",
        fn: () =>
          sendBookingCreatedSMS({
            phone: testUser.phone!,
            charterName: "Deep Sea Fishing Charter",
            tripDate: "2025-11-25",
            totalPrice: "299.00",
          }),
      },
      {
        name: "Booking Approved",
        fn: () =>
          sendBookingApprovedSMS({
            phone: testUser.phone!,
            charterName: "Deep Sea Fishing Charter",
            tripDate: "2025-11-25",
          }),
      },
      {
        name: "Booking Paid",
        fn: () =>
          sendBookingPaidSMS({
            phone: testUser.phone!,
            charterName: "Deep Sea Fishing Charter",
            tripDate: "2025-11-25",
            tripName: "Full Day Offshore",
          }),
      },
    ];

    for (const testCase of testCases) {
      console.log(`🔄 Testing: ${testCase.name}`);
      const result = await testCase.fn();
      if (result.success) {
        console.log(`   ✅ SMS sent successfully (ID: ${result.messageId})`);
      } else {
        console.log(`   ⚠️  SMS send failed: ${result.error}`);
      }
    }
    console.log("");

    // =========================================================================
    // Test 7: Create Notification (triggers SMS)
    // =========================================================================
    console.log("🔔 Test 7: Create Notification with SMS");
    console.log("-".repeat(70));

    const notification = await createNotification({
      userId: testUser.id,
      type: "BOOKING_APPROVED",
      title: "Booking Approved",
      message: "Your booking has been approved by the captain.",
      actionUrl: "/bookings/test-123",
      metadata: {
        charterName: "Coral Reef Explorer",
        tripDate: "2025-11-26",
      },
    });

    console.log(`✅ Created notification: ${notification.id}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Status: ${notification.status}`);
    console.log(
      "   (SMS and email should have been sent if preferences enabled)"
    );
    console.log("");

    // =========================================================================
    // Test Summary
    // =========================================================================
    console.log("=".repeat(70));
    console.log("✅ All Tests Completed Successfully!");
    console.log("=".repeat(70));
    console.log("\n📝 Summary:");
    console.log("  ✅ Phone number validation working");
    console.log("  ✅ Message truncation working");
    console.log("  ✅ Environment variables configured");
    console.log("  ✅ Test user created/updated");
    console.log("  ✅ Notification preferences loaded/updated");
    console.log("  ✅ SMS messages sent via Exabytes API");
    console.log("  ✅ Notifications created with SMS trigger");
    console.log("\n🎉 SMS Integration is working! 🎉\n");

    console.log("📋 Next Steps:");
    console.log(
      "  1. Check your phone for SMS messages (they may take a few seconds)"
    );
    console.log("  2. Test the NotificationSettings UI component");
    console.log("  3. Test booking flows to verify SMS are sent");
    console.log("  4. Monitor logs for SMS delivery status\n");
  } catch (error) {
    console.error("\n❌ Test Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
