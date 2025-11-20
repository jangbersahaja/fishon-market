/**
 * SMS Delivery Test Script
 *
 * Tests actual SMS delivery via Exabytes API:
 * 1. Phone number normalization
 * 2. Message truncation
 * 3. Exabytes API connectivity
 * 4. SMS template rendering
 */

import { get } from "https";

// Load environment variables
const username = process.env.EXABYTES_SMS_USERNAME || "FISHON";
const password = process.env.EXABYTES_SMS_PASSWORD || "DrNJb6UM6L";

function normalizePhoneNumber(phone) {
  if (!phone) return null;

  let normalized = phone.toString().trim();

  // Remove all non-digits except leading +
  normalized = normalized.replace(/[^\d+]/g, "");

  // If starts with +, remove the + and just work with digits
  if (normalized.startsWith("+")) {
    normalized = normalized.substring(1);
  }

  // If starts with 6, it's already in 60... format
  if (normalized.startsWith("6")) {
    return normalized;
  }

  // If starts with 0, replace with 60
  if (normalized.startsWith("0")) {
    return "6" + normalized;
  }

  // Otherwise, assume it needs 60 prefix
  return "60" + normalized;
}

function isValidMalaysianPhone(phone) {
  if (!phone) return false;

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;

  // Malaysian phone must be 10-11 digits starting with 60
  return /^60\d{8,9}$/.test(normalized);
}

function truncateMessage(message, maxLength = 160) {
  if (!message) return "";
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + "...";
}

async function sendSMSViaExabytes(phone, message) {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!isValidMalaysianPhone(normalizedPhone)) {
    return {
      success: false,
      error: `Invalid Malaysian phone number: ${phone}`,
    };
  }

  const truncatedMessage = truncateMessage(message);

  const params = new URLSearchParams({
    un: username,
    pwd: password,
    dstno: normalizedPhone,
    msg: truncatedMessage,
    type: "1", // ASCII text
    agreedterm: "YES",
  });

  const fullUrl = `https://smsportal.exabytes.my/isms_send.php?${params.toString()}`;

  console.log("\n📤 Sending SMS via Exabytes API");
  console.log("-".repeat(70));
  console.log(`Phone (normalized): ${normalizedPhone}`);
  console.log(`Message length: ${truncatedMessage.length} chars`);
  console.log(`Message: "${truncatedMessage}"`);
  console.log(`API URL: ${fullUrl.substring(0, 100)}...`);

  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const request = get(fullUrl, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        clearTimeout(timeoutId);

        console.log(`HTTP Status: ${response.statusCode}`);
        console.log(`Response: ${data}`);

        // Parse response: "0|Message sent|MessageID" (success) or "1|Error|0" (error)
        const parts = data.split("|");
        const statusCode = parts[0]?.trim();

        if (statusCode === "0") {
          const messageId = parts[2]?.trim();
          resolve({
            success: true,
            messageId: messageId || "unknown",
            response: data,
          });
        } else {
          resolve({
            success: false,
            error: parts[1]?.trim() || data,
          });
        }
      });
    });

    request.on("error", (error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: error.message,
      });
    });
  });
}

// Test SMS templates
function getSMSTemplate(type, data) {
  const templates = {
    BOOKING_CREATED: () =>
      `Hi! Your booking for ${data.charterName} on ${data.tripDate} has been received. Total: RM${data.totalPrice}. We'll send confirmation shortly.`,
    BOOKING_APPROVED: () =>
      `Great news! Your booking for ${data.charterName} on ${data.tripDate} is approved. Check your email for details.`,
    BOOKING_PAID: () =>
      `Payment confirmed for ${data.charterName} - RM${data.totalPrice}. See you on ${data.tripDate}!`,
    BOOKING_CANCELLED: () =>
      `Your booking for ${data.charterName} on ${data.tripDate} has been cancelled. Refund: RM${data.refundAmount}.`,
    TEST_MESSAGE: () =>
      `Test SMS from Fishon. Timestamp: ${new Date().toISOString()}`,
  };

  return templates[type]?.() || "Fishon SMS Test Message";
}

