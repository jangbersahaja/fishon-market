/**
 * Captain Webhook Client
 *
 * Sends webhook events to fishon-captain for referral tracking
 */

import { sendWithRetry } from "./webhook";

const CAPTAIN_WEBHOOK_URL = process.env.CAPTAIN_WEBHOOK_URL;
const CAPTAIN_API_SECRET = process.env.CAPTAIN_API_SECRET;

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string): Promise<string> {
  if (!CAPTAIN_API_SECRET) {
    throw new Error("CAPTAIN_API_SECRET not configured");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(CAPTAIN_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Send webhook to fishon-captain
 */
async function sendCaptainWebhook(
  endpoint: string,
  event: string,
  data: Record<string, unknown>
): Promise<boolean> {
  if (!CAPTAIN_WEBHOOK_URL) {
    console.warn(
      `⚠️ [captain-webhook] CAPTAIN_WEBHOOK_URL not configured, skipping ${event}`
    );
    return false;
  }

  // Build the referral webhook URL from the booking webhook URL
  const baseUrl = CAPTAIN_WEBHOOK_URL.replace("/api/webhooks/booking", "");
  const url = `${baseUrl}/api/webhooks/${endpoint}`;

  const body = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify(body);

  try {
    const signature = await generateSignature(payload);

    console.log(`📡 [captain-webhook] Sending ${event} to ${url}`);

    const success = await sendWithRetry(url, body, {
      headers: {
        "x-webhook-signature": signature,
      },
      attempts: 3,
    });

    if (success) {
      console.log(`✅ [captain-webhook] ${event} sent successfully`);
    } else {
      console.error(`❌ [captain-webhook] Failed to send ${event}`);
    }

    return success;
  } catch (error) {
    console.error(`❌ [captain-webhook] Error sending ${event}:`, error);
    return false;
  }
}

/**
 * Notify fishon-captain that a referred captain completed their first trip
 */
export async function notifyReferralTripCompleted(params: {
  inviteeId: string;
  bookingId: string;
  captainEarnings: number;
  tripName?: string;
}): Promise<boolean> {
  return sendCaptainWebhook("referral", "invitee.trip_completed", {
    inviteeId: params.inviteeId,
    bookingId: params.bookingId,
    captainEarnings: params.captainEarnings,
    tripName: params.tripName,
  });
}

/**
 * Notify fishon-captain that a referred captain created their first charter
 */
export async function notifyReferralCharterCreated(params: {
  inviteeId: string;
  charterId: string;
}): Promise<boolean> {
  return sendCaptainWebhook("referral", "invitee.charter_created", {
    inviteeId: params.inviteeId,
    charterId: params.charterId,
  });
}

/**
 * Notify fishon-captain that a referred captain received their first booking
 */
export async function notifyReferralFirstBooking(params: {
  inviteeId: string;
  bookingId: string;
}): Promise<boolean> {
  return sendCaptainWebhook("referral", "invitee.first_booking", {
    inviteeId: params.inviteeId,
    bookingId: params.bookingId,
  });
}