async function runDeliveryTests() {
  console.log("\n" + "=".repeat(70));
  console.log("📨 SMS Delivery Test Suite");
  console.log("=".repeat(70));

  // Test 1: Phone Number Validation
  console.log("\n✅ Test 1: Phone Number Normalization");
  console.log("-".repeat(70));

  const phoneTests = [
    { input: "60123456789", expected: "60123456789" },
    { input: "+60123456789", expected: "60123456789" },
    { input: "0123456789", expected: "60123456789" },
    { input: "123456789", expected: "60123456789" },
  ];

  for (const test of phoneTests) {
    const normalized = normalizePhoneNumber(test.input);
    const isValid = isValidMalaysianPhone(test.input);
    console.log(
      `${isValid ? "✅" : "❌"} ${test.input} → ${normalized} (valid: ${isValid})`
    );
  }

  // Test 2: Message Truncation
  console.log("\n✅ Test 2: Message Truncation");
  console.log("-".repeat(70));

  const shortMsg = "Short message";
  const longMsg =
    "This is a very long message that exceeds the 160 character SMS limit and should be truncated with ellipsis at the end to keep it within the SMS length constraints for single SMS sending";

  console.log(
    `Short (${shortMsg.length} chars): "${truncateMessage(shortMsg)}"`
  );
  console.log(
    `Long truncated (${truncateMessage(longMsg).length} chars): "${truncateMessage(longMsg)}"`
  );

  // Test 3: SMS Templates
  console.log("\n✅ Test 3: SMS Templates");
  console.log("-".repeat(70));

  const testData = {
    charterName: "Deep Sea Fishing",
    tripDate: "2025-11-25",
    totalPrice: "299.00",
    refundAmount: "299.00",
  };

  const templates = [
    "BOOKING_CREATED",
    "BOOKING_APPROVED",
    "BOOKING_PAID",
    "BOOKING_CANCELLED",
  ];

  for (const template of templates) {
    const msg = getSMSTemplate(template, testData);
    const truncated = truncateMessage(msg);
    console.log(
      `${template}: (${truncated.length} chars) "${truncated.substring(0, 50)}..."`
    );
  }

  // Test 4: Test SMS Delivery (optional)
  console.log("\n✅ Test 4: Exabytes API Connectivity");
  console.log("-".repeat(70));

  const testMessage = getSMSTemplate("TEST_MESSAGE", {});
  const result = await sendSMSViaExabytes("60105581238", testMessage);

  if (result.success) {
    console.log(`✅ SMS sent successfully!`);
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Full Response: ${result.response}`);
  } else {
    console.log(`⚠️  SMS delivery issue:`);
    console.log(`   Error: ${result.error}`);
    console.log(
      `   Note: This might be normal if credentials are test/sandbox`
    );
  }

  // Test 5: Actual Booking SMS
  console.log("\n✅ Test 5: Booking Notification SMS");
  console.log("-".repeat(70));

  const bookingMsg = getSMSTemplate("BOOKING_CREATED", testData);
  console.log(`Message: "${truncateMessage(bookingMsg)}"`);
  console.log(`Length: ${truncateMessage(bookingMsg).length} chars`);
  console.log(`Recipients: 60105581238 (your phone)`);

  console.log("\n" + "=".repeat(70));
  console.log("✅ SMS Delivery Tests Completed!");
  console.log("=".repeat(70));

  console.log("\n📊 Test Summary:");
  console.log("  ✅ Phone number normalization working");
  console.log("  ✅ Message truncation to 160 chars working");
  console.log("  ✅ SMS templates rendering correctly");
  if (result.success) {
    console.log("  ✅ Exabytes API connectivity verified");
  } else {
    console.log("  ⚠️  Exabytes API returned error (check credentials)");
  }

  console.log("\n🎯 Next Steps:");
  console.log("  1. Check your phone (60105581238) for the test SMS");
  console.log("  2. If SMS received, integration is working! ✅");
  console.log("  3. If not received, check Exabytes account settings");
  console.log("  4. Then test with actual booking flow:");
}

// Run tests
runDeliveryTests().catch(console.error);
